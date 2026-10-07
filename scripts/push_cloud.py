#!/usr/bin/env python3
"""Push the LOCAL FICAS dataset to the PRODUCTION API.

The WordPress migration produced a fully-populated local Postgres database
(``ficas``) plus a local MinIO bucket (``ficas-media``).  This script copies
that content into a remote FICAS API over HTTP using the admin REST endpoints.

It is a **one-shot, idempotent and resumable** migration:

* categories/tags are de-duplicated by ``slug`` (409 -> map by slug);
* media uploads are memoised in ``scripts/data/cloud_media_map.json`` so a
  re-run only uploads what is still missing;
* pages/posts with an existing ``slug`` are skipped;
* the menu and settings are replaced wholesale (the API's PUT semantics);
* redirects are sent in batches to ``/api/admin/redirects/bulk`` (tolerated
  when the endpoint is not deployed yet -- it is being added in parallel).

Only the Python standard library plus ``psycopg2`` and ``boto3`` are used.

Usage
-----
::

    python3 scripts/push_cloud.py --dry-run
    python3 scripts/push_cloud.py --dry-run --limit 3
    python3 scripts/push_cloud.py
    python3 scripts/push_cloud.py --only categories,tags --limit 10
    python3 scripts/push_cloud.py --skip-media --skip-redirects

Environment (all optional; defaults shown)
------------------------------------------
``CLOUD_API_URL`` https://api-ficas.vgandolfi.dev
``CLOUD_ADMIN_EMAIL`` admin@ficas.org.br
``CLOUD_ADMIN_PASSWORD`` pMYo6KhsdubKH9qPmWxg
``POSTGRES_HOST/PORT/DB/USER/PASSWORD`` localhost/5432/ficas/ficas/ficas
``AWS_ENDPOINT/AWS_ACCESS_KEY/AWS_SECRET_KEY/AWS_REGION/AWS_BUCKET_NAME``
http://localhost:9000 / ficas / ficasminio / us-east-1 / ficas-media
``AWS_PATH_STYLE`` true
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence

# --------------------------------------------------------------------------- #
# Optional third-party dependencies (guarded so --help/--dry-run can explain)
# --------------------------------------------------------------------------- #
try:  # pragma: no cover - trivial import guard
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:  # pragma: no cover
    psycopg2 = None  # type: ignore[assignment]
    RealDictCursor = None  # type: ignore[assignment]

try:  # pragma: no cover - trivial import guard
    import boto3
    from botocore.config import Config as BotoConfig
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # pragma: no cover
    boto3 = None  # type: ignore[assignment]
    BotoConfig = None  # type: ignore[assignment]
    BotoCoreError = ClientError = Exception  # type: ignore[assignment,misc]

# --------------------------------------------------------------------------- #
# Paths & constants
# --------------------------------------------------------------------------- #
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
MEDIA_MAP_PATH = DATA_DIR / "cloud_media_map.json"

MEDIA_URL_PREFIX = "/media/"
IMPORT_PREFIX = "/media/import/"
MEDIA_URL_RE = re.compile(r"/media/import/[A-Za-z0-9._-]+")
BULK_BATCH_SIZE = 500
FETCH_PAGE_SIZE = 1000

ALL_STEPS: tuple[str, ...] = (
    "categories",
    "tags",
    "media",
    "pages",
    "posts",
    "menu",
    "settings",
    "redirects",
)

# Source tables read from the local database.
SOURCE_QUERIES: dict[str, str] = {
    "categories": "SELECT id, slug, name, description, sort_order FROM categories ORDER BY sort_order, id",
    "tags": "SELECT id, slug, name FROM tags ORDER BY name, id",
    "media": "SELECT id, filename, url, mime_type, size_bytes, alt FROM media_assets ORDER BY id",
    "pages": "SELECT id, slug, title, content, excerpt, menu_order, show_in_menu, status, "
    "content_format, hero_media_id FROM pages ORDER BY id",
    "posts": "SELECT id, slug, title, excerpt, content, cover_media_id, category_id, status, "
    "published_at, content_format FROM posts ORDER BY id",
    "post_tags": "SELECT post_id, tag_id FROM post_tags ORDER BY post_id, tag_id",
    "menu_items": "SELECT id, label, url, target, sort_order, parent_id FROM menu_items ORDER BY sort_order, id",
    "settings": "SELECT id, site_name, site_description, logo_url, favicon_url, social, contact, pix "
    "FROM site_settings WHERE id = 1",
    "redirects": "SELECT id, from_path, to_path, status_code FROM redirects ORDER BY id",
}


# --------------------------------------------------------------------------- #
# Utilities
# --------------------------------------------------------------------------- #
def log(message: str) -> None:
    print(message, flush=True)


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr, flush=True)


def env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def redact(value: str | None) -> str:
    return "*** (set)" if value else "*** (MISSING)"


def isoformat_utc(value: Any) -> str | None:
    """Serialize a Postgres timestamptz / datetime to an ISO-8601 UTC string."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return str(value)


def rewrite_media_urls(content: str | None, old_to_new: dict[str, str]) -> str:
    """Rewrite every ``/media/import/{hash}.ext`` occurrence to the new cloud URL."""
    if not content:
        return content or ""

    def repl(match: re.Match[str]) -> str:
        return old_to_new.get(match.group(0), match.group(0))

    return MEDIA_URL_RE.sub(repl, content)


def chunks(items: Sequence[Any], size: int) -> Iterable[Sequence[Any]]:
    for start in range(0, len(items), size):
        yield items[start:start + size]


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Settings:
    cloud_api_url: str
    cloud_admin_email: str
    cloud_admin_password: str
    pg_host: str
    pg_port: int
    pg_db: str
    pg_user: str
    pg_password: str
    s3_endpoint: str
    s3_access_key: str
    s3_secret_key: str
    s3_region: str
    s3_bucket: str
    s3_path_style: bool


def load_settings() -> Settings:
    return Settings(
        cloud_api_url=(env("CLOUD_API_URL", "https://api-ficas.vgandolfi.dev") or "").rstrip("/"),
        cloud_admin_email=env("CLOUD_ADMIN_EMAIL", "admin@ficas.org.br") or "",
        cloud_admin_password=env("CLOUD_ADMIN_PASSWORD", "pMYo6KhsdubKH9qPmWxg") or "",
        pg_host=env("POSTGRES_HOST", "localhost") or "localhost",
        pg_port=int(env("POSTGRES_PORT", "5432") or "5432"),
        pg_db=env("POSTGRES_DB", "ficas") or "ficas",
        pg_user=env("POSTGRES_USER", "ficas") or "ficas",
        pg_password=env("POSTGRES_PASSWORD", "ficas") or "ficas",
        s3_endpoint=env("AWS_ENDPOINT", "http://localhost:9000") or "http://localhost:9000",
        s3_access_key=env("AWS_ACCESS_KEY", "ficas") or "ficas",
        s3_secret_key=env("AWS_SECRET_KEY", "ficasminio") or "ficasminio",
        s3_region=env("AWS_REGION", "us-east-1") or "us-east-1",
        s3_bucket=env("AWS_BUCKET_NAME", "ficas-media") or "ficas-media",
        s3_path_style=env_bool("AWS_PATH_STYLE", True),
    )


def print_config(settings: Settings, args: argparse.Namespace) -> None:
    log("Resolved config (secrets redacted):")
    log(f"  CLOUD_API_URL       : {settings.cloud_api_url}")
    log(f"  CLOUD_ADMIN_EMAIL   : {settings.cloud_admin_email}")
    log(f"  CLOUD_ADMIN_PASSWORD: {redact(settings.cloud_admin_password)}")
    log(
        f"  POSTGRES            : {settings.pg_user}@{settings.pg_host}:"
        f"{settings.pg_port}/{settings.pg_db}"
    )
    log(f"  POSTGRES_PASSWORD   : {redact(settings.pg_password)}")
    log(f"  AWS_ENDPOINT        : {settings.s3_endpoint}")
    log(f"  AWS_BUCKET_NAME     : {settings.s3_bucket}")
    log(f"  AWS_REGION          : {settings.s3_region}")
    log(f"  AWS_PATH_STYLE      : {settings.s3_path_style}")
    log(f"  AWS_ACCESS_KEY      : {redact(settings.s3_access_key)}")
    log(f"  AWS_SECRET_KEY      : {redact(settings.s3_secret_key)}")
    log(
        "  Options             : dry_run=%s limit=%s skip_media=%s skip_redirects=%s only=%s"
        % (args.dry_run, args.limit, args.skip_media, args.skip_redirects, args.only or "all")
    )
    log("")


# --------------------------------------------------------------------------- #
# HTTP client (stdlib urllib)
# --------------------------------------------------------------------------- #
class CloudError(RuntimeError):
    """A non-auth failure talking to the cloud API."""


class AuthAbort(RuntimeError):
    """Authentication/authorization failure: the whole run must abort."""


class CloudClient:
    def __init__(self, base_url: str, *, timeout: int = 180) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.cookie: str | None = None

    # -- low level --------------------------------------------------------- #
    def _send(
        self,
        method: str,
        path: str,
        data: bytes | None = None,
        headers: dict[str, str] | None = None,
    ) -> tuple[int, Any, bytes]:
        url = f"{self.base_url}{path}"
        request = urllib.request.Request(url, data=data, method=method)
        request.add_header("Accept", "application/json")
        if self.cookie:
            request.add_header("Cookie", f"ficas_token={self.cookie}")
        for key, value in (headers or {}).items():
            request.add_header(key, value)

        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = response.read()
                status = response.status
                resp_headers = response.headers
        except urllib.error.HTTPError as exc:
            body = exc.read()
            status = exc.code
            resp_headers = exc.headers
        except (urllib.error.URLError, OSError) as exc:
            raise CloudError(f"{method} {path} failed: {exc}") from exc

        if status in (401, 403):
            detail = body[:300].decode("utf-8", "replace")
            raise AuthAbort(
                f"authentication failed for {method} {path} (HTTP {status}): {detail}"
            )
        return status, resp_headers, body

    @staticmethod
    def _parse(headers: Any, body: bytes) -> Any:
        if not body:
            return None
        content_type = str(headers.get("Content-Type") or "") if headers else ""
        text = body.decode("utf-8", "replace")
        if "json" in content_type or text.lstrip().startswith(("{", "[")):
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return text
        return text

    # -- auth -------------------------------------------------------------- #
    def login(self, email: str, password: str) -> Any:
        payload = json.dumps({"email": email, "password": password}).encode("utf-8")
        status, headers, body = self._send(
            "POST", "/api/auth/login", payload, {"Content-Type": "application/json"}
        )
        if status >= 400:
            detail = body[:300].decode("utf-8", "replace")
            raise CloudError(f"login failed (HTTP {status}): {detail}")
        for cookie in headers.get_all("Set-Cookie") or []:
            if cookie.startswith("ficas_token="):
                self.cookie = cookie.split(";", 1)[0].split("=", 1)[1]
                break
        if not self.cookie:
            raise CloudError("login succeeded but no 'ficas_token' cookie was returned")
        log(f"Authenticated as {email} (ficas_token captured).")
        return self._parse(headers, body)

    # -- JSON helpers ------------------------------------------------------ #
    def get_json(self, path: str) -> Any:
        status, headers, body = self._send("GET", path)
        if status >= 400:
            detail = body[:300].decode("utf-8", "replace")
            raise CloudError(f"GET {path} -> HTTP {status}: {detail}")
        return self._parse(headers, body)

    def post_json(self, path: str, payload: Any) -> tuple[int, Any]:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        status, headers, body = self._send(
            "POST", path, data, {"Content-Type": "application/json"}
        )
        return status, self._parse(headers, body)

    def put_json(self, path: str, payload: Any) -> tuple[int, Any]:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        status, headers, body = self._send(
            "PUT", path, data, {"Content-Type": "application/json"}
        )
        return status, self._parse(headers, body)

    def post_multipart(
        self,
        path: str,
        file_field: str,
        filename: str,
        content_type: str,
        content: bytes,
        fields: dict[str, str] | None = None,
    ) -> tuple[int, Any]:
        boundary = "----ficas" + uuid.uuid4().hex
        body = bytearray()
        for name, value in (fields or {}).items():
            body += f"--{boundary}\r\n".encode("utf-8")
            body += f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8")
            body += value.encode("utf-8")
            body += b"\r\n"
        body += f"--{boundary}\r\n".encode("utf-8")
        body += (
            f'Content-Disposition: form-data; name="{file_field}"; '
            f'filename="{filename}"\r\n'
        ).encode("utf-8")
        body += f"Content-Type: {content_type}\r\n\r\n".encode("utf-8")
        body += content
        body += f"\r\n--{boundary}--\r\n".encode("utf-8")

        status, headers, resp_body = self._send(
            "POST",
            path,
            bytes(body),
            {"Content-Type": f"multipart/form-data; boundary={boundary}"},
        )
        return status, self._parse(headers, resp_body)


def fetch_all(client: CloudClient, path: str, page_size: int = FETCH_PAGE_SIZE) -> list[Any]:
    """Read a list endpoint, tolerating both plain arrays and ``PageResponse``."""
    collected: list[Any] = []
    page = 0
    while True:
        separator = "&" if "?" in path else "?"
        data = client.get_json(f"{path}{separator}page={page}&size={page_size}")
        if isinstance(data, list):
            return data
        if not isinstance(data, dict):
            return collected
        content = data.get("content")
        if content is None:
            return collected
        collected.extend(content)
        total_pages = int(data.get("totalPages") or 0)
        page += 1
        if page >= total_pages or not content:
            break
    return collected


# --------------------------------------------------------------------------- #
# Report bookkeeping
# --------------------------------------------------------------------------- #
@dataclass
class StepCount:
    planned: int = 0
    created: int = 0
    skipped: int = 0
    failed: int = 0

    def as_dict(self) -> dict[str, int]:
        return {
            "planned": self.planned,
            "created": self.created,
            "skipped": self.skipped,
            "failed": self.failed,
        }


@dataclass
class RunReport:
    counts: dict[str, StepCount] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def step(self, name: str) -> StepCount:
        return self.counts.setdefault(name, StepCount())

    def warn(self, message: str) -> None:
        self.warnings.append(message)
        log(f"WARNING: {message}")


# --------------------------------------------------------------------------- #
# Local sources: Postgres + MinIO
# --------------------------------------------------------------------------- #
def connect_db(settings: Settings) -> Any:
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required but not installed")
    return psycopg2.connect(
        host=settings.pg_host,
        port=settings.pg_port,
        dbname=settings.pg_db,
        user=settings.pg_user,
        password=settings.pg_password,
        connect_timeout=10,
    )


def query_all(connection: Any, sql: str) -> list[dict[str, Any]]:
    with connection.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql)
        return [dict(row) for row in cursor.fetchall()]


def load_sources(connection: Any) -> dict[str, list[dict[str, Any]]]:
    return {name: query_all(connection, sql) for name, sql in SOURCE_QUERIES.items()}


def build_s3(settings: Settings) -> Any:
    if boto3 is None:
        raise RuntimeError("boto3 is required but not installed")
    config = BotoConfig(
        s3={"addressing_style": "path" if settings.s3_path_style else "auto"},
        retries={"max_attempts": 5, "mode": "standard"},
    )
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=config,
    )


def list_import_keys(s3: Any, bucket: str) -> set[str]:
    keys: set[str] = set()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix="import/"):
        for item in page.get("Contents", []):
            keys.add(item["Key"])
    return keys


def media_key_from_url(url: str) -> str:
    return url[len(MEDIA_URL_PREFIX):] if url.startswith(MEDIA_URL_PREFIX) else url.lstrip("/")


# --------------------------------------------------------------------------- #
# Media map persistence (resumable uploads)
# --------------------------------------------------------------------------- #
def load_media_map() -> dict[str, dict[str, Any]]:
    if MEDIA_MAP_PATH.is_file():
        try:
            data = json.loads(MEDIA_MAP_PATH.read_text(encoding="utf-8"))
            data.setdefault("by_local_id", {})
            data.setdefault("by_old_url", {})
            return data
        except (OSError, json.JSONDecodeError):
            log(f"WARNING: could not read {MEDIA_MAP_PATH}; starting a fresh map.")
    return {"by_local_id": {}, "by_old_url": {}}


def save_media_map(media_map: dict[str, dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = MEDIA_MAP_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(media_map, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(MEDIA_MAP_PATH)


# --------------------------------------------------------------------------- #
# Steps
# --------------------------------------------------------------------------- #
def push_categories(client: CloudClient, rows: Sequence[dict[str, Any]], report: RunReport) -> dict[Any, Any]:
    count = report.step("categories")
    count.planned = len(rows)
    existing = {item["slug"]: item["id"] for item in fetch_all(client, "/api/admin/categories")}
    id_map: dict[Any, Any] = {}
    for row in rows:
        slug = row["slug"]
        if slug in existing:
            id_map[row["id"]] = existing[slug]
            count.skipped += 1
            continue
        status, data = client.post_json(
            "/api/admin/categories",
            {
                "name": row["name"],
                "slug": slug,
                "description": row["description"],
                "sortOrder": row["sort_order"],
            },
        )
        if status == 409:
            fresh = {item["slug"]: item["id"] for item in fetch_all(client, "/api/admin/categories")}
            existing.update(fresh)
            if slug in existing:
                id_map[row["id"]] = existing[slug]
                count.skipped += 1
            else:
                count.failed += 1
                report.warn(f"category '{slug}' returned 409 but is absent from the list")
        elif 200 <= status < 300 and isinstance(data, dict) and data.get("id"):
            existing[slug] = data["id"]
            id_map[row["id"]] = data["id"]
            count.created += 1
        else:
            count.failed += 1
            report.warn(f"category '{slug}' failed: HTTP {status} {data}")
    log(f"categories: created={count.created} skipped={count.skipped} failed={count.failed}")
    return id_map


def push_tags(client: CloudClient, rows: Sequence[dict[str, Any]], report: RunReport) -> dict[Any, Any]:
    count = report.step("tags")
    count.planned = len(rows)
    existing = {item["slug"]: item["id"] for item in fetch_all(client, "/api/admin/tags")}
    id_map: dict[Any, Any] = {}
    for row in rows:
        slug = row["slug"]
        if slug in existing:
            id_map[row["id"]] = existing[slug]
            count.skipped += 1
            continue
        status, data = client.post_json("/api/admin/tags", {"name": row["name"], "slug": slug})
        if status == 409:
            fresh = {item["slug"]: item["id"] for item in fetch_all(client, "/api/admin/tags")}
            existing.update(fresh)
            if slug in existing:
                id_map[row["id"]] = existing[slug]
                count.skipped += 1
            else:
                count.failed += 1
                report.warn(f"tag '{slug}' returned 409 but is absent from the list")
        elif 200 <= status < 300 and isinstance(data, dict) and data.get("id"):
            existing[slug] = data["id"]
            id_map[row["id"]] = data["id"]
            count.created += 1
        else:
            count.failed += 1
            report.warn(f"tag '{slug}' failed: HTTP {status} {data}")
    log(f"tags: created={count.created} skipped={count.skipped} failed={count.failed}")
    return id_map


def push_media(
    client: CloudClient,
    s3: Any,
    settings: Settings,
    rows: Sequence[dict[str, Any]],
    media_map: dict[str, dict[str, Any]],
    report: RunReport,
) -> dict[str, str]:
    """Upload media bytes; return the ``old_url -> new_url`` map for content rewriting."""
    count = report.step("media")
    count.planned = len(rows)
    by_local_id = media_map.setdefault("by_local_id", {})
    by_old_url = media_map.setdefault("by_old_url", {})

    for index, row in enumerate(rows, start=1):
        local_id = str(row["id"])
        old_url = row["url"]
        if old_url in by_old_url and local_id in by_local_id:
            count.skipped += 1
            continue
        key = media_key_from_url(old_url)
        try:
            obj = s3.get_object(Bucket=settings.s3_bucket, Key=key)
            content = obj["Body"].read()
        except (ClientError, BotoCoreError) as exc:  # type: ignore[misc]
            count.failed += 1
            report.warn(f"media {local_id} object '{key}' not readable from MinIO: {exc}")
            continue

        filename = row["filename"] or Path(key).name
        content_type = row["mime_type"] or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        fields: dict[str, str] = {}
        if row.get("alt"):
            fields["alt"] = row["alt"]
        try:
            status, data = client.post_multipart(
                "/api/admin/media", "file", filename, content_type, content, fields
            )
        except CloudError as exc:
            count.failed += 1
            report.warn(f"media {local_id} upload error: {exc}")
            continue

        if 200 <= status < 300 and isinstance(data, dict) and data.get("id"):
            by_local_id[local_id] = {"id": data["id"], "url": data["url"]}
            by_old_url[old_url] = data["url"]
            count.created += 1
            save_media_map(media_map)
        else:
            count.failed += 1
            report.warn(f"media {local_id} upload failed: HTTP {status} {data}")
        if index % 25 == 0 or index == len(rows):
            log(f"  media {index}/{len(rows)} created={count.created} skipped={count.skipped} failed={count.failed}")

    log(f"media: created={count.created} skipped={count.skipped} failed={count.failed}")
    return dict(by_old_url)


def push_pages(
    client: CloudClient,
    rows: Sequence[dict[str, Any]],
    old_to_new: dict[str, str],
    report: RunReport,
) -> None:
    count = report.step("pages")
    count.planned = len(rows)
    try:
        existing = {item.get("slug") for item in fetch_all(client, "/api/admin/pages")}
    except CloudError as exc:
        report.warn(f"could not list existing pages ({exc}); relying on 409")
        existing = set()

    for row in rows:
        slug = row["slug"]
        if slug in existing:
            count.skipped += 1
            continue
        status, data = client.post_json(
            "/api/admin/pages",
            {
                "title": row["title"],
                "slug": slug,
                # NOTE: the contract only mandates rewriting post content, but pages carry the
                # same /media/import URLs; rewriting them is required for images to resolve.
                "content": rewrite_media_urls(row.get("content"), old_to_new),
                "contentFormat": "HTML",
                "excerpt": row.get("excerpt"),
                "heroMediaId": None,
                "menuOrder": row.get("menu_order") or 0,
                "showInMenu": False,
                "status": "PUBLISHED",
            },
        )
        if status == 409:
            count.skipped += 1
        elif 200 <= status < 300:
            count.created += 1
            existing.add(slug)
        else:
            count.failed += 1
            report.warn(f"page '{slug}' failed: HTTP {status} {data}")
    log(f"pages: created={count.created} skipped={count.skipped} failed={count.failed}")


def push_posts(
    client: CloudClient,
    rows: Sequence[dict[str, Any]],
    post_tags: Sequence[dict[str, Any]],
    category_map: dict[Any, Any],
    tag_map: dict[Any, Any],
    media_map: dict[str, dict[str, Any]],
    old_to_new: dict[str, str],
    report: RunReport,
) -> None:
    count = report.step("posts")
    count.planned = len(rows)
    try:
        existing = {item.get("slug") for item in fetch_all(client, "/api/admin/posts")}
    except CloudError as exc:
        report.warn(f"could not list existing posts ({exc}); relying on 409")
        existing = set()

    tags_by_post: dict[Any, list[Any]] = {}
    for link in post_tags:
        tags_by_post.setdefault(link["post_id"], []).append(link["tag_id"])

    for row in rows:
        slug = row["slug"]
        if slug in existing:
            count.skipped += 1
            continue
        category_id = category_map.get(row["category_id"]) if row["category_id"] is not None else None
        tag_ids = [
            tag_map[tag_id]
            for tag_id in tags_by_post.get(row["id"], [])
            if tag_id in tag_map
        ]
        cover_local = row["cover_media_id"]
        cover_media_id = None
        if cover_local is not None:
            cover_entry = media_map.get(str(cover_local))
            cover_media_id = cover_entry.get("id") if cover_entry else None
        status, data = client.post_json(
            "/api/admin/posts",
            {
                "title": row["title"],
                "slug": slug,
                "excerpt": row.get("excerpt"),
                "content": rewrite_media_urls(row.get("content"), old_to_new),
                "contentFormat": "HTML",
                "categoryId": category_id,
                "tagIds": tag_ids,
                "coverMediaId": cover_media_id,
                "status": "PUBLISHED",
                "publishedAt": isoformat_utc(row.get("published_at")),
            },
        )
        if status == 409:
            count.skipped += 1
        elif 200 <= status < 300:
            count.created += 1
            existing.add(slug)
        else:
            count.failed += 1
            report.warn(f"post '{slug}' failed: HTTP {status} {data}")
    log(f"posts: created={count.created} skipped={count.skipped} failed={count.failed}")


def build_menu_tree(rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    """Reconstruct the nested admin menu payload from flat ``menu_items`` rows."""
    children_by_parent: dict[Any, list[dict[str, Any]]] = {}
    for row in sorted(rows, key=lambda item: (item["sort_order"], item["id"])):
        children_by_parent.setdefault(row["parent_id"], []).append(row)

    def build(parent_id: Any) -> list[dict[str, Any]]:
        return [
            {
                "label": row["label"],
                "url": row["url"],
                "target": row["target"] or "_self",
                "sortOrder": row["sort_order"],
                "parentId": row["parent_id"],
                "children": build(row["id"]),
            }
            for row in children_by_parent.get(parent_id, [])
        ]

    return build(None)


def push_menu(client: CloudClient, rows: Sequence[dict[str, Any]], report: RunReport) -> None:
    count = report.step("menu")
    count.planned = len(rows)
    try:
        current = client.get_json("/api/admin/menu")
        log(f"menu (GET): {len(current) if isinstance(current, list) else '?'} root item(s) currently on the API")
    except CloudError as exc:
        report.warn(f"menu GET failed ({exc}); proceeding with PUT")
    tree = build_menu_tree(rows)
    status, data = client.put_json("/api/admin/menu", tree)
    if 200 <= status < 300:
        count.created = len(rows)
        log(f"menu: replaced full tree with {len(rows)} item(s)")
    else:
        count.failed = len(rows)
        report.warn(f"menu PUT failed: HTTP {status} {data}")


def normalize_settings(row: dict[str, Any]) -> dict[str, Any]:
    social = row.get("social") or {}
    contact = row.get("contact") or {}
    pix = row.get("pix") or {}
    return {
        "siteName": row.get("site_name") or "",
        "siteDescription": row.get("site_description"),
        "logoUrl": row.get("logo_url"),
        "faviconUrl": row.get("favicon_url"),
        "social": {
            "instagram": social.get("instagram", ""),
            "facebook": social.get("facebook", ""),
            "youtube": social.get("youtube", ""),
            "twitter": social.get("twitter", ""),
            "linkedin": social.get("linkedin", ""),
        },
        "contact": {
            "email": contact.get("email", ""),
            "phone": contact.get("phone", ""),
            "address": contact.get("address", ""),
        },
        "pix": {
            "key": pix.get("key", ""),
            "qrImageUrl": pix.get("qrImageUrl"),
            "suggestedAmounts": pix.get("suggestedAmounts") or [],
        },
    }


def push_settings(client: CloudClient, rows: Sequence[dict[str, Any]], report: RunReport) -> None:
    count = report.step("settings")
    count.planned = len(rows)
    if not rows:
        report.warn("no site_settings row found locally; skipping")
        return
    try:
        current = client.get_json("/api/admin/settings")
        log(f"settings (GET) keys: {sorted(current) if isinstance(current, dict) else current}")
    except CloudError as exc:
        report.warn(f"settings GET failed ({exc}); proceeding with PUT")
    status, data = client.put_json("/api/admin/settings", normalize_settings(rows[0]))
    if 200 <= status < 300:
        count.created = 1
        log("settings: updated singleton")
    else:
        count.failed = 1
        report.warn(f"settings PUT failed: HTTP {status} {data}")


def push_redirects(client: CloudClient, rows: Sequence[dict[str, Any]], report: RunReport) -> None:
    count = report.step("redirects")
    count.planned = len(rows)
    if not rows:
        return
    batches = list(chunks(rows, BULK_BATCH_SIZE))
    for index, batch in enumerate(batches, start=1):
        payload = [
            {"fromPath": row["from_path"], "toPath": row["to_path"], "statusCode": row["status_code"]}
            for row in batch
        ]
        status, data = client.post_json("/api/admin/redirects/bulk", payload)
        if status == 404:
            remaining = sum(len(item) for item in batches[index - 1:])
            count.skipped += remaining
            report.warn(
                "/api/admin/redirects/bulk not deployed yet (HTTP 404); skipping "
                f"{remaining} redirect(s) (this endpoint is being added in parallel)."
            )
            break
        if 200 <= status < 300:
            if isinstance(data, dict) and ("inserted" in data or "updated" in data):
                count.created += int(data.get("inserted") or 0)
                count.skipped += int(data.get("updated") or 0)
            else:
                count.created += len(batch)
        else:
            count.failed += len(batch)
            report.warn(f"redirects batch {index} failed: HTTP {status} {data}")
    log(f"redirects: created={count.created} skipped={count.skipped} failed={count.failed}")


# --------------------------------------------------------------------------- #
# Dry run
# --------------------------------------------------------------------------- #
def run_dry_run(
    settings: Settings,
    sources: dict[str, list[dict[str, Any]]],
    args: argparse.Namespace,
    attempted: set[str],
) -> int:
    media_rows = sources["media"]
    page_rows = sources["pages"]
    post_rows = sources["posts"]
    if args.limit:
        media_rows = media_rows[: args.limit]
        page_rows = page_rows[: args.limit]
        post_rows = post_rows[: args.limit]

    report = RunReport()
    for step in attempted:
        report.step(step).planned = {
            "categories": len(sources["categories"]),
            "tags": len(sources["tags"]),
            "media": len(media_rows),
            "pages": len(page_rows),
            "posts": len(post_rows),
            "menu": len(sources["menu_items"]),
            "settings": len(sources["settings"]),
            "redirects": len(sources["redirects"]),
        }.get(step, 0)

    log("Planned migration (dry run — no cloud writes):")
    if "categories" in attempted:
        log(f"  categories   : {len(sources['categories'])}")
    if "tags" in attempted:
        log(f"  tags         : {len(sources['tags'])}")
    if "media" in attempted:
        minio_keys: set[str] = set()
        if boto3 is not None:
            try:
                s3 = build_s3(settings)
                minio_keys = list_import_keys(s3, settings.s3_bucket)
            except Exception as exc:  # noqa: BLE001 - dry run must not crash
                report.warn(f"could not list MinIO objects: {exc}")
        expected = {media_key_from_url(row["url"]) for row in media_rows}
        missing = expected - minio_keys
        log(
            f"  media_assets : {len(media_rows)} "
            f"(local MinIO 'import/' objects: {len(minio_keys)}; missing for selection: {len(missing)})"
        )
        if missing and len(missing) <= 10:
            for key in sorted(missing):
                log(f"      missing: {key}")
    if "pages" in attempted:
        log(f"  pages        : {len(page_rows)}")
    if "posts" in attempted:
        log(f"  posts        : {len(post_rows)}")
        log(f"  post_tags    : {len(sources['post_tags'])} links")
    if "menu" in attempted:
        log(f"  menu_items   : {len(sources['menu_items'])}")
    if "settings" in attempted:
        log(f"  site_settings: {len(sources['settings'])}")
    if "redirects" in attempted:
        log(f"  redirects    : {len(sources['redirects'])}")
    log("")
    log("Dry run complete — no S3 objects, database rows or cloud records were written.")
    print_report(report, args, settings, dry_run=True)
    return 0


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #
def print_report(
    report: RunReport,
    args: argparse.Namespace,
    settings: Settings,
    *,
    dry_run: bool,
) -> None:
    payload = {
        "dryRun": dry_run,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "config": {
            "cloudApiUrl": settings.cloud_api_url,
            "cloudAdminEmail": settings.cloud_admin_email,
            "postgres": f"{settings.pg_user}@{settings.pg_host}:{settings.pg_port}/{settings.pg_db}",
            "s3Endpoint": settings.s3_endpoint,
            "s3Bucket": settings.s3_bucket,
            "s3PathStyle": settings.s3_path_style,
        },
        "options": {
            "dryRun": args.dry_run,
            "limit": args.limit,
            "skipMedia": args.skip_media,
            "skipRedirects": args.skip_redirects,
            "only": args.only,
        },
        "counts": {name: count.as_dict() for name, count in report.counts.items()},
        "warnings": report.warnings,
        "mediaMapPath": str(MEDIA_MAP_PATH),
    }
    log("Report:")
    print(json.dumps(payload, ensure_ascii=False, indent=2))


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="push_cloud.py",
        description="Push the local FICAS dataset (Postgres + MinIO) to the production API.",
    )
    parser.add_argument("--dry-run", action="store_true", help="read local DB/MinIO and print planned counts only")
    parser.add_argument("--limit", type=int, default=None, help="limit posts/pages/media")
    parser.add_argument("--skip-media", action="store_true", help="skip media uploads (and content URL rewrite)")
    parser.add_argument("--skip-redirects", action="store_true", help="skip redirects")
    parser.add_argument(
        "--only",
        default=None,
        help="comma-separated subset of: " + ",".join(ALL_STEPS),
    )
    return parser.parse_args(argv)


def selected_steps(args: argparse.Namespace) -> set[str]:
    steps = set(ALL_STEPS)
    if args.only:
        requested = {part.strip() for part in args.only.split(",") if part.strip()}
        unknown = requested - set(ALL_STEPS)
        if unknown:
            raise ValueError(f"unknown --only steps: {', '.join(sorted(unknown))}")
        steps &= requested
    if args.skip_media:
        steps.discard("media")
    if args.skip_redirects:
        steps.discard("redirects")
    return steps


def slugs_to_ids(client: CloudClient, path: str, local_rows: Sequence[dict[str, Any]]) -> dict[Any, Any]:
    """Map local row id -> cloud id by matching the natural key ``slug``."""
    by_slug = {item["slug"]: item["id"] for item in fetch_all(client, path)}
    return {
        row["id"]: by_slug[row["slug"]]
        for row in local_rows
        if row.get("slug") in by_slug
    }


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    if args.limit is not None and args.limit <= 0:
        fail("--limit must be a positive integer")
        return 2
    try:
        steps = selected_steps(args)
    except ValueError as exc:
        fail(str(exc))
        return 2

    settings = load_settings()
    print_config(settings, args)

    if psycopg2 is None:
        fail("psycopg2 is required. Install it (pip install psycopg2-binary).")
        return 2
    if boto3 is None and "media" in steps:
        fail("boto3 is required for media. Install it or pass --skip-media.")
        return 2

    connection = connect_db(settings)
    try:
        log(f"Reading local Postgres {settings.pg_host}:{settings.pg_port}/{settings.pg_db} …")
        sources = load_sources(connection)
    finally:
        connection.close()

    log(
        "Local rows: "
        + ", ".join(f"{name}={len(rows)}" for name, rows in sources.items())
    )
    log("")

    if args.dry_run:
        return run_dry_run(settings, sources, args, steps)

    client = CloudClient(settings.cloud_api_url)
    try:
        client.login(settings.cloud_admin_email, settings.cloud_admin_password)
    except AuthAbort as exc:
        fail(str(exc))
        return 1
    except CloudError as exc:
        fail(str(exc))
        return 1

    report = RunReport()
    media_map = load_media_map()
    old_to_new = dict(media_map.get("by_old_url", {}))
    category_map: dict[Any, Any] = {}
    tag_map: dict[Any, Any] = {}

    if not old_to_new and ("pages" in steps or "posts" in steps):
        report.warn(
            "no cloud media URL map available; /media/import/... URLs in page/post content "
            "will NOT be rewritten (run the media step, or provide scripts/data/cloud_media_map.json)."
        )

    try:
        if "categories" in steps:
            category_map = push_categories(client, sources["categories"], report)
        if "tags" in steps:
            tag_map = push_tags(client, sources["tags"], report)
        if "media" in steps:
            s3 = build_s3(settings)
            old_to_new = push_media(client, s3, settings, sources["media"], media_map, report)
        if "pages" in steps:
            push_pages(client, sources["pages"], old_to_new, report)
        if "posts" in steps:
            # When categories/tags were not migrated in this invocation, resolve ids by slug.
            if not category_map:
                category_map = slugs_to_ids(client, "/api/admin/categories", sources["categories"])
            if not tag_map:
                tag_map = slugs_to_ids(client, "/api/admin/tags", sources["tags"])
            push_posts(
                client,
                sources["posts"],
                sources["post_tags"],
                category_map,
                tag_map,
                media_map.get("by_local_id", {}),
                old_to_new,
                report,
            )
        if "menu" in steps:
            push_menu(client, sources["menu_items"], report)
        if "settings" in steps:
            push_settings(client, sources["settings"], report)
        if "redirects" in steps:
            push_redirects(client, sources["redirects"], report)
    except AuthAbort as exc:
        fail(str(exc))
        return 1

    print_report(report, args, settings, dry_run=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
