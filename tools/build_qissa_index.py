"""Builds qissa-series.json: every Turkish series on Qissat Ishq, by TMDB id.

The site files episodes under its own Arabic series names, splits some series
into seasons with separate numbering ("مسلسل اخوتي موسم 2 الحلقة 5 مدبلجة")
and rarely spells a name the way TMDB does. So this reads the title of every
post through the site's public posts API, groups the subtitled and the dubbed
episodes per series and season, and ties each series to its TMDB id: by an
exact match on TMDB's Arabic name where that works, else through OVERRIDES
below.

Run from the repo root to pick up new series (new episodes of the series
already listed are found live by the app, see loadNewQissaEpisodes in app.js):

    python tools/build_qissa_index.py

A dubbed series it prints as "unmapped" needs a line in OVERRIDES. The site
also carries Arabic series, so unmapped subtitled ones are only listed with
--all.

Output: qissa-series.json ->
    { "built": "<ISO date>",
      "series": { "<tmdb id>": { "names": ["<Arabic name>", ...],
                                 "sub": [ <part>, ... ], "dub": [ <part>, ... ] } } }
    part = { "season": 2,            (0: the listing names no season)
             "titles": ["<title before الحلقة>", ...],
             "eps": [<post id of episode 1, 0 if missing or without a video>, ...] }
"""

import concurrent.futures
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
# What the site's own watch page calls to load a post's first video server.
EMBED = "https://new.eishq.net/wp-content/themes/vo2023/temp/ajax/iframe2.php?video=0&serverId=29&id="
TMDB = "https://api.themoviedb.org/3"
OUT = "qissa-series.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
PAUSE = 0.5

# "<series, maybe with its season> الحلقة <n> ..." -- with the site's typos.
EPISODE = re.compile(r"^(.+?)\s+(?:الحلق[ةه]|الخلقة|الحلفة)\s+(\d+)")
SEASON = re.compile(r"\s+(?:(?:ال)?(?:موسم|جزء)\s+)?(\d+|الثاني|الثالث)$")
ORDINALS = {"الثاني": 2, "الثالث": 3}

# Site name (no "مسلسل", season or bracketed alias) -> TMDB id, for the series
# TMDB's own Arabic name doesn't lead to. 0 = not a Turkish series, skip.
OVERRIDES = {
    "ابواب القدر": 253808,  # Zamanın Kapıları
    "اخوتي": 119267,  # Kardeşlerim
    "اخي": 306529,  # A.B.İ.
    "اذا خسر الملك": 280777,  # Kral Kaybederse
    "اسرار البيوت": 233492,  # Kirli Sepeti
    "اسرار اللؤلؤ": 243832,  # İnci Taneleri
    "اسطنبول الضالمة": 88024,  # Zalim İstanbul
    "اسمي ملك": 94607,  # Benim Adım Melek
    "الاخوة بربروس": 132752,  # Barbaroslar: Akdeniz'in Kılıcı
    "الاسيرة": 215709,  # Esaret
    "الامير": 228853,  # Prens
    "الب ارسلان": 138171,  # Alparslan: Büyük Selçuklu
    "البراعم الحمراء": 241020,  # Kızıl Goncalar
    "البربروس": 132752,  # Barbaroslar: Akdeniz'in Kılıcı
    "الحب الافلاطوني": 278011,  # Platonik
    "الحسد": 300030,  # Kıskanmak
    "السلة المتسخة": 233492,  # Kirli Sepeti
    "الصيف الاخير": 115464,  # Son Yaz
    "الطفل": 93196,  # Çocuk
    "العاب القدر": 239492,  # Kader Oyunları
    "الغدار": 240798,  # Gaddar
    "الغرور": 219447,  # Ego
    "القلعة": 119806,  # Teşkilat
    "الموازين": 251317,  # Dengeler: Biri Olmak
    "انا ام": 240335,  # Sandık Kokusu
    "انا امها": 301899,  # Ben Onun Annesiyim
    "انا ليمان": 301213,  # Ben Leman
    "انت من احب": 306215,  # Sevdiğim Sensin
    "انت من احببت": 306215,  # Sevdiğim Sensin
    "انه حب": 244340,  # Bir Sevdadır
    "انها حكايتك يا شولي": 323385,  # Şule: Senin Hikâyen
    "اوراق النسيان": 234669,  # Sarmaşık Zamanı
    "ايام جميلة": 213974,  # Güzel Günler
    "بهار": 245914,  # Bahar
    "بين الجنة والنار": 306118,  # Arafta
    "ثلاث اخوات": 158339,  # Üç Kız Kardeş
    "جبل جونول": 111685,  # Gönül Dağı
    "حال ليلى": 322554,  # Leyla Hâli
    "حب محتمل": 322499,  # Muhtemel Aşk
    "حب منطق انتقام": 127588,  # Aşk Mantık İntikam
    "حب ودموع": 298792,  # Aşk ve Gözyaşı
    "حبات اللؤلؤ": 243832,  # İnci Taneleri
    "خبئني": 238711,  # Sakla Beni
    "خفقان": 297751,  # Çarpıntı
    "خير الدين بربروس": 216396,  # Barbaros Hayreddin: Sultanın Fermanı
    "دون ان تشعر": 49933,  # Ruhun Duymaz
    "دين الروح": 278693,  # Can Borcu
    "ذات اخرى": 206180,  # Zeytin Ağacı
    "رائحة الصندوق": 240335,  # Sandık Kokusu
    "رو": 253645,  # RU
    "شخص اخر": 233314,  # Bambaşka Biri
    "صلاح الدين الايوبي": 232132,  # Kudüs Fatihi: Selahaddin Eyyubi
    "طائر الصباح – الطائر المبكر": 80411,  # Erkenci Kuş
    "عائلتي الجميلة": 228454,  # Benim Güzel Ailem
    "عديم الضمير": 305469,  # Vicdansız
    "عمر": 217980,  # Ömer
    "عيناك كالبحر الاسود": 297058,  # Gözleri Karadeniz
    "غرفة لشخصين": 288472,  # Çift Kişilik Oda
    "غسال": 280030,  # Gassal
    "فاتح القدس صلاح الدين الايوبي": 232132,  # Kudüs Fatihi: Selahaddin Eyyubi
    "فرحة حياتي": 229314,  # Hayatımın Neşesi
    "فريد": 210865,  # Yalı Çapkını
    "فندق الاحلام": 288472,  # Çift Kişilik Oda
    "في السابعة عشر": 317883,  # Daha 17
    "كان يا ما كان في اسطنبول": 281746,  # Bir Zamanlar İstanbul
    "كما لو لم يكن هناك غد": 245238,  # Yarın Yokmuş Gibi
    "كوبرا": 242073,  # Kübra
    "لا تبكي يا اسطنبول": 277856,  # Sen Ağlama İstanbul
    "لا تخف انا بجانبك": 248029,  # Korkma Ben Yanındayım
    "لدي هم": 238859,  # Bir Derdim Var
    "ماذا لو احببت كثيرا": 228979,  # Ya Çok Seversen
    "مارنالي": 273940,  # Marnalı
    "من التالي": 251883,  # Kimler Geldi Kimler Geçti
    "من يقع بنفسه لا يبكي": 228980,  # Kendi Düşen Ağlamaz
    "ميرا كأن كل شيء على ما يرام": 316474,  # Mira: Her Şey Yolundaymış Gibi
    "ولي العهد": 296502,  # Veliaht
    "يوم اخر": 282224,  # Başka Bir Gün
    "اختر لك قمر": 0,  # Pakistani
}


def fold(text):
    """foldArabic() in app.js, plus punctuation."""
    text = re.sub("[ً-ْـ]", "", text)
    text = re.sub("[أإآ]", "ا", text).replace("ة", "ه").replace("ى", "ي")
    return re.sub(r"[^\w]+", " ", text).strip()


def get(url, headers=None, pause=PAUSE):
    for attempt in range(6):
        time.sleep(pause)
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


def all_posts():
    page, pages = 1, 1
    while page <= pages:
        query = urllib.parse.urlencode({"per_page": 100, "page": page, "_fields": "id,title"})
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
    found, _ = get(f"{TMDB}/search/tv?{query}", pause=0.1)
    return [
        r["id"]
        for r in (found or {}).get("results", [])
        if r.get("original_language") == "tr" and fold(r.get("name") or "") == fold(name)
    ]


def has_video(post_id):
    """False for a post the site published without a video: its watch page is an empty player."""
    for attempt in range(4):
        try:
            req = urllib.request.Request(f"{EMBED}{post_id}", headers={"User-Agent": UA, "Referer": "https://new.eishq.net/", "X-Requested-With": "XMLHttpRequest"})
            with urllib.request.urlopen(req, timeout=60) as res:
                return "<iframe" in res.read().decode("utf-8", "replace")
        except Exception:
            time.sleep(5 * (attempt + 1))
    return True  # unreachable: left in rather than dropped on a network error


def main():
    built = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
    key = re.search(r'TMDB_API_KEY = "(\w+)"', open("app.js", encoding="utf-8").read()).group(1)

    # (kind, title before "الحلقة") -> { episode number: post id }
    groups = {}
    for post in all_posts():
        title = html.unescape(post["title"]["rendered"]).strip()
        m = EPISODE.match(title)
        if m:
            kind = "dub" if "مدبلج" in title else "sub"
            groups.setdefault((kind, m.group(1)), {}).setdefault(int(m.group(2)), post["id"])
    if not groups:
        sys.exit("No posts read; file left unchanged.")

    series, unmapped, resolved = {}, [], {}
    for kind, title in sorted(groups, key=lambda g: -len(groups[g])):
        eps = groups[(kind, title)]
        name = re.sub(r"\s*\(.*?\)", "", re.sub(r"^مسلسل\s+", "", title))
        # "القضاء Yargi", "خبئني مترجم", "الغرور مدبلج"
        name = re.sub(r"(\s+(مدبلج|مترجم|[A-Za-z]+))+$", "", name).strip()
        season = SEASON.search(name)
        base = name[: season.start()] if season else name
        number = (ORDINALS.get(season.group(1)) or int(season.group(1))) if season else 0
        # "ما زلت في 17" ends in a number that is no season: the whole name is tried first.
        for candidate, part_season in ((name, 0), (base, number)):
            if candidate not in resolved:
                resolved[candidate] = [OVERRIDES[candidate]] if candidate in OVERRIDES else tmdb_ids(candidate, key)
            if resolved[candidate]:
                break
        ids = [i for i in resolved[candidate] if i]
        if not ids:
            if resolved[candidate] != [0] and (kind == "dub" or "--all" in sys.argv):
                unmapped.append(f"{kind} {title} ({len(eps)} episodes)")
            continue
        for tmdb_id in ids:
            entry = series.setdefault(tmdb_id, {"names": [], "sub": {}, "dub": {}})
            if candidate not in entry["names"]:
                entry["names"].append(candidate)
            part = entry[kind].setdefault(part_season, {"titles": [], "eps": {}})
            # Two listings of one season are one season when their episodes
            # don't collide ("... موسم 2" 1-4 and another spelling 5-37);
            # otherwise the fuller one, read first, is kept.
            if part["eps"].keys() & eps.keys():
                print(f"dropped: {kind} {title} ({len(eps)} episodes, same numbers as {part['titles'][0]})")
                continue
            part["titles"].append(title)
            part["eps"].update(eps)

    # About one episode in twenty-five is a post without a video behind it.
    ids = sorted({i for entry in series.values() for kind in ("sub", "dub") for part in entry[kind].values() for i in part["eps"].values()})
    print(f"checking {len(ids)} episodes for a video", flush=True)
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        empty = {i for i, ok in zip(ids, pool.map(has_video, ids)) if not ok}
    print(f"{len(empty)} episodes have no video on the site and are left out")

    index = {}
    for tmdb_id, entry in series.items():
        index[str(tmdb_id)] = {"names": entry["names"]}
        for kind in ("sub", "dub"):
            index[str(tmdb_id)][kind] = [
                {"season": number, "titles": part["titles"], "eps": [0 if part["eps"].get(n, 0) in empty else part["eps"].get(n, 0) for n in range(1, max(part["eps"]) + 1)]}
                for number, part in sorted(entry[kind].items())
                if part["eps"].values() - empty
            ]

    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"built": built, "series": index}, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    episodes = {kind: sum(len(g) for (k, _), g in groups.items() if k == kind) for kind in ("sub", "dub")}
    print(f"{len(index)} series ({episodes['sub']} subtitled and {episodes['dub']} dubbed episodes read) -> {OUT}")
    for line in unmapped:
        print("unmapped:", line)


if __name__ == "__main__":
    main()
