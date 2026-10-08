"""Builds turkish-full.json: the episode index behind the "Turkish (Full)" server.

YoTurkish lists Turkish series by absolute episode number and, for current
seasons and its FHD library, links each episode to a VoE-hosted copy that can
be embedded anywhere. This walks every series from its newest episode
backwards and records those VoE codes, stopping once a series runs out of
them (older episodes sit on a host that refuses to embed on other sites).

Run from the repo root whenever new episodes should be picked up:

    python tools/build_turkish_index.py            # every series (slow)
    python tools/build_turkish_index.py --airing   # only series with recent episodes

The site rate-limits quickly, so requests go out one at a time with a pause
between them, and progress is saved after every series (safe to interrupt
and re-run).

Output: turkish-full.json  ->  { "<series-slug>": { "<absolute ep>": "<voe code>" } }
"""

import json
import re
import sys
import time
import urllib.error
import urllib.request

BASE = "https://yoturkish.to"
OUT = "turkish-full.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
# A series is abandoned after this many episodes in a row without a VoE link.
MISS_LIMIT = 5
PAUSE = 1.5
SKIP = {"home", "series", "episodes", "calendar", "contact"}


def fetch(url, tries=6):
    for attempt in range(tries):
        time.sleep(PAUSE)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as res:
                return res.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return ""
            # 429: back off for as long as the site asks (or a minute).
            wait = int(err.headers.get("Retry-After") or 60) if err.code == 429 else 5
            time.sleep(min(wait, 300) * (attempt + 1))
        except Exception:
            time.sleep(5 * (attempt + 1))
    return ""


def series_slugs():
    html = fetch(f"{BASE}/series/")
    slugs = re.findall(r'<a href="%s/([a-z0-9-]+)/"[^>]*title="' % re.escape(BASE), html)
    return sorted({s for s in slugs if s not in SKIP and "-episode-" not in s})


def airing_slugs():
    """Series behind the newest episodes on the home and episode-list pages."""
    html = fetch(f"{BASE}/home/") + fetch(f"{BASE}/episodes/")
    return sorted(set(re.findall(r'%s/([a-z0-9-]+)-episode-\d+/' % re.escape(BASE), html)))


def crawl(slug, known):
    html = fetch(f"{BASE}/{slug}/")
    numbers = sorted({int(n) for n in re.findall(r"/%s-episode-(\d+)/" % re.escape(slug), html)}, reverse=True)
    found = dict(known)
    misses = 0
    for n in numbers:
        if str(n) in found:
            misses = 0
            continue
        page = fetch(f"{BASE}/{slug}-episode-{n}/")
        m = re.search(r"voe\.sx/([a-z0-9]+)/download", page)
        if m:
            found[str(n)] = m.group(1)
            misses = 0
        else:
            misses += 1
            if misses >= MISS_LIMIT:
                break
    return found


def main():
    try:
        with open(OUT, encoding="utf-8") as f:
            index = json.load(f)
    except (OSError, ValueError):
        index = {}
    airing = airing_slugs()
    slugs = airing if "--airing" in sys.argv else airing + [sl for sl in series_slugs() if sl not in airing]
    if not slugs:
        sys.exit("Could not read the series list; index left unchanged.")
    print(f"{len(slugs)} series", flush=True)
    for i, slug in enumerate(slugs, 1):
        found = crawl(slug, index.get(slug, {}))
        if found:
            index[slug] = dict(sorted(found.items(), key=lambda kv: int(kv[0])))
            with open(OUT, "w", encoding="utf-8", newline="\n") as f:
                json.dump(index, f, separators=(",", ":"), sort_keys=True)
        print(f"{i}/{len(slugs)} {slug}: {len(found)}", flush=True)
    print(f"{len(index)} series, {sum(len(v) for v in index.values())} episodes -> {OUT}")


if __name__ == "__main__":
    main()
