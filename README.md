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

- **Sign up / Sign in** with email + password via **Firebase Authentication** — real accounts that sync across devices — or **continue as guest**
- **Email verification:** sign-up (and any sign-in until verified) requires a 6-digit code emailed to you — codes expire after 10 minutes and can be resent
- Each account owns its own **profiles** — the "Who's watching?" picker is per-account
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

Movies and TV shows stream through an embed player inside the detail modal. Four sources are configured in `app.js` (`PLAYER_SOURCES`), with a small switcher pinned to the top-left of the player so you can flip between them mid-playback if one is slow or down:

| Source | Default | Resume tracking |
|--------|---------|------------------|
| **VidLink** | ✓ main | Yes — listens for `PLAYER_EVENT` postMessages and passes `startAt=` to resume where you left off |
| VidKing | | Yes — same postMessage-based resume, via `progress=` |
| VidSrc | | No — doesn't emit playback events, so Continue Watching won't update while using it |
| 2Embed | | No |

Your chosen source is remembered per-browser (`localStorage`) and reused next time you open a player. To add another provider, add an entry to `PLAYER_SOURCES` with `movie`/`tv` URL templates (`{id}`/`{season}`/`{episode}` placeholders) and a `buildParams()` function for any query params it needs.

- **Continue Watching** row appears on the home screen once you've watched something (only updates while on a source with resume tracking)
- A small status chip (bottom-left) shows live player state (`#messageArea`) when the active source supports it

## Project Structure

| File | Purpose |
|------|---------|
| `index.html` | Page skeleton: navbar, hero, rows, modal root |
| `styles.css` | Dark Netflix-style theme, responsive layout |
| `app.js` | TMDB API integration, rendering, search, watchlist logic |

## Notes

- This product uses the TMDB API but is not endorsed or certified by TMDB.
- Your API key is stored only in your own browser (localStorage).
