"""Builds lodynet-series.json: the Turkish series on Lodynet, by TMDB id.

Lodynet is the second source behind the two Arabic servers (Qissat Ishq, see
build_qissa_index.py, is the first): it carries the older dubs and many
subtitled series that site doesn't. Every series (or season of one) is a
category under the site's "Turkish dubbed" or "Turkish subtitled" category.
A dubbed category is tied to its TMDB id and season by hand, in CATEGORIES
below; a subtitled one names the series in Latin script ("مسلسل رجل العصا Cop
Adam مترجم"), which is looked up on TMDB. This reads the episodes of those
categories through the site's public posts API and keeps the ones whose page
still offers the site's own "ViD LO" player, the one MTFlix frames.

Run from the repo root to pick up new series and episodes (episodes already
in the file are not checked again, so a re-run is quick):

    python tools/build_lodynet_index.py

A dubbed category it prints as "unmapped" needs a line in CATEGORIES;
--all also lists the subtitled categories TMDB didn't lead to.

Output: lodynet-series.json ->
    { "<tmdb id>": { "sub": [ <part>, ... ], "dub": [ <part>, ... ] } }
    part = { "season": 2,      (0: the category names no season)
             "eps": [<post id of episode 1, 0 if missing>, ...] }
"""

import concurrent.futures
import html
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

SITE = "https://lodynet.watch"
API = f"{SITE}/wp-json/wp/v2"
OUT = "lodynet-series.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
DUBBED = 12586  # "مسلسلات تركية مدبلجة"
SUBTITLED = 36  # "مسلسلات تركية مترجمة"
TMDB = "https://api.themoviedb.org/3"
LATIN = re.compile(r"[A-Za-zÇĞİÖŞÜçğıöşüâîû][A-Za-zÇĞİÖŞÜçğıöşüâîû0-9'.:&!?-]*")
SEASONS = {"الأول": 1, "الاول": 1, "الآول": 1, "الثاني": 2, "الثالث": 3, "الرابع": 4, "الخامس": 5, "السادس": 6, "السابع": 7}
SEASON = re.compile(r"(?:الموسم|الجزء)\s+(\S+)")
VIDLO = '"Id":116413'  # the site's own player in a page's server list
EPISODE = re.compile(r"(?:ال)?حلقة\s+(\d+)")

# Lodynet category id -> (TMDB id, season). 0 = skip (not identified).
CATEGORIES = {
    8906: (66017, 0),  # قيامة أرطغرل -- Diriliş: Ertuğrul
    43430: (87623, 0),  # زهرة الثالوث -- Hercai
    16369: (64535, 0),  # قطاع الطرق -- Eşkıya Dünyaya Hükümdar Olmaz
    31002: (64535, 3),  # قطاع الطرق الجزء الثالث
    32398: (77026, 0),  # البحر الأسود -- Sen Anlat Karadeniz
    25761: (66088, 0),  # أغنية الحياة -- Hayat Şarkısı
    15168: (71591, 1),  # العروس الجديدة -- Yeni Gelin
    27219: (71591, 2),
    20352: (63030, 0),  # فيلينتا -- Filinta
    35832: (104877, 0),  # أطرق بابي -- Sen Çal Kapımı
    36506: (108179, 0),  # اتصل بوكيلي -- Menajerimi Ara
    39443: (97852, 0),  # رامو -- Ramo
    7024: (64164, 0),  # بنات الشمس -- Güneşin Kızları
    8480: (63549, 1),  # حب للأيجار -- Kiralık Aşk
    13560: (63549, 2),
    40132: (110655, 0),  # نهضة السلاجقة العظمى -- Uyanış: Büyük Selçuklu
    13751: (68848, 0),  # جسور والجميلة -- Cesur ve Güzel
    20384: (67570, 0),  # الحب لا يفهم الكلام -- Aşk Laftan Anlamaz
    39107: (82345, 0),  # غولبري -- Gülperi
    15073: (83738, 0),  # علمني كيف أحب -- Bana Sevmeyi Anlat
    1668: (62217, 1),  # موسم الكرز -- Kiraz Mevsimi
    4819: (62217, 2),
    39856: (95603, 0),  # المؤسس عثمان -- Kuruluş Osman
    29624: (83584, 0),  # اصطدام -- Çarpışma
    45036: (137840, 0),  # عزيز -- Aziz
    30011: (90271, 0),  # كذبتي الجميلة -- Benim Tatlı Yalanım
    51664: (204925, 0),  # أصدقاء العمر -- Tozluyaka
    1541: (50236, 1),  # ورد وشوك -- Karagül
    1549: (50236, 2),
    1375: (50236, 3),
    4969: (50236, 4),
    16780: (67611, 0),  # الطبقة المخملية -- Yüksek Sosyete
    47203: (153515, 1),  # محكوم -- Mahkum
    53367: (153515, 2),
    4726: (47711, 3),  # أسميتها فريحة الموسم الثالث -- Adını Feriha Koydum
    4252: (69322, 0),  # صدفة (رائحة الفراولة) -- Çilek Kokusu
    15141: (69535, 0),  # قلب المدينة -- Bu Şehir Arkandan Gelecek
    15177: (67643, 0),  # شمس الشتاء -- Kış Güneşi
    6692: (68348, 0),  # عطر الأمس - ملكة الليل -- Gecenin Kraliçesi
    54823: (213059, 0),  # الجيل الثالث -- Darmaduman
    4906: (66124, 1),  # لعبة القدر -- O Hayat Benim
    5169: (66124, 2),
    5824: (66124, 3),
    4793: (66124, 4),
    4650: (78028, 0),  # مارال -- Maral: En Güzel Hikayem
    54493: (212796, 0),  # لعبة الحياة -- Hayat Bugün
    35141: (105052, 0),  # الرجل الخطأ -- Bay Yanlış
    44367: (80229, 0),  # لا تترك يدي -- Elimi Bırakma
    35045: (97296, 0),  # زمهرير -- Zemheri
    17393: (76783, 1),  # دموع جنات -- Cennet'in Gözyaşları
    29639: (76783, 2),
    31101: (76783, 3),
    31383: (76783, 4),
    41167: (125262, 0),  # أسقف زجاجية -- Cam Tavanlar
    41441: (117829, 0),  # البراءة -- Masumiyet
    34932: (78058, 0),  # هوانم سجن النساء -- Avlu
    25015: (79026, 1),  # الحامي -- Hakan: Muhafız
    28607: (79026, 2),
    32916: (79026, 3),
    35428: (79026, 4),
    57658: (214078, 0),  # شاهماران -- Şahmaran
    52361: (206180, 1),  # ذات أخرى -- Zeytin Ağacı
    48207: (157219, 1),  # منتصف الليل في قصر بيرا بالاس -- Pera Palas'ta Gece Yarısı
    34015: (100897, 1),  # عشق 101 -- Aşk 101
    44179: (100897, 2),
    32000: (96348, 1),  # عطايا -- Atiye
    36813: (96348, 2),
    41346: (96348, 3),
    39038: (115970, 0),  # 50 متر مربع -- 50M²
    37893: (112745, 0),  # طيف إسطنبول -- Bir Başkadır
    34923: (82007, 0),  # دماء أبدية في عروق تركية -- Yaşamayanlar
    35103: (69786, 0),  # تلك الليلة -- Masum
    44958: (136125, 1),  # الملهي -- Kulüp
    46776: (136125, 2),
    40317: (123138, 0),  # فاطمة -- Fatma
    34906: (75365, 0),  # الذئب -- Börü
    43431: (126248, 0),  # جرح القلب -- Kalp Yarası
    34914: (0, 0),  # الإشتباه
    32991: (0, 0),  # الأخوات
    53308: (0, 0),  # الجار المثالي
    41913: (0, 0),  # الفراغ
    7074: (0, 0),  # ثأر الأخوة
    12107: (0, 0),  # زواج مصلحة
    27237: (0, 0),  # في قلبي للأبد
    5433: (0, 0),  # عشق
    35327: (0, 0),  # مريم
}


def get(url, parse=True):
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as res:
                body = res.read().decode("utf-8", "replace")
                return (json.loads(body) if parse else body), res.headers
        except urllib.error.HTTPError as err:
            if err.code == 400:  # past the last page
                break
            time.sleep((60 if err.code == 429 else 5) * (attempt + 1))
        except Exception:
            time.sleep(5 * (attempt + 1))
    return None, {}


def pages(path, **query):
    page, total = 1, 1
    while page <= total:
        found, headers = get(f"{API}/{path}?" + urllib.parse.urlencode({**query, "per_page": 100, "page": page}))
        if not found:
            break
        total = int(headers.get("X-WP-TotalPages") or total)
        yield from found
        page += 1


def slug(name):
    """turkishSlug() in app.js."""
    name = re.sub("[İIı]", "i", name).lower()
    name = "".join(c for c in unicodedata.normalize("NFD", name) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", name).strip("-")


def tmdb_id(title, key):
    """TMDB id of the Turkish series with this (often accent-less) title, or 0."""
    query = urllib.parse.urlencode({"api_key": key, "query": title})
    found, _ = get(f"{TMDB}/search/tv?{query}")
    for result in (found or {}).get("results", []):
        if result.get("original_language") == "tr" and slug(title) in (slug(result.get("original_name") or ""), slug(result.get("name") or "")):
            return result["id"]
    return 0


def subtitled(cat, key):
    """(TMDB id, season) of a subtitled category, from the Latin-script title in its name."""
    name = html.unescape(cat["name"])
    season = SEASON.search(name)
    title = " ".join(w for w in LATIN.findall(name) if not re.fullmatch(r"(19|20)\d\d", w))
    if len(title) < 2:
        return 0, 0
    return tmdb_id(title, key), SEASONS.get(season.group(1), 0) if season else 0


def has_player(post_id):
    page, _ = get(f"{SITE}/?p={post_id}", parse=False)
    return page is None or VIDLO in page  # unreachable: left in rather than dropped


def main():
    key = re.search(r'TMDB_API_KEY = "(\w+)"', open("app.js", encoding="utf-8").read()).group(1)
    try:
        old = json.load(open(OUT, encoding="utf-8"))
        known = {i for entry in old.values() for kind in ("sub", "dub") for part in entry[kind] for i in part["eps"] if i}
    except Exception:
        known = set()

    # tmdb id -> kind -> season -> { episode number: post id }
    series, unmapped = {}, []
    for kind, parent in (("dub", DUBBED), ("sub", SUBTITLED)):
        for cat in pages("categories", parent=parent, _fields="id,name,count"):
            if not cat["count"]:
                continue
            if kind == "sub":
                tmdb, season = subtitled(cat, key)
            elif cat["id"] in CATEGORIES:
                tmdb, season = CATEGORIES[cat["id"]]
            else:
                tmdb, season = 0, 0
                unmapped.append(f"dub {cat['id']} {cat['name']} ({cat['count']} episodes)")
            if not tmdb:
                if kind == "sub" and "--all" in sys.argv:
                    unmapped.append(f"sub {cat['id']} {cat['name']} ({cat['count']} episodes)")
                continue
            eps = series.setdefault(tmdb, {"sub": {}, "dub": {}})[kind].setdefault(season, {})
            for post in pages("posts", categories=cat["id"], _fields="id,title"):
                m = EPISODE.search(html.unescape(post["title"]["rendered"]))
                if m:
                    eps.setdefault(int(m.group(1)), post["id"])
            print(f"{kind} {cat['name']}: {len(eps)}", flush=True)
    if not series:
        sys.exit("No series read; file left unchanged.")

    ids = sorted({i for entry in series.values() for kind in ("sub", "dub") for eps in entry[kind].values() for i in eps.values()} - known)
    print(f"checking {len(ids)} new episodes for a player", flush=True)
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        empty = {i for i, ok in zip(ids, pool.map(has_player, ids)) if not ok}
    print(f"{len(empty)} episodes have no player on the site and are left out")

    index = {}
    for tmdb, entry in series.items():
        parts = {
            kind: [
                {"season": season, "eps": [0 if eps.get(n, 0) in empty else eps.get(n, 0) for n in range(1, max(eps) + 1)]}
                for season, eps in sorted(entry[kind].items())
                if set(eps.values()) - empty
            ]
            for kind in ("sub", "dub")
        }
        if parts["sub"] or parts["dub"]:
            index[str(tmdb)] = parts
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(index, f, separators=(",", ":"), sort_keys=True)
    count = lambda kind: sum(1 for entry in index.values() for part in entry[kind] for e in part["eps"] if e)
    print(f"{len(index)} series, {count('sub')} subtitled and {count('dub')} dubbed episodes -> {OUT}")
    for line in unmapped:
        print("unmapped:", line)


if __name__ == "__main__":
    main()
