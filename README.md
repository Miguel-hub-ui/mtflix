# MTFlix — Movie & TV Streaming Site

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

- **Sign up / Sign in** with email + password (hashed locally, never stored in plain text), or **continue as guest**
- **Email verification:** sign-up (and first sign-in on a new browser) requires a 6-digit code, shown in a simulated demo inbox — codes expire after 10 minutes and can be resent; verified browsers are remembered
- Each account owns its own **profiles** — the "Who's watching?" picker is per-account
- **Tracking:** open any title and set a status (Plan to Watch / Watching / Completed / On Hold / Dropped) and a 5-star rating
- The **My List** page has tabs: *Watchlist* (saved titles) and *Tracking* (grouped by status, with ratings and progress bars)
- All data stays in your browser's localStorage under your account

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

## Playback Server (VidKing)

Movies and TV shows stream through an embed player inside the detail modal, configured at the top of `app.js`:

```js
const PLAYER_SERVER = {
  movie: "https://www.vidking.net/embed/movie/{id}",
  tv: "https://www.vidking.net/embed/tv/{id}/{season}/{episode}",
  color: "e50914",
};
```

- `{id}` is filled with the TMDB ID automatically; `{season}` / `{episode}` from the picker
- Auto-enabled params: `color`, `autoPlay`, `nextEpisode`, `episodeSelector` (TV)
- **Resume playback:** the site listens for `PLAYER_EVENT` postMessages and saves your position — reopening a title shows *Resume* and passes `progress=` so the player picks up where you left off
- **Continue Watching** row appears on the home screen once you've watched something
- A small status chip (bottom-left) shows live player state (`#messageArea`)

## Project Structure

| File | Purpose |
|------|---------|
| `index.html` | Page skeleton: navbar, hero, rows, modal root |
| `styles.css` | Dark Netflix-style theme, responsive layout |
| `app.js` | TMDB API integration, rendering, search, watchlist logic |

## Notes

- This product uses the TMDB API but is not endorsed or certified by TMDB.
- Your API key is stored only in your own browser (localStorage).
