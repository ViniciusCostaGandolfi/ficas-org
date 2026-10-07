#!/usr/bin/env python3
"""FICAS migration: WordPress -> S3/MinIO + Postgres.

Standalone replacement for the retired Java importer
(``apps/api/src/main/java/br/org/ficas/api/service/WordPressImportService.java``).
The script is idempotent and resumable: every table is written with
``INSERT ... ON CONFLICT (natural key) DO NOTHING`` and every S3 object is
skipped when it already exists.

Pipeline
--------
1. Optionally (re)download the WordPress dump via ``scripts/download_wp.py``.
2. Upload ``scripts/media/<rel>`` to ``<bucket>/import/<rel>`` using a thread
   pool.  The public URL stored in the database and rewritten into content is
   ``/media/import/<rel>`` (proxied by the API's ``MediaHttpController``).
3. Insert categories, tags, media_assets, pages, posts, post_tags and redirects
   into Postgres.

Everything is configured through environment variables (see ``--check``).

Usage
-----
::

    python scripts/migrate.py --check
    python scripts/migrate.py --dry-run
    python scripts/migrate.py --limit 20 --skip-s3
    python scripts/migrate.py

Environment
-----------
S3
    ``AWS_ENDPOINT`` (http://localhost:9000), ``AWS_ACCESS_KEY`` /
    ``MINIO_ROOT_USER`` (ficas), ``AWS_SECRET_KEY`` / ``MINIO_ROOT_PASSWORD``
    (ficasminio), ``AWS_REGION`` (us-east-1), ``AWS_BUCKET_NAME``
    (ficas-media), ``AWS_PATH_STYLE`` (true).

DB
    ``POSTGRES_HOST`` (localhost), ``POSTGRES_PORT`` (5432), ``POSTGRES_DB``
    (ficas), ``POSTGRES_USER`` (ficas), ``POSTGRES_PASSWORD`` (ficas) or
    ``DATABASE_URL`` (``postgres://user:pass@host:port/db``).
"""
from __future__ import annotations

import argparse
import importlib.metadata
import importlib.util
import json
import mimetypes
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable, Iterator, Sequence
from urllib.parse import unquote, urlsplit

# Third-party dependencies are optional at import time so that ``--check`` and
# ``--dry-run`` work even on a machine that has not installed them yet.
try:  # pragma: no cover - trivial import guard
    import boto3
    from botocore.config import Config as BotoConfig
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # pragma: no cover
    boto3 = None  # type: ignore[assignment]
    BotoConfig = None  # type: ignore[assignment]
    BotoCoreError = ClientError = Exception  # type: ignore[assignment,misc]

try:  # pragma: no cover - trivial import guard
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:  # pragma: no cover
    psycopg2 = None  # type: ignore[assignment]

# --------------------------------------------------------------------------- #
# Paths & constants
# --------------------------------------------------------------------------- #
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
MEDIA_DIR = SCRIPT_DIR / "media"
REPORT_PATH = DATA_DIR / "migration_report.json"
DOWNLOAD_SCRIPT = SCRIPT_DIR / "download_wp.py"

REQUIRED_DATA_FILES = ("categories.json", "tags.json", "media.json", "pages.json", "posts.json")

UPLOADS_MARKER = "/wp-content/uploads/"

#: Junk/utility pages that must not be imported (mirrors the retired Java class).
PAGE_BLOCKLIST = frozenset(
    {
        "f1",
        "f2",
        "modelo2",
        "home",
        # The export uses "home-espanol"; both spellings are listed defensively.
        "home-espanol",
        "home-espanhol",
        "home-english",
        "home-portugues",
        "shop",
        "tienda",
        "loja",
        "carrinho",
        "minha-conta",
        "finalizar-apoio",
        "rascunho-automatico",
    }
)

#: Files that are never uploaded (left-over partial downloads).
SKIP_FILE_SUFFIXES = (".part",)

# --------------------------------------------------------------------------- #
# Small utilities
# --------------------------------------------------------------------------- #
def log(message: str) -> None:
    """Print a progress line to stdout (flushed, so long runs show progress)."""
    print(message, flush=True)


def env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def truncate(value: str | None, max_len: int) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed if len(trimmed) <= max_len else trimmed[:max_len]


# --------------------------------------------------------------------------- #
# HTML sanitizer — faithful port of WordPressHtmlSanitizer.java
# --------------------------------------------------------------------------- #
_ET_PB_IMAGE = re.compile(r"\[et_pb_image\b([^\]]*)\]", re.IGNORECASE)
_SRC_ATTR = re.compile(r"\bsrc\s*=\s*\"([^\"]+)\"", re.IGNORECASE)
_ALT_ATTR = re.compile(r"\balt\s*=\s*\"([^\"]*)\"", re.IGNORECASE)
_ET_DC = re.compile(r"@ET-DC@([A-Za-z0-9+/=]+)@")
_SHORTCODE = re.compile(r"\[[^\]]*\]")
_LONE_BRACKET = re.compile(r"[\[\]]")
_EMPTY_PARAGRAPH = re.compile(r"<p>(?:\s|&nbsp;|<br\s*/?>)*</p>", re.IGNORECASE)
_PROTOCOL = re.compile(r"^([a-zA-Z][a-zA-Z0-9+.\-]*):")

_ALLOWED_TAGS = frozenset(
    {
        "h1", "h2", "h3", "h4", "a", "p", "ul", "ol", "li", "strong", "em", "b", "i",
        "blockquote", "img", "figure", "figcaption", "table", "thead", "tbody", "tr",
        "th", "td", "br", "hr",
    }
)
_ALLOWED_ATTRS: dict[str, frozenset[str]] = {
    "a": frozenset({"href", "title"}),
    "img": frozenset({"src", "alt", "width", "height"}),
}
_ALLOWED_PROTOCOLS: dict[str, frozenset[str]] = {
    "a": frozenset({"http", "https", "mailto", "tel"}),
    "img": frozenset({"http", "https"}),
}
_VOID_TAGS = frozenset({"br", "hr", "img"})
_SKIP_CONTENT_TAGS = frozenset({"script", "style"})

_QUOTE_ENTITIES = (
    ("&#8220;", "\""),
    ("&#8221;", "\""),
    ("&#8222;", "\""),
    ("&#8243;", "\""),
    ("&#8242;", "'"),
    ("&#8216;", "'"),
    ("&#8217;", "'"),
    ("&#34;", "\""),
    ("&quot;", "\""),
    ("&#39;", "'"),
    ("&apos;", "'"),
)


def decode_quote_entities(html_text: str) -> str:
    for entity, quote in _QUOTE_ENTITIES:
        html_text = html_text.replace(entity, quote)
    return html_text


def _expand_image(match: re.Match[str]) -> str:
    attrs = match.group(1)
    src_match = _SRC_ATTR.search(attrs)
    if src_match is None or not src_match.group(1).strip():
        return ""
    src = src_match.group(1)
    alt_match = _ALT_ATTR.search(attrs)
    if alt_match is None:
        return f'<img src="{src}" />'
    return f'<img src="{src}" alt="{alt_match.group(1)}" />'


def pre_clean(html_text: str | None) -> str:
    """Decode quote entities, expand Divi image shortcodes, drop tokens/shortcodes."""
    if not html_text or not html_text.strip():
        return ""
    out = decode_quote_entities(html_text)
    out = _ET_PB_IMAGE.sub(_expand_image, out)
    out = _ET_DC.sub("", out)  # always dropped (only ever a dynamic title)
    out = _SHORTCODE.sub("", out)
    out = _LONE_BRACKET.sub("", out)
    return out


def normalize_url(url: str | None) -> str:
    """Scheme/host/query/fragment independent key used to match media URLs."""
    if not url:
        return ""
    value = url.strip()
    scheme = value.find("://")
    if scheme >= 0:
        value = value[scheme + 3:]
    elif value.startswith("//"):
        value = value[2:]
    if value.startswith("www."):
        value = value[4:]
    query = value.find("?")
    if query >= 0:
        value = value[:query]
    fragment = value.find("#")
    if fragment >= 0:
        value = value[:fragment]
    return value.lower()


def _protocol_allowed(tag: str, value: str) -> bool:
    allowed = _ALLOWED_PROTOCOLS.get(tag, frozenset())
    if not allowed:
        return False
    match = _PROTOCOL.match(value.strip())
    if match is None:  # relative / protocol-relative URLs are kept
        return True
    return match.group(1).lower() in allowed


def _render_tag(
    tag: str,
    attrs: Iterable[tuple[str, str | None]],
    *,
    restrict: bool = True,
) -> str:
    allowed = _ALLOWED_ATTRS.get(tag, frozenset())
    rendered: list[str] = []
    for name, value in attrs:
        name = name.lower()
        if value is None:
            continue
        if restrict:
            if name not in allowed:
                continue
            if name in {"href", "src"} and not _protocol_allowed(tag, value):
                continue
        rendered.append(f' {name}="{escape(value, quote=True)}"')
    return f"<{tag}{''.join(rendered)}>"


class _Sanitizer(HTMLParser):
    """Whitelist cleaner: unwraps unknown tags, drops script/style and bad attrs."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in _SKIP_CONTENT_TAGS:
            self._skip += 1
            return
        if self._skip or tag not in _ALLOWED_TAGS:
            return
        self.parts.append(_render_tag(tag, attrs))

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in _SKIP_CONTENT_TAGS:
            if self._skip:
                self._skip -= 1
            return
        if self._skip or tag not in _ALLOWED_TAGS or tag in _VOID_TAGS:
            return
        self.parts.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        if not self._skip:
            self.parts.append(escape(data, quote=False))


class _PostProcessor(HTMLParser):
    """Adds ``loading="lazy"`` and rewrites media URLs to their local form."""

    def __init__(self, media_map: dict[str, str]) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.media_map = media_map

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        new_attrs: list[tuple[str, str | None]] = []
        for name, value in attrs:
            if value is not None and ((tag == "img" and name == "src") or (tag == "a" and name == "href")):
                replacement = self.media_map.get(normalize_url(value))
                if replacement is not None:
                    value = replacement
            new_attrs.append((name, value))
        if tag == "img":
            new_attrs.append(("loading", "lazy"))
        # Input is already sanitized, so keep the attributes as they are.
        self.parts.append(_render_tag(tag, new_attrs, restrict=False))

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in _ALLOWED_TAGS and tag not in _VOID_TAGS:
            self.parts.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        self.parts.append(escape(data, quote=False))


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in _SKIP_CONTENT_TAGS:
            self._skip += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in _SKIP_CONTENT_TAGS and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip:
            self.parts.append(data)


def collapse_whitespace(value: str | None) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", value.replace("\u00a0", " ")).strip()


def html_to_text(html_text: str) -> str:
    extractor = _TextExtractor()
    extractor.feed(html_text)
    extractor.close()
    return "".join(extractor.parts)


def sanitize(html_text: str | None, media_map: dict[str, str]) -> str:
    """Clean WordPress HTML for storage (mirrors ``WordPressHtmlSanitizer.sanitize``)."""
    if not html_text or not html_text.strip():
        return ""
    parser = _Sanitizer()
    parser.feed(pre_clean(html_text))
    parser.close()
    cleaned = "".join(parser.parts).replace("\u00a0", " ")
    cleaned = _EMPTY_PARAGRAPH.sub("", cleaned)
    post = _PostProcessor(media_map)
    post.feed(cleaned)
    post.close()
    return "".join(post.parts)


def to_excerpt(html_text: str | None, title: str | None) -> str:
    """Plain-text excerpt built from raw HTML (mirrors ``toExcerpt``)."""
    text = collapse_whitespace(html_to_text(pre_clean(html_text)))
    return text if text else collapse_whitespace(title)


def to_plain_text(html_text: str | None) -> str:
    if not html_text or not html_text.strip():
        return ""
    return collapse_whitespace(html_to_text(pre_clean(html_text)))


def excerpt_for(raw_excerpt: str | None, raw_content: str | None, title: str | None) -> str:
    excerpt = to_excerpt(raw_excerpt, None)
    if not excerpt:
        excerpt = to_excerpt(raw_content, title)
    return truncate(excerpt, 1000) or ""


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Settings:
    s3_endpoint: str
    s3_access_key: str
    s3_secret_key: str
    s3_region: str
    s3_bucket: str
    s3_path_style: bool
    pg_host: str
    pg_port: int
    pg_db: str
    pg_user: str
    pg_password: str
    database_url: str | None


def load_settings() -> Settings:
    database_url = env("DATABASE_URL")
    if database_url:
        parsed = urlsplit(database_url)
        pg_host = parsed.hostname or "localhost"
        pg_port = parsed.port or 5432
        pg_db = (parsed.path or "/ficas").lstrip("/") or "ficas"
        pg_user = unquote(parsed.username) if parsed.username else "ficas"
        pg_password = unquote(parsed.password) if parsed.password else "ficas"
    else:
        pg_host = env("POSTGRES_HOST", "localhost") or "localhost"
        pg_port = int(env("POSTGRES_PORT", "5432") or "5432")
        pg_db = env("POSTGRES_DB", "ficas") or "ficas"
        pg_user = env("POSTGRES_USER", "ficas") or "ficas"
        pg_password = env("POSTGRES_PASSWORD", "ficas") or "ficas"

    return Settings(
        s3_endpoint=env("AWS_ENDPOINT", "http://localhost:9000") or "http://localhost:9000",
        s3_access_key=env("AWS_ACCESS_KEY") or env("MINIO_ROOT_USER", "ficas") or "ficas",
        s3_secret_key=env("AWS_SECRET_KEY") or env("MINIO_ROOT_PASSWORD", "ficasminio") or "ficasminio",
        s3_region=env("AWS_REGION", "us-east-1") or "us-east-1",
        s3_bucket=env("AWS_BUCKET_NAME", "ficas-media") or "ficas-media",
        s3_path_style=env_bool("AWS_PATH_STYLE", True),
        pg_host=pg_host,
        pg_port=pg_port,
        pg_db=pg_db,
        pg_user=pg_user,
        pg_password=pg_password,
        database_url=database_url,
    )


def dependency_status() -> dict[str, dict[str, Any]]:
    def status(import_name: str, distributions: Sequence[str]) -> dict[str, Any]:
        if importlib.util.find_spec(import_name) is None:
            return {"available": False, "version": None}
        for distribution in distributions:
            try:
                return {"available": True, "version": importlib.metadata.version(distribution)}
            except importlib.metadata.PackageNotFoundError:
                continue
        return {"available": True, "version": "unknown"}

    return {
        "boto3": status("boto3", ["boto3"]),
        "psycopg2": status("psycopg2", ["psycopg2-binary", "psycopg2"]),
    }


def print_check(settings: Settings) -> None:
    log("FICAS migration — configuration check")
    log("")
    log("Dependencies:")
    for name, info in dependency_status().items():
        state = f"ok ({info['version']})" if info["available"] else "MISSING"
        log(f"  {name:<10} {state}")
    log("")
    log("Resolved config (secrets redacted):")
    log(f"  S3 endpoint      : {settings.s3_endpoint}")
    log(f"  S3 bucket        : {settings.s3_bucket}")
    log(f"  S3 region        : {settings.s3_region}")
    log(f"  S3 path style    : {settings.s3_path_style}")
    log(f"  S3 access key    : {'set' if settings.s3_access_key else 'MISSING'}")
    log(f"  S3 secret key    : {'set' if settings.s3_secret_key else 'MISSING'}")
    log(f"  DB source        : {'DATABASE_URL' if settings.database_url else 'POSTGRES_* variables'}")
    log(f"  DB host:port     : {settings.pg_host}:{settings.pg_port}")
    log(f"  DB name          : {settings.pg_db}")
    log(f"  DB user          : {settings.pg_user}")
    log(f"  DB password      : {'set' if settings.pg_password else 'MISSING'}")
    log("")
    log(f"Data dir         : {DATA_DIR}")
    log(f"Media dir        : {MEDIA_DIR}")
    missing = [name for name in REQUIRED_DATA_FILES if not (DATA_DIR / name).is_file()]
    log(f"Downloaded data  : {'all present' if not missing else 'missing ' + ', '.join(missing)}")


# --------------------------------------------------------------------------- #
# Data loading / row building
# --------------------------------------------------------------------------- #
@dataclass
class MediaCandidate:
    rel: str
    path: Path
    filename: str
    url: str
    mime_type: str
    size_bytes: int
    alt: str
    source_url: str | None


@dataclass
class CategoryRow:
    slug: str
    name: str
    description: str | None
    sort_order: int
    wp_id: int


@dataclass
class TagRow:
    slug: str
    name: str
    wp_id: int


@dataclass
class PageRow:
    slug: str
    title: str
    content: str
    excerpt: str
    menu_order: int
    show_in_menu: bool
    wp_id: int


@dataclass
class PostRow:
    slug: str
    title: str
    content: str
    excerpt: str
    published_at: datetime | None
    category_wp_id: int | None
    tag_wp_ids: list[int]
    wp_id: int


@dataclass
class RedirectRow:
    from_path: str
    to_path: str
    status_code: int = 301


def load_json(name: str) -> list[dict[str, Any]]:
    with (DATA_DIR / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def media_rel(source_url: str | None) -> str | None:
    """``.../wp-content/uploads/2021/09/x.jpg`` -> ``2021/09/x.jpg``."""
    if not source_url:
        return None
    path = urlsplit(source_url).path
    index = path.find(UPLOADS_MARKER)
    rel = path[index + len(UPLOADS_MARKER):] if index != -1 else path
    rel = unquote(rel).lstrip("/")
    return rel or None


def mime_for(path: Path, wp_mime: str | None) -> str:
    guessed, _ = mimetypes.guess_type(path.name)
    return guessed or wp_mime or "application/octet-stream"


def iter_media_files() -> Iterator[tuple[str, Path]]:
    for root, _dirs, files in os.walk(MEDIA_DIR):
        for name in files:
            if name.endswith(SKIP_FILE_SUFFIXES):
                continue
            path = Path(root) / name
            rel = path.relative_to(MEDIA_DIR).as_posix()
            yield rel, path


def build_media_candidates() -> list[MediaCandidate]:
    """Every local media file, enriched with WordPress metadata when available."""
    by_rel: dict[str, dict[str, Any]] = {}
    for item in load_json("media.json"):
        rel = media_rel(item.get("source_url"))
        if rel:
            by_rel[rel] = item

    candidates: list[MediaCandidate] = []
    for rel, path in sorted(iter_media_files()):
        wp = by_rel.get(rel, {})
        candidates.append(
            MediaCandidate(
                rel=rel,
                path=path,
                filename=path.name,
                url=f"/media/import/{rel}",
                mime_type=mime_for(path, wp.get("mime_type")),
                size_bytes=path.stat().st_size,
                alt=(wp.get("alt_text") or "").strip(),
                source_url=(wp.get("source_url") or "").strip() or None,
            )
        )
    return candidates


def build_media_map(candidates: Sequence[MediaCandidate]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for candidate in candidates:
        if candidate.source_url:
            mapping.setdefault(normalize_url(candidate.source_url), candidate.url)
    return mapping


def build_categories() -> list[CategoryRow]:
    return [
        CategoryRow(
            slug=item["slug"],
            name=truncate(to_plain_text(item.get("name") or ""), 150) or item["slug"],
            description=truncate(to_plain_text(item.get("description") or ""), 500),
            sort_order=index,
            wp_id=int(item["id"]),
        )
        for index, item in enumerate(load_json("categories.json"))
        if item.get("slug")
    ]


def build_tags() -> list[TagRow]:
    return [
        TagRow(
            slug=item["slug"],
            name=truncate(to_plain_text(item.get("name") or ""), 150) or item["slug"],
            wp_id=int(item["id"]),
        )
        for item in load_json("tags.json")
        if item.get("slug")
    ]


def _rendered(doc: dict[str, Any] | None) -> str | None:
    return (doc or {}).get("rendered")


def build_pages(media_map: dict[str, str]) -> list[PageRow]:
    rows: list[PageRow] = []
    for item in load_json("pages.json"):
        slug = (item.get("slug") or "").strip()
        if not slug or slug.lower() in PAGE_BLOCKLIST:
            continue
        raw_content = _rendered(item.get("content"))
        title = truncate(to_plain_text(_rendered(item.get("title"))), 255) or slug
        rows.append(
            PageRow(
                slug=slug,
                title=title,
                content=sanitize(raw_content, media_map),
                excerpt=excerpt_for(_rendered(item.get("excerpt")), raw_content, title),
                menu_order=int(item.get("menu_order") or 0),
                show_in_menu=False,
                wp_id=int(item["id"]),
            )
        )
    return rows


def build_posts(media_map: dict[str, str]) -> list[PostRow]:
    rows: list[PostRow] = []
    for item in load_json("posts.json"):
        slug = (item.get("slug") or "").strip()
        if not slug:
            continue
        raw_content = _rendered(item.get("content"))
        title = truncate(to_plain_text(_rendered(item.get("title"))), 255) or slug
        categories = [int(c) for c in (item.get("categories") or []) if c]
        tags = [int(t) for t in (item.get("tags") or []) if t]
        rows.append(
            PostRow(
                slug=slug,
                title=title,
                content=sanitize(raw_content, media_map),
                excerpt=excerpt_for(_rendered(item.get("excerpt")), raw_content, title),
                published_at=parse_wp_date(item.get("date")),
                category_wp_id=categories[0] if categories else None,
                tag_wp_ids=tags,
                wp_id=int(item["id"]),
            )
        )
    return rows


def parse_wp_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _strip_trailing_slash(path: str) -> str:
    return path.rstrip("/") or "/"


def build_redirects(
    pages: Sequence[PageRow],
    posts: Sequence[PostRow],
    categories: Sequence[CategoryRow],
    tags: Sequence[TagRow],
) -> list[RedirectRow]:
    """Redirect rules from the migration spec (post/page/category/tag + misc)."""
    rows: list[RedirectRow] = []
    seen: set[str] = set()

    def add(from_path: str | None, to_path: str) -> None:
        if not from_path:
            return
        from_path = _strip_trailing_slash(from_path)
        if from_path in seen:
            return
        seen.add(from_path)
        rows.append(RedirectRow(from_path=from_path, to_path=to_path))

    for category in categories:
        add(f"/category/{category.slug}", f"/categoria/{category.slug}")
    for tag in tags:
        add(f"/tag/{tag.slug}", "/noticias")
    for post in posts:
        if post.published_at is not None:
            add(f"/{post.published_at:%Y/%m/%d}/{post.slug}", f"/noticias/{post.slug}")
        add(f"/?p={post.wp_id}", f"/noticias/{post.slug}")
    for page in pages:
        add(f"/?page_id={page.wp_id}", f"/{page.slug}")
    add("/home", "/")
    add("/ultimas-noticias", "/noticias")
    return rows


# --------------------------------------------------------------------------- #
# S3 upload
# --------------------------------------------------------------------------- #
@dataclass
class UploadReport:
    uploaded: int = 0
    skipped: int = 0
    failed: int = 0
    failures: list[dict[str, str]] = field(default_factory=list)


def build_s3_client(settings: Settings) -> Any:
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


def upload_media(
    settings: Settings,
    candidates: Sequence[MediaCandidate],
    *,
    force: bool,
    workers: int,
) -> UploadReport:
    client = build_s3_client(settings)
    report = UploadReport()
    total = len(candidates)
    if total == 0:
        return report

    bucket = settings.s3_bucket

    def work(candidate: MediaCandidate) -> tuple[str, MediaCandidate]:
        key = f"import/{candidate.rel}"
        if not force:
            try:
                client.head_object(Bucket=bucket, Key=key)
                return "skipped", candidate
            except ClientError as exc:  # type: ignore[misc]
                code = str(exc.response.get("Error", {}).get("Code", ""))
                if code not in {"404", "NotFound", "NoSuchKey"}:
                    return "failed", candidate
            except BotoCoreError:  # type: ignore[misc]
                return "failed", candidate
        try:
            client.upload_file(
                str(candidate.path),
                bucket,
                key,
                ExtraArgs={"ContentType": candidate.mime_type},
            )
            return "uploaded", candidate
        except (ClientError, BotoCoreError, OSError):  # type: ignore[misc]
            return "failed", candidate

    log(f"S3: uploading {total} object(s) to s3://{bucket}/import/ (workers={workers}, force={force})")
    done = 0
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        futures = {pool.submit(work, candidate): candidate for candidate in candidates}
        for future in as_completed(futures):
            status, candidate = future.result()
            done += 1
            if status == "uploaded":
                report.uploaded += 1
            elif status == "skipped":
                report.skipped += 1
            else:
                report.failed += 1
                report.failures.append({"rel": candidate.rel, "key": f"import/{candidate.rel}"})
            if done % 200 == 0 or done == total:
                log(
                    f"  S3 {done}/{total} uploaded={report.uploaded} "
                    f"skipped={report.skipped} failed={report.failed}"
                )
    return report


# --------------------------------------------------------------------------- #
# Database import
# --------------------------------------------------------------------------- #
@dataclass
class TableCount:
    planned: int = 0
    inserted: int = 0

    @property
    def skipped(self) -> int:
        return self.planned - self.inserted

    def as_dict(self) -> dict[str, int]:
        return {"planned": self.planned, "inserted": self.inserted, "skipped": self.skipped}


PAGE_SIZE = 1000


def _insert(cur: Any, sql: str, rows: Sequence[tuple[Any, ...]]) -> int:
    if not rows:
        return 0
    result = execute_values(cur, sql, rows, page_size=PAGE_SIZE, fetch=True)
    return len(result)


def _load_id_map(cur: Any, table: str, key: str) -> dict[str, int]:
    cur.execute(f"SELECT id, {key} FROM {table}")
    return {row[1]: row[0] for row in cur.fetchall()}


def _resolve_author(cur: Any) -> int | None:
    cur.execute("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id LIMIT 1")
    row = cur.fetchone()
    return int(row[0]) if row else None


def import_database(
    settings: Settings,
    *,
    categories: Sequence[CategoryRow],
    tags: Sequence[TagRow],
    media: Sequence[MediaCandidate],
    pages: Sequence[PageRow],
    posts: Sequence[PostRow],
    redirects: Sequence[RedirectRow],
) -> dict[str, TableCount]:
    """Insert everything inside a single transaction (rollback on error)."""
    counts: dict[str, TableCount] = {
        "categories": TableCount(planned=len(categories)),
        "tags": TableCount(planned=len(tags)),
        "media_assets": TableCount(planned=len(media)),
        "pages": TableCount(planned=len(pages)),
        "posts": TableCount(planned=len(posts)),
        "post_tags": TableCount(planned=0),
        "redirects": TableCount(planned=len(redirects)),
    }

    connection = psycopg2.connect(
        host=settings.pg_host,
        port=settings.pg_port,
        dbname=settings.pg_db,
        user=settings.pg_user,
        password=settings.pg_password,
        connect_timeout=10,
    )
    try:
        with connection, connection.cursor() as cur:
            counts["categories"].inserted = _insert(
                cur,
                "INSERT INTO categories (slug, name, description, sort_order) VALUES %s "
                "ON CONFLICT (slug) DO NOTHING RETURNING slug",
                [(c.slug, c.name, c.description, c.sort_order) for c in categories],
            )
            counts["tags"].inserted = _insert(
                cur,
                "INSERT INTO tags (slug, name) VALUES %s "
                "ON CONFLICT (slug) DO NOTHING RETURNING slug",
                [(t.slug, t.name) for t in tags],
            )
            counts["media_assets"].inserted = _insert(
                cur,
                "INSERT INTO media_assets (filename, url, mime_type, size_bytes, alt) VALUES %s "
                "ON CONFLICT (url) DO NOTHING RETURNING url",
                [(m.filename, m.url, m.mime_type, m.size_bytes, m.alt or None) for m in media],
            )
            counts["pages"].inserted = _insert(
                cur,
                "INSERT INTO pages (slug, title, content, excerpt, status, menu_order, show_in_menu) "
                "VALUES %s ON CONFLICT (slug) DO NOTHING RETURNING slug",
                [
                    (p.slug, p.title, p.content, p.excerpt, "PUBLISHED", p.menu_order, p.show_in_menu)
                    for p in pages
                ],
            )

            category_wp_to_slug = {c.wp_id: c.slug for c in categories}
            category_id_by_slug = _load_id_map(cur, "categories", "slug")
            tag_wp_to_slug = {t.wp_id: t.slug for t in tags}
            tag_id_by_slug = _load_id_map(cur, "tags", "slug")
            author_id = _resolve_author(cur)

            post_values: list[tuple[Any, ...]] = []
            for post in posts:
                category_id = None
                if post.category_wp_id is not None:
                    slug = category_wp_to_slug.get(post.category_wp_id)
                    category_id = category_id_by_slug.get(slug) if slug else None
                post_values.append(
                    (
                        post.slug,
                        post.title,
                        post.content,
                        post.excerpt,
                        "PUBLISHED",
                        post.published_at,
                        category_id,
                        author_id,
                    )
                )
            counts["posts"].inserted = _insert(
                cur,
                "INSERT INTO posts (slug, title, content, excerpt, status, published_at, "
                "category_id, author_id) VALUES %s "
                "ON CONFLICT (slug) DO NOTHING RETURNING slug",
                post_values,
            )

            post_id_by_slug = _load_id_map(cur, "posts", "slug")
            post_tag_values: list[tuple[int, int]] = []
            for post in posts:
                post_id = post_id_by_slug.get(post.slug)
                if post_id is None:
                    continue
                for wp_tag_id in post.tag_wp_ids:
                    slug = tag_wp_to_slug.get(wp_tag_id)
                    tag_id = tag_id_by_slug.get(slug) if slug else None
                    if tag_id is not None:
                        post_tag_values.append((post_id, tag_id))
            # De-duplicate (a post may reference the same tag twice).
            post_tag_values = list(dict.fromkeys(post_tag_values))
            counts["post_tags"].planned = len(post_tag_values)
            counts["post_tags"].inserted = _insert(
                cur,
                "INSERT INTO post_tags (post_id, tag_id) VALUES %s "
                "ON CONFLICT DO NOTHING RETURNING post_id",
                post_tag_values,
            )

            counts["redirects"].inserted = _insert(
                cur,
                "INSERT INTO redirects (from_path, to_path, status_code) VALUES %s "
                "ON CONFLICT (from_path) DO NOTHING RETURNING from_path",
                [(r.from_path, r.to_path, r.status_code) for r in redirects],
            )
    finally:
        connection.close()
    return counts


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #
def build_report(
    *,
    limit: int | None,
    skip_s3: bool,
    skip_db: bool,
    force_upload: bool,
    upload: UploadReport | None,
    db_counts: dict[str, TableCount] | None,
) -> dict[str, Any]:
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dry_run": False,
        "options": {
            "limit": limit,
            "skip_s3": skip_s3,
            "skip_db": skip_db,
            "force_upload": force_upload,
        },
        "s3": {
            "uploaded": upload.uploaded if upload else 0,
            "skipped": upload.skipped if upload else 0,
            "failed": upload.failed if upload else 0,
            "failures": upload.failures if upload else [],
        },
        "db": {name: count.as_dict() for name, count in (db_counts or {}).items()},
    }


def write_report(report: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with REPORT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)


def print_plan(
    categories: Sequence[CategoryRow],
    tags: Sequence[TagRow],
    media: Sequence[MediaCandidate],
    pages: Sequence[PageRow],
    posts: Sequence[PostRow],
    redirects: Sequence[RedirectRow],
    *,
    all_media_count: int,
    all_pages_count: int,
) -> None:
    post_tag_count = len({(p.slug, t) for p in posts for t in p.tag_wp_ids})
    log("Planned migration:")
    log(f"  categories   : {len(categories)}")
    log(f"  tags         : {len(tags)}")
    log(f"  media_assets : {len(media)} (local files found: {all_media_count})")
    log(f"  pages        : {len(pages)} (junk blocklist applied; kept {all_pages_count})")
    log(f"  posts        : {len(posts)}")
    log(f"  post_tags    : {post_tag_count} resolved pairs")
    log(f"  redirects    : {len(redirects)}")
    log(f"  s3 uploads   : {len(media)}")


# --------------------------------------------------------------------------- #
# Download / prerequisites
# --------------------------------------------------------------------------- #
def missing_data_files() -> list[str]:
    return [name for name in REQUIRED_DATA_FILES if not (DATA_DIR / name).is_file()]


def ensure_data(download: bool) -> bool:
    missing = missing_data_files()
    if not missing and not download:
        return True
    if not download:
        log("ERROR: missing WordPress data files: " + ", ".join(missing))
        log("Re-run with --download (or run scripts/download_wp.py first).")
        return False

    if not DOWNLOAD_SCRIPT.is_file():
        log(f"ERROR: downloader not found at {DOWNLOAD_SCRIPT}")
        return False
    log(f"Running {DOWNLOAD_SCRIPT.name} …")
    result = subprocess.run([sys.executable, str(DOWNLOAD_SCRIPT)], check=False)
    if result.returncode != 0:
        log(f"ERROR: downloader exited with code {result.returncode}")
        return False
    still_missing = missing_data_files()
    if still_missing:
        log("ERROR: still missing after download: " + ", ".join(still_missing))
        return False
    return True


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="migrate.py",
        description="Migrate the FICAS WordPress dump into S3/MinIO and Postgres.",
    )
    parser.add_argument("--skip-s3", action="store_true", help="do not upload media to S3")
    parser.add_argument("--skip-db", action="store_true", help="do not write to Postgres")
    parser.add_argument("--force-upload", action="store_true", help="re-upload objects even if present")
    parser.add_argument("--workers", type=int, default=8, help="S3 upload threads (default 8)")
    parser.add_argument("--download", action="store_true", help="(re)download the WordPress dump first")
    parser.add_argument("--dry-run", action="store_true", help="print planned counts without writing")
    parser.add_argument("--limit", type=int, default=None, help="limit posts/pages/media (smoke tests)")
    parser.add_argument("--check", action="store_true", help="print resolved config + dependency status")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    settings = load_settings()

    if args.check:
        print_check(settings)
        return 0

    if args.limit is not None and args.limit <= 0:
        log("ERROR: --limit must be a positive integer")
        return 2
    if args.workers <= 0:
        log("ERROR: --workers must be a positive integer")
        return 2

    if not args.skip_s3 and boto3 is None:
        log("ERROR: boto3 is required for S3 uploads. Install scripts/requirements.txt or pass --skip-s3.")
        return 2
    if not args.skip_db and psycopg2 is None:
        log("ERROR: psycopg2 is required for DB imports. Install scripts/requirements.txt or pass --skip-db.")
        return 2
    if args.skip_s3 and args.skip_db:
        log("ERROR: both --skip-s3 and --skip-db set; nothing to do.")
        return 2

    if not ensure_data(args.download):
        return 1

    log(f"Loading WordPress dump from {DATA_DIR} …")
    all_media = build_media_candidates()
    media_map = build_media_map(all_media)
    categories = build_categories()
    tags = build_tags()
    all_pages = build_pages(media_map)
    all_posts = build_posts(media_map)

    media = all_media[: args.limit] if args.limit else all_media
    pages = all_pages[: args.limit] if args.limit else all_pages
    posts = all_posts[: args.limit] if args.limit else all_posts
    redirects = build_redirects(pages, posts, categories, tags)

    print_plan(
        categories,
        tags,
        media,
        pages,
        posts,
        redirects,
        all_media_count=len(all_media),
        all_pages_count=len(all_pages),
    )
    log("")

    if args.dry_run:
        log("Dry run — no S3 objects or database rows were written.")
        return 0

    upload: UploadReport | None = None
    if not args.skip_s3:
        upload = upload_media(settings, media, force=args.force_upload, workers=args.workers)
        log(f"S3 done: uploaded={upload.uploaded} skipped={upload.skipped} failed={upload.failed}")

    db_counts: dict[str, TableCount] | None = None
    if not args.skip_db:
        log(
            f"DB: importing into {settings.pg_host}:{settings.pg_port}/{settings.pg_db} "
            f"as {settings.pg_user} …"
        )
        db_counts = import_database(
            settings,
            categories=categories,
            tags=tags,
            media=media,
            pages=pages,
            posts=posts,
            redirects=redirects,
        )
        for name, count in db_counts.items():
            log(f"  {name:<13} inserted={count.inserted} skipped={count.skipped} planned={count.planned}")

    report = build_report(
        limit=args.limit,
        skip_s3=args.skip_s3,
        skip_db=args.skip_db,
        force_upload=args.force_upload,
        upload=upload,
        db_counts=db_counts,
    )
    write_report(report)
    log(f"Report written to {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
