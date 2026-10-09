# MTFlix.com — Movie & TV Streaming Site

A Netflix-style movie/TV browse site built with plain **HTML/CSS/JavaScript**, powered by live data from [TMDB](https://www.themoviedb.org).

## Features

- Hero banner with auto-rotating trending titles + trailer playback
- Horizontal scrolling rows: Trending, Popular, Top Rated, by genre, and more
- Full search (movies, TV) with debounced results grid
- Detail modal with overview, cast, genres, ratings, YouTube trailer, "More Like This"
- Personal watchlist ("My List") saved in your browser via localStorage
- Responsive dark theme for desktop / tablet / mobile
- First-run setup screen for entering your TMDB API key (stored locally)

## Quick Start

1. Open `index.html` in any modern browser. That's it.

## Getting a TMDB API Key

The site needs a free TMDB API key to load real data:

1. Create a free account at [themoviedb.org/signup](https://www.themoviedb.org/signup)
2. Go to [Settings → API](https://www.themoviedb.org/settings/api) and choose **Create → Developer**
3. Copy the **API Key (v3 auth)** value
4. When you first open the site, paste the key into the setup screen — it's saved in your browser's localStorage

**Alternative:** hardcode it on line 3 of `app.js`:

```js
const TMDB_API_KEY = "paste_your_key_here";
```

## Optional: run a local server

Not required, but handy during development:

```bash
npx serve .
```

or with Python:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000` (or `:3000` for serve).

## Accounts & Tracking

- **Sign up / Sign in** with email + password via **Firebase Authentication** — real accounts that sync across devices — or **continue as guest** for instant access with no sign-up
- **Email verification:** sign-up (and any sign-in until verified) requires a 6-digit code emailed to you — codes expire after 10 minutes and can be resent
- **Profiles** ("Who's watching?") are an account-only feature — creating one requires signing up. Guests skip the picker entirely and land straight in the app on a single implicit profile, with no "Manage Profiles" / "Switch Profile" options
- **Tracking:** open any title and set a status (Plan to Watch / Watching / Completed / On Hold / Dropped) and a 5-star rating
- The **My List** page has tabs: *Watchlist* (saved titles) and *Tracking* (grouped by status, with ratings and progress bars)
- Account/profile data is synced to Firestore and cached in your browser's localStorage

### Sending verification codes (EmailJS)

By default, no email keys are configured, so the code is shown on-screen in a simulated demo inbox (handy for local testing — no setup needed). To actually email the code:

1. Create a free account at [emailjs.com](https://www.emailjs.com/) (free tier: 200 emails/month)
2. Add an **Email Service** (e.g. connect your Gmail) — copy its **Service ID**
3. Create an **Email Template** with variables `{{to_email}}`, `{{code}}`, `{{minutes}}` in the body — copy its **Template ID**
4. Copy your **Public Key** from Account → General
5. Paste all three into `app.js` near the top:

```js
const EMAILJS_PUBLIC_KEY = "your_public_key";
const EMAILJS_SERVICE_ID = "your_service_id";
const EMAILJS_TEMPLATE_ID = "your_template_id";
```

No backend or Node.js required — EmailJS sends directly from the browser. If sending ever fails (offline, quota hit), the site falls back to showing the code on-screen so you're never locked out.

**Security note:** the code is generated and checked entirely in the browser, and "verified" is a flag on your Firestore user document. This is fine for a personal/demo project, but it is not tamper-proof — someone with dev tools access to their own account could flip their own flag without ever seeing the email. A fully tamper-proof version would check the code server-side in a Firebase Cloud Function, which requires Node.js, the Firebase CLI, and upgrading the Firebase project to the Blaze (pay-as-you-go) plan.

## Profiles

- **Edit profiles:** Manage Profiles → click a profile (✎) to change its **name** and **picture** — pick a color or generate random avatar pictures (DiceBear); 🎲 Random reshuffles them
- **Profile PIN:** Privacy & Security in Settings lets you protect any profile with a 4-digit PIN (🔒 badge on the picker)
- Each account owns its own profiles; each profile has its own My List, watch progress, and Continue Watching row
- Switch profiles anytime via the avatar menu

## Settings

Opened from the avatar menu → Settings:

- **Playback** — toggle auto-play next episode
- **Language** — English, Español, Français, Deutsch, Português, Türkçe; UI strings and TMDB movie data update instantly
- **Privacy & Security** — set/change/disable your profile PIN, and change your account password

The site opens with a **"Who's watching?"** profile picker, just like Netflix:

- Create profiles with a name and avatar color (Manage Profiles → delete with ✕)
- Each profile has its own **My List**, **watch progress**, and **Continue Watching** row
- Switch profiles anytime via the avatar in the top-right corner
- All data is stored locally in your browser (localStorage) — no backend needed

## Playback Servers

Movies and TV shows stream through an embed player inside the detail modal. Three sources are configured in `app.js` (`PLAYER_SOURCES`), with a small switcher pinned to the top-left of the player so you can flip between them mid-playback if one is slow or down:

| Source | Default | Quality | Live progress events |
|--------|---------|---------|------------------------|
| **CineSrc 4K** | ✓ main (non-Turkish) | Up to 4K, multi-server fallback inside the player | Yes — sends `cinesrc:*` postMessages (timeupdate/play/pause/ended/seeked); accepts `t=` (resume), `color=` and `autonext=` params |
| **Turkish (Arabic subs)** | ✓ auto for Turkish series it has | Varies (576p seen) | No |
| **Arabic dubbed** | picked from the "Arabic dubbed" row | Varies (576p seen) | No |
| MultiEmbed | | Up to 1080p | No |
| VidSrc | | Up to 1080p | No — confirmed it sends no postMessages at all |

**Turkish series** (`original_language: tr`) play from the two Arabic servers below when those have them; every other Turkish episode and all Turkish movies start on CineSrc like everything else. VidLink, VidRock, VidZee and a VoE-based "Turkish (Full)" server were each tried as a Turkish server in October 2026 and removed again at the owner's request.

**Turkish (Arabic subs)** and **Arabic dubbed** both come from the Qissat Ishq site (`new.eishq.net`), which titles every episode `مسلسل <Arabic name> الحلقة <n> مترجمة` (original audio, Arabic subtitles) or `… مدبلجة` (Arabic dub). For the subtitled server, when a Turkish series opens MTFlix looks the episode up in the index below; for a series the index does not list it takes the Arabic name from TMDB, searches that site's public WordPress posts API for the episode (absolute episode number) and frames the site's own watch page. The frame is laid out at a fixed 1000px width, then scaled and shifted so that only the page's video player fills the stage (`QISSA_FRAME` in `app.js` holds the measured position); the rest of the page is clipped and cannot be scrolled to. If the site changes its layout those numbers need re-measuring. A Turkish episode found there starts on Turkish (Arabic subs); if not, on CineSrc. When the site has a dub of the series, it plays **in Arabic by default**: a voice row under the player picks the dubbed season and episode (with Next) and offers **Switch to Turkish**, which is remembered per series; in Turkish the row offers **Switch to Arabic**. The season/episode list always stays: it lists the Turkish broadcast, so picking an episode from it plays that original episode (Arabic subtitles) without changing the series' default voice. Dubbed episodes are cut and numbered differently from the Turkish broadcast (Uzak Şehir: 67 original episodes, 331 dubbed), so they are chosen from that row, not from the normal episode list, and the last dubbed episode played is remembered per series. Limits: series only and no progress events.

**A second source, Lodynet** (`lodynet.watch`), carries the older dubs Qissat Ishq doesn't (Diriliş Ertuğrul, Hercai, Kiralık Aşk, Sen Çal Kapımı and some fifty more) and several hundred subtitled series. `lodynet-series.json`, built by `tools/build_lodynet_index.py`, lists its episodes per TMDB id: a dubbed category of the site is tied to its TMDB id by hand in the script's `CATEGORIES` table, a subtitled one through the Latin-script title in its name. **Arabic dubbed** uses whichever site has more of a series; **Turkish (Arabic subs)** looks an episode up on Qissat Ishq first, then on Lodynet. Lodynet's page is framed the same way, opened at its player's anchor (`#IframeWetch`) and cropped to the player (`FRAMED_SITES` in `app.js`), where the site's own "ViD LO" player loads by itself; the other video hosts its pages list are mostly dead. Every Turkish series shows the voice row under the player, so it is plain whether a dub or subtitles exist for it; a dub exists only for series that were dubbed at all, and neither site has every episode.

**Which series the two servers have** comes from `qissa-series.json`, built by `tools/build_qissa_index.py`: it reads the title of every post on the site, groups the subtitled and the dubbed episodes per series and season (the site numbers some seasons separately and runs others straight on) and ties each series to its TMDB id — by TMDB's Arabic name where that matches exactly, else through the `OVERRIDES` table in the script, because the site rarely spells a name the way TMDB does. The index holds the site's names and the post id of every episode (177 Turkish series in October 2026: 165 subtitled, 84 dubbed). The build also asks the site, for every episode, whether a video is behind it: about one post in twenty-five is an empty player (580 of 14,229 in October 2026, most of them dubbed — Bahar's dub has 5 of 181), and those are left out so the app never offers them. A dub with under half its episodes left is offered through **Switch to Arabic** but is not the default voice. Episodes posted after the build are picked up live by the app, so the index only needs rebuilding when the site adds a new series: run `python tools/build_qissa_index.py`, add an `OVERRIDES` line for anything it prints as `unmapped` (`--all` also lists the unmapped subtitled names, most of which are the site's Arabic series), and push. A Turkish series the index doesn't list is still searched for live under its TMDB Arabic name. The site mostly carries series from 2019 on; an older one it doesn't have (Bir Zamanlar Çukurova, for one) plays on CineSrc.


The player iframe grants fullscreen to all origins (`allow="fullscreen *"`): MultiEmbed's and VidSrc's videos play through nested cross-origin iframes inside their embeds, and a bare `allow="fullscreen"` (which also overrides `allowfullscreen`) silently denies those nested frames — their own fullscreen buttons did nothing. The wildcard delegates the permission down the whole frame tree, so their native buttons work.

CineSrc is the only source that reports live progress events, so resume points, Continue Watching accuracy and auto-advance work best on it.

2Embed was removed in September 2026 (redundant with the other VidSrc-family sources). Videasy, VidZee, VidSrc Pro and VidFast were added in September 2026 as HD experiments and removed the same month at the owner's request (the old low-quality complaints turned out to be per-title, and CineSrc's feature set — real resume points and auto-advance — mattered more). Vidking was removed in September 2026 — the provider was reported to be shutting down. VidLink was removed then as well.

VidSrc's own player hides a server picker (Pro Multi / Cinesrc / 4K) inside its iframe where it can't be reached, so those are recreated as a **nested SERVER dropdown** that appears on the watch page when VidSrc is the active source. Each name maps to a different live VidSrc-family mirror so switching actually changes the stream: **Pro Multi** → `v2.vidsrc.me`, **Cinesrc** → `vidsrc.su`, **4K** → `vidsrc.to`. Switching sources or mirrors is always manual — if one is down, pick another from the dropdown.

A manual server switch only applies to the title you're currently watching and is kept in memory, not `localStorage`: closing the player (or opening a different title) always starts back on the default (CineSrc 4K). To add another provider, add an entry to `PLAYER_SOURCES` with `movie`/`tv` URL templates (`{id}`/`{season}`/`{episode}` placeholders) and a `buildParams()` function for any query params it needs.

CineSrc auto-advances to the next episode inside its own player, so MTFlix's silent auto-advance is disabled for it (`hasInternalAutoNext`) to keep the two systems from racing — the manual "Next Episode" button still appears.

- **Continue Watching** works on all sources. A 15-second wall-clock heartbeat estimates elapsed watch time (using TMDB's runtime as the target duration) as a baseline that doesn't depend on the player sending anything at all; on CineSrc, its real progress events layer on top of that for more accurate resume points and season/episode tracking.
- A small status chip (bottom-left) shows live player state (`#messageArea`) when the active source sends progress events.

## Project Structure

| File | Purpose |
|------|---------|
| `index.html` | Page skeleton: navbar, hero, rows, modal root |
| `styles.css` | Dark Netflix-style theme, responsive layout |
| `app.js` | TMDB API integration, rendering, search, watchlist logic |

## Notes

- This product uses the TMDB API but is not endorsed or certified by TMDB.
- Your API key is stored only in your own browser (localStorage).
