"""Builds qissa-series.json: every Arabic-dubbed series on Qissat Ishq, by TMDB id.

The site files dubbed episodes under its own Arabic series names, splits long
series into seasons with separate numbering ("مسلسل اخوتي موسم 2 الحلقة 5
مدبلجة") and rarely spells a name the way TMDB does. So this reads the title
of every dubbed post through the site's public posts API, groups the episodes
per series and season, and ties each series to its TMDB id: by an exact match
on TMDB's Arabic name where that works, else through OVERRIDES below.

Run from the repo root to pick up new series (new episodes of the series
already listed are found live by the app, see loadNewDubEpisodes in app.js):

    python tools/build_qissa_index.py

A series it prints as "unmapped" needs a line in OVERRIDES.

Output: qissa-series.json ->
    { "built": "<ISO date>",
      "series": { "<tmdb id>": { "names": ["<Arabic name>", ...],
                                 "dub": [ { "label": "Season 2",
                                            "titles": ["<title before الحلقة>", ...],
                                            "eps": [<post id of episode 1, 0 if missing>, ...] } ] } } }
"""

import datetime
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://new.eishq.net/wp-json/wp/v2/posts"
TMDB = "https://api.themoviedb.org/3"
OUT = "qissa-series.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
PAUSE = 0.5

# "<series, maybe with its season> الحلقة <n> ..." -- with the site's typos.
EPISODE = re.compile(r"^(.+?)\s+(?:الحلق[ةه]|الخلقة|الحلفة)\s+(\d+)")
SEASON = re.compile(r"\s+(?:(?:ال)?موسم\s+)?(\d+)$")

# Site name (no "مسلسل", season or bracketed alias) -> TMDB id, for the series
# TMDB's own Arabic name doesn't lead to. 0 = not a Turkish series, skip.
OVERRIDES = {
    "ابواب القدر": 253808,  # Zamanın Kapıları
    "اخوتي": 119267,  # Kardeşlerim
    "اخي": 306529,  # A.B.İ.
    "اسرار اللؤلؤ": 243832,  # İnci Taneleri
    "اسطنبول الضالمة": 88024,  # Zalim İstanbul
    "اسمي ملك": 94607,  # Benim Adım Melek
    "الاخوة بربروس": 132752,  # Barbaroslar: Akdeniz'in Kılıcı
    "الاسيرة": 215709,  # Esaret
    "الب ارسلان": 138171,  # Alparslan: Büyük Selçuklu
    "البربروس": 132752,  # Barbaroslar: Akdeniz'in Kılıcı
    "الصيف الاخير": 115464,  # Son Yaz
    "الطفل": 93196,  # Çocuk
    "الغرور": 219447,  # Ego
    "القلعة": 119806,  # Teşkilat
    "انا ام": 240335,  # Sandık Kokusu
    "انت من احببت": 306215,  # Sevdiğim Sensin
    "اوراق النسيان": 234669,  # Sarmaşık Zamanı
    "ثلاث اخوات": 158339,  # Üç Kız Kardeş
    "خير الدين بربروس": 216396,  # Barbaros Hayreddin: Sultanın Fermanı
    "ذات اخرى": 206180,  # Zeytin Ağacı
    "شخص اخر": 233314,  # Bambaşka Biri
    "صلاح الدين الايوبي": 232132,  # Kudüs Fatihi: Selahaddin Eyyubi
    "عيناك كالبحر الاسود": 297058,  # Gözleri Karadeniz
    "فريد": 210865,  # Yalı Çapkını
    "فندق الاحلام": 288472,  # Çift Kişilik Oda
    "كوبرا": 242073,  # Kübra
    "ماذا لو احببت كثيرا": 228979,  # Ya Çok Seversen
    "من التالي": 251883,  # Kimler Geldi Kimler Geçti
    "يوم اخر": 282224,  # Başka Bir Gün
    "اختر لك قمر": 0,  # Pakistani
}


def fold(text):
    """foldArabic() in app.js, plus punctuation."""
    text = re.sub("[ً-ْـ]", "", text)
    text = re.sub("[أإآ]", "ا", text).replace("ة", "ه").replace("ى", "ي")
    return re.sub(r"[^\w]+", " ", text).strip()


def get(url, headers=None):
    for attempt in range(6):
        time.sleep(PAUSE)
        try:
            req = urllib.request.Request(url, headers=headers or {})
            with urllib.request.urlopen(req, timeout=90) as res:
                return json.load(res), res.headers
        except urllib.error.HTTPError as err:
            if err.code == 400:  # past the last page
                break
            time.sleep((60 if err.code == 429 else 5) * (attempt + 1))
        except Exception:
            time.sleep(5 * (attempt + 1))
    return None, {}


def dubbed_posts():
    page, pages = 1, 1
    while page <= pages:
        query = urllib.parse.urlencode({"search": "مدبلج", "per_page": 100, "page": page, "_fields": "id,title"})
        posts, headers = get(f"{API}?{query}", {"User-Agent": UA})
        if not posts:
            break
        pages = int(headers.get("X-WP-TotalPages") or pages)
        yield from posts
        if page % 10 == 0:
            print(f"{page}/{pages}", flush=True)
        page += 1


def tmdb_ids(name, key):
    """TMDB ids of the Turkish series whose Arabic name is exactly `name`."""
    query = urllib.parse.urlencode({"api_key": key, "query": name, "language": "ar"})
    found, _ = get(f"{TMDB}/search/tv?{query}")
    return [
        r["id"]
        for r in (found or {}).get("results", [])
        if r.get("original_language") == "tr" and fold(r.get("name") or "") == fold(name)
    ]


def main():
    built = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
    key = re.search(r'TMDB_API_KEY = "(\w+)"', open("app.js", encoding="utf-8").read()).group(1)

    # title before "الحلقة" -> { episode number: post id }
    groups = {}
    for post in dubbed_posts():
        title = html.unescape(post["title"]["rendered"]).strip()
        m = EPISODE.match(title)
        if m and "مدبلج" in title:
            groups.setdefault(m.group(1), {}).setdefault(int(m.group(2)), post["id"])
    if not groups:
        sys.exit("No dubbed posts read; file left unchanged.")

    series, unmapped, resolved = {}, [], {}
    for title in sorted(groups, key=lambda t: -len(groups[t])):
        name = re.sub(r"\s*\(.*?\)", "", re.sub(r"^مسلسل\s+", "", title))
        name = re.sub(r"\s+مدبلج$", "", name).strip()
        season = SEASON.search(name)
        base = name[: season.start()] if season else name
        # "ما زلت في 17" ends in a number that is no season: the whole name is tried first.
        for candidate, number in ((name, 0), (base, int(season.group(1)) if season else 0)):
            if candidate not in resolved:
                resolved[candidate] = [OVERRIDES[candidate]] if candidate in OVERRIDES else tmdb_ids(candidate, key)
            if resolved[candidate]:
                break
        ids = [i for i in resolved[candidate] if i]
        if not ids:
            if resolved[candidate] != [0]:
                unmapped.append(f"{title} ({len(groups[title])} episodes)")
            continue
        for tmdb_id in ids:
            entry = series.setdefault(tmdb_id, {"names": [], "seasons": {}})
            if candidate not in entry["names"]:
                entry["names"].append(candidate)
            part = entry["seasons"].setdefault(number, {"titles": [], "eps": {}})
            # Two listings of one season are one season when their episodes
            # don't collide ("... موسم 2" 1-4 and another spelling 5-37);
            # otherwise the fuller one, read first, is kept.
            if part["eps"].keys() & groups[title].keys():
                print(f"dropped: {title} ({len(groups[title])} episodes, same numbers as {part['titles'][0]})")
                continue
            part["titles"].append(title)
            part["eps"].update(groups[title])

    index = {}
    for tmdb_id, entry in series.items():
        seasons = entry["seasons"]
        dub = []
        for number in sorted(seasons):
            eps = seasons[number]["eps"]
            label = f"Season {number or 1}" if len(seasons) > 1 or number else ""
            dub.append({"label": label, "titles": seasons[number]["titles"], "eps": [eps.get(n, 0) for n in range(1, max(eps) + 1)]})
        index[str(tmdb_id)] = {"names": entry["names"], "dub": dub}

    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"built": built, "series": index}, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    print(f"{len(index)} series, {sum(len(g) for g in groups.values())} dubbed episodes -> {OUT}")
    for line in unmapped:
        print("unmapped:", line)


if __name__ == "__main__":
    main()
