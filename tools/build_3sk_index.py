"""Builds 3sk-series.json: the Arabic-subtitled Turkish series on 3sk, by TMDB id.

3sk (3sk.quest) is the third source behind the "Turkish (Arabic subs)" server,
and the one tried first: it has a bare embed page per episode
(/?emb=true&id=<post id>&serv=0), so its player fills the stage without the
cropping the other two sites need. Every episode post names its series (a
"series" post on the site); a series is tied to its TMDB id by an exact match
on TMDB's Arabic name where that works -- the names are the ones Qissat Ishq
uses, so that script's OVERRIDES apply too -- else through SERIES below.

Run from the repo root to pick up new series and episodes (episodes already
in the file are not checked again, so a re-run is quick):

    python tools/build_3sk_index.py

--all lists the series it could not tie to TMDB; each needs a line in SERIES.

Output: 3sk-series.json ->
    { "<tmdb id>": [ { "season": 2,      (0: the series names no season)
                       "eps": [<post id of episode 1, 0 if missing>, ...] } ] }
"""

import concurrent.futures
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from build_qissa_index import OVERRIDES, fold

SITE = "https://3sk.quest"
API = f"{SITE}/wp-json/wp/v2"
TMDB = "https://api.themoviedb.org/3"
OUT = "3sk-series.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
EPISODE = re.compile(r"الحلق[ةه]\s+(\d+)")
SEASON = re.compile(r"\s+(?:ال)?(?:موسم|جزء)\s+(\S+)$")
SEASONS = {"الثاني": 2, "الثالث": 3, "الرابع": 4, "الخامس": 5, "السادس": 6, "السابع": 7}

# The site's series post id -> TMDB id, for the series TMDB's Arabic name
# doesn't lead to.
SERIES = {
    101: 119267,  # أخوتي -- Kardeşlerim
    8344: 218052,  # أميرة بلا تاج -- Taçsız Prenses
    16832: 321928,  # إسطنبول رأساً على عقب -- Altı Üstü İstanbul
    6653: 203572,  # اجمل منك -- Senden Daha Güzel
    886: 134840,  # اراضي بلا قانون -- Kanunsuz Topraklar
    5638: 195021,  # اسمه حب -- Adı Sevgi
    2544: 50323,  # اضنالي -- Adanalı
    14506: 299847,  # اطفال الجنة -- Cennetin Çocukları
    927: 112167,  # الاحترام -- Saygı
    5625: 157858,  # الاحلام والواقع -- Hayaller ve Hayatlar
    12499: 271596,  # الاستجواب -- Sorgu
    7804: 213974,  # الايام الجميلة -- Güzel Günler
    1170: 52645,  # التفاح الحرام الموسم الخامس -- Yasak Elma
    7404: 52645,  # التفاح الحرام الموسم السادس
    3019: 67570,  # الحب لا يفهم من الكلام -- Aşk Laftan Anlamaz
    14226: 284419,  # الزوجة الأخرى -- Kuma
    5900: 196437,  # السبورة السوداء -- Kara Tahta
    2146: 153515,  # السجين -- Mahkum
    256: 105052,  # السيد الخطأ -- Bay Yanlış
    7463: 210865,  # الطائر الرفراف -- Yalı Çapkını
    3073: 114973,  # العقرب -- Akrep
    6208: 195930,  # الغواصة ياكاموز S-245 -- Yakamoz S-245
    3032: 78058,  # الفناء -- Avlu
    6028: 196884,  # القاضي -- Hakim
    1022: 133020,  # الكاذب -- Yalancı
    1323: 134842,  # الكاذبون و شموعهم -- Yalancılar ve Mumları
    7267: 209144,  # المستاجر المثالي -- Kusursuz Kiracı
    14927: 302928,  # المشبوه -- Sakıncalı
    1816: 136125,  # الملهي -- Kulüp
    6711: 204634,  # النار التي بداخلنا -- İçimizdeki Ateş
    9460: 227170,  # النصيب -- Kısmet
    6937: 204925,  # الياقة المغبرة -- Tozluyaka
    89: 104877,  # انت اطرق بابي -- Sen Çal Kapımı
    3026: 69459,  # انت وطني -- Vatanım Sensin
    124: 117578,  # انتظرتك كثيراً -- Seni Çok Bekledim
    325: 123732,  # بيت من ورق -- Kağıt Ev
    15202: 309328,  # تحت الأرض -- Yeraltı
    7412: 210742,  # تلك الفتاة -- O Kız
    2878: 158339,  # ثلاثة اخوات -- Üç Kız Kardeş
    1082: 137713,  # ثلاثة قروش -- Üç Kuruş
    3063: 113720,  # جانبي الأيسر -- Sol Yanım
    8953: 224054,  # جول جمال -- Gülcemal
    2899: 157438,  # حاجي بايرام ولي -- Aşkın Yolculuğu: Hacı Bayram-ı Veli
    3022: 65555,  # حب اعمي -- Kara Sevda
    3028: 63549,  # حب للايجار -- Kiralık Aşk
    17594: 331926,  # حبي البحر الأسود -- Sevdam Karadeniz
    2993: 158427,  # حتى نفسي الاخير -- Son Nefesime Kadar
    9789: 233558,  # حجر الأمنيات -- Dilek Taşı
    7356: 211144,  # حكاية خرافية -- Bir Peri Masalı
    6861: 204365,  # حكاية وردة -- Gül Masalı
    7601: 212796,  # حياة اليوم -- Hayat Bugün
    888: 131814,  # حيوات مكسورة -- Kırık Hayatlar
    5848: 155367,  # دوران -- Duran
    9619: 49933,  # دون أن تشعر -- Ruhun Duymaz
    3052: 97296,  # زمهرير -- Zemheri
    40: 129953,  # سرنا نحن الاثنان -- İkimizin Sırrı
    6658: 203205,  # سيعجبك -- Seversin
    5957: 158809,  # عائلة اويصال -- Uysallar
    1620: 50734,  # عفت -- İffet
    7313: 211714,  # على مشارف الليل -- Gecenin Ucunda
    2191: 152500,  # عندما تختبئ امنا -- Annemizi Saklarken
    7694: 213059,  # فوضى عارمة -- Darmaduman
    6701: 203699,  # في السر و الخفاء -- Gizli Saklı
    3071: 109535,  # في السراء والضراء -- İyi Günde Kötü Günde
    16716: 320294,  # قانون الطبيعة -- Doğanın Kanunu
    1256: 64535,  # قطاع الطرق موسم 7 -- Eşkıya Dünyaya Hükümdar Olmaz
    1085: 82328,  # كان يا مكان في تشوكوروفا -- Bir Zamanlar Çukurova
    1276: 134155,  # كل ما يخص الزواج -- Evlilik Hakkında Her Şey
    3040: 90210,  # لا احد يعلم -- Kimse Bilmez
    13025: 277856,  # لا تبكي يا إسطنبول -- Sen Ağlama İstanbul
    1888: 152326,  # لعبة قدري -- Kaderimin Oyunu
    9509: 228979,  # ماذا لو أحببت كثيراً -- Ya Çok Seversen
    312: 108925,  # ماريا و مصطفى -- Maria ile Mustafa
    16281: 316474,  # ميرا: كأن كل شيء على ما يرام -- Mira: Her Şey Yolundaymış Gibi
    14484: 300388,  # ورود و ذنوب -- Güller ve Günahlar
    6706: 204487,  # وقت الحب -- Sevmek Zamanı
    12799: 276344,  # اتاتورك: 1881-1919 -- Atatürk 1881 - 1919
    8500: 218922,  # الأوغوز التسعة -- Dokuz Oğuz
    6459: 197679,  # أرشان كونيري -- Erşan Kuneri
    6967: 205204,  # آه أين -- Ah Nerede
    1656: 138418,  # الضيف -- Misafir
    8236: 216913,  # يوم الصفر -- Sıfırıncı Gün
    14318: 278006,  # رسائل الى المستقبل -- Geleceğe Mektuplar
    16964: 246471,  # لجوء -- Sığınak
    3061: 100553,  # اما الاستقلال او الموت -- Ya İstiklal Ya Ölüm
    12260: 270538,  # أرض الحب الجميل -- Güzel Aşklar Diyarı
    13211: 281280,  # أزهار الثلج -- Kardelenler
    8109: 216362,  # حظ حياتي -- Hayatımın Şansı
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


def tmdb_id(name, key):
    """TMDB id of the Turkish series whose Arabic name is exactly `name`, or 0."""
    query = urllib.parse.urlencode({"api_key": key, "query": name, "language": "ar"})
    found, _ = get(f"{TMDB}/search/tv?{query}")
    for result in (found or {}).get("results", []):
        if result.get("original_language") == "tr" and fold(result.get("name") or "") == fold(name):
            return result["id"]
    return 0


def has_player(post_id):
    page, _ = get(f"{SITE}/?emb=true&id={post_id}&serv=0", parse=False)
    return page is None or bool(re.search(r'<iframe[^>]+src="http', page))  # unreachable: left in


def main():
    key = re.search(r'TMDB_API_KEY = "(\w+)"', open("app.js", encoding="utf-8").read()).group(1)
    try:
        known = {i for parts in json.load(open(OUT, encoding="utf-8")).values() for part in parts for i in part["eps"] if i}
    except Exception:
        known = set()

    # site series id -> (TMDB id, season)
    where, unmapped = {}, []
    for post in pages("series", _fields="id,title"):
        name = re.sub(r"^مسلسل\s+", "", html.unescape(post["title"]["rendered"]).strip())
        name = re.sub(r"\s+(مترجم[ةه]?|مدبلج[ةه]?)$", "", name).strip()
        season = SEASON.search(name)
        number = SEASONS.get(season.group(1), 0) or (int(season.group(1)) if season and season.group(1).isdigit() else 0) if season else 0
        base = name[: season.start()] if season and number else name
        tmdb = SERIES.get(post["id"]) or OVERRIDES.get(base) or tmdb_id(base, key)
        if tmdb:
            where[str(post["id"])] = (tmdb, number)
        else:
            unmapped.append(f"{post['id']} {name}")

    series = {}
    for post in pages("posts", _fields="id,title,metadata"):
        m = EPISODE.search(html.unescape(post["title"]["rendered"]))
        home = where.get(str((post.get("metadata") or {}).get("series_id")))
        if m and home:
            series.setdefault(home[0], {}).setdefault(home[1], {}).setdefault(int(m.group(1)), post["id"])
    if not series:
        sys.exit("No series read; file left unchanged.")

    ids = sorted({i for seasons in series.values() for eps in seasons.values() for i in eps.values()} - known)
    print(f"checking {len(ids)} new episodes for a player", flush=True)
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        empty = {i for i, ok in zip(ids, pool.map(has_player, ids)) if not ok}
    print(f"{len(empty)} episodes have no player on the site and are left out")

    index = {}
    for tmdb, seasons in series.items():
        parts = [
            {"season": season, "eps": [0 if eps.get(n, 0) in empty else eps.get(n, 0) for n in range(1, max(eps) + 1)]}
            for season, eps in sorted(seasons.items())
            if set(eps.values()) - empty
        ]
        if parts:
            index[str(tmdb)] = parts
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(index, f, separators=(",", ":"), sort_keys=True)
    print(f"{len(index)} series, {sum(1 for parts in index.values() for part in parts for e in part['eps'] if e)} episodes -> {OUT}")
    if "--all" in sys.argv:
        for line in unmapped:
            print("unmapped:", line)


if __name__ == "__main__":
    main()
