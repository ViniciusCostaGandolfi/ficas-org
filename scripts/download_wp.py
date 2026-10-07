#!/usr/bin/env python3
"""Download everything from the FICAS WordPress (REST API + all media).

Outputs (all under this scripts/ directory):
  data/<collection>.json   full WP collections: categories, tags, media, pages, posts
  media/wp-content/uploads/<year>/<month>/<file>   every media binary (source_url)
  data/media_download_report.json   per-file result (ok/skip/fail)

Resumable: existing non-empty files are skipped, so re-running only fetches what
is missing. Stdlib only (no third-party deps).

Usage:
  python3 scripts/download_wp.py
Env (optional):
  WP_BASE   REST base (default https://ficas.org.br/wp-json/wp/v2)
  WORKERS   parallel downloads (default 12)
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = os.environ.get("WP_BASE", "https://ficas.org.br/wp-json/wp/v2").rstrip("/")
WORKERS = int(os.environ.get("WORKERS", "12"))
UA = "Mozilla/5.0 (FICAS migration downloader)"
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
MEDIA = os.path.join(ROOT, "media")
COLLECTIONS = ["categories", "tags", "media", "pages", "posts"]
PER_PAGE = 100
UPLOADS_MARKER = "/wp-content/uploads/"


def log(msg: str) -> None:
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def get_json(url: str, retries: int = 5):
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": UA, "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                payload = json.loads(resp.read().decode("utf-8", "replace"))
                return payload, dict(resp.headers)
        except urllib.error.HTTPError as exc:
            if exc.code == 400:  # WP returns 400 when page > total pages
                return [], {}
            log(f"  retry {attempt}/{retries} {url} -> HTTP {exc.code}")
        except Exception as exc:  # noqa: BLE001
            log(f"  retry {attempt}/{retries} {url} -> {exc}")
        time.sleep(min(2 * attempt, 10))
    return None, {}


def fetch_collection(name: str) -> list:
    out: list = []
    page = 1
    total_pages = None
    while True:
        url = f"{BASE}/{name}?per_page={PER_PAGE}&page={page}&orderby=id&order=asc"
        data, headers = get_json(url)
        if data is None:
            log(f"collection {name}: giving up at page {page}")
            break
        if not isinstance(data, list) or not data:
            break
        out.extend(data)
        total = headers.get("X-WP-Total")
        if headers.get("X-WP-TotalPages"):
            total_pages = int(headers["X-WP-TotalPages"])
        log(
            f"collection {name} page={page} got={len(data)} total={total} "
            f"pages={total_pages} acc={len(out)}"
        )
        if total_pages is not None and page >= total_pages:
            break
        if total_pages is None and len(data) < PER_PAGE:
            break
        page += 1
        time.sleep(0.2)

    os.makedirs(DATA, exist_ok=True)
    path = os.path.join(DATA, f"{name}.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False)
    log(f"saved {path} items={len(out)}")
    return out


def media_target(url: str) -> str:
    path = urllib.parse.urlparse(url).path
    idx = path.find(UPLOADS_MARKER)
    rel = path[idx + len(UPLOADS_MARKER):] if idx != -1 else os.path.basename(path)
    rel = urllib.parse.unquote(rel).lstrip("/")
    return os.path.join(MEDIA, rel)


def download_one(url: str):
    dst = media_target(url)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return ("skip", url, os.path.getsize(dst))
    tmp = dst + ".part"
    try:
        parts = urllib.parse.urlsplit(url)
        safe_path = urllib.parse.quote(parts.path, safe="/%")
        safe_url = urllib.parse.urlunsplit(
            (parts.scheme, parts.netloc, safe_path, parts.query, parts.fragment)
        )
        req = urllib.request.Request(safe_url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=180) as resp, open(tmp, "wb") as fh:
            while True:
                chunk = resp.read(1 << 20)
                if not chunk:
                    break
                fh.write(chunk)
        os.replace(tmp, dst)
        return ("ok", url, os.path.getsize(dst))
    except Exception as exc:  # noqa: BLE001
        try:
            os.remove(tmp)
        except OSError:
            pass
        return ("fail", url, str(exc))


def main() -> int:
    os.makedirs(DATA, exist_ok=True)
    os.makedirs(MEDIA, exist_ok=True)

    reuse = os.environ.get("REUSE_JSON") == "1"
    for name in COLLECTIONS:
        path = os.path.join(DATA, f"{name}.json")
        if reuse and os.path.exists(path) and os.path.getsize(path) > 0:
            log(f"reuse {path}")
            continue
        fetch_collection(name)

    media_path = os.path.join(DATA, "media.json")
    try:
        with open(media_path, encoding="utf-8") as fh:
            media = json.load(fh)
    except FileNotFoundError:
        log("media.json not found; aborting media download")
        return 1

    urls: list[str] = []
    seen: set[str] = set()
    for item in media:
        url = (item.get("source_url") or "").strip()
        if not url:
            continue
        if url.startswith("//"):
            url = "https:" + url
        if url not in seen:
            seen.add(url)
            urls.append(url)

    log(f"media to download: {len(urls)} unique source_urls (WORKERS={WORKERS})")
    report = {"ok": 0, "skip": 0, "fail": 0, "bytes": 0, "failures": []}
    started = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(download_one, u): u for u in urls}
        done = 0
        for fut in as_completed(futures):
            status, ref, info = fut.result()
            done += 1
            if status == "fail":
                report["fail"] += 1
                report["failures"].append({"url": ref, "error": str(info)})
            else:
                report[status] += 1
                report["bytes"] += int(info)
            if done % 100 == 0 or done == len(urls):
                mib = report["bytes"] / 1024 / 1024
                rate = mib / max(time.time() - started, 1)
                log(
                    f"media {done}/{len(urls)} ok={report['ok']} skip={report['skip']} "
                    f"fail={report['fail']} {mib:.0f}MiB ({rate:.1f}MiB/s)"
                )

    with open(os.path.join(DATA, "media_download_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=2)
    log(
        f"DONE ok={report['ok']} skip={report['skip']} fail={report['fail']} "
        f"total={report['bytes']/1024/1024:.1f}MiB in {time.time()-started:.0f}s"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
