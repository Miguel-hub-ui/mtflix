// ===== MTFlix episode fix =====
// Paste this near the top of app.js (or anywhere outside other functions).
// If your app.js already has the TMDB key in a variable, delete the next line
// and rename TMDB_KEY below to match your variable name.
const TMDB_KEY = "PUT_YOUR_TMDB_KEY_HERE";

const TMDB_IMG = "https://image.tmdb.org/t/p/w300";
const tvmazeCache = {}; // so we only call TVmaze once per show

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, "").trim();
}

async function getJson(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

// TVmaze fallback (no API key needed). Looks the show up by IMDb ID.
async function getTvmazeEpisodes(tvId) {
  if (tvmazeCache[tvId] !== undefined) return tvmazeCache[tvId];
  let episodes = [];
  const ext = await getJson(
    `https://api.themoviedb.org/3/tv/${tvId}/external_ids?api_key=${TMDB_KEY}`
  );
  if (ext && ext.imdb_id) {
    const show = await getJson(
      `https://api.tvmaze.com/lookup/shows?imdb=${ext.imdb_id}`
    );
    if (show && show.id) {
      episodes =
        (await getJson(`https://api.tvmaze.com/shows/${show.id}/episodes`)) ||
        [];
    }
  }
  tvmazeCache[tvId] = episodes;
  return episodes;
}

/**
 * Returns a list of episodes, each with:
 *   { number, name, overview, image }
 * Always filled in: Arabic -> English -> TVmaze -> show backdrop / show overview.
 *
 * tvId         = TMDB id of the series
 * seasonNumber = e.g. 1
 * show         = the series details object you already have (needs
 *                backdrop_path and overview; both are optional)
 */
async function loadEpisodes(tvId, seasonNumber, show = {}) {
  const base = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_KEY}`;
  const [ar, en] = await Promise.all([
    getJson(`${base}&language=ar`),
    getJson(`${base}&language=en-US`),
  ]);

  const arEps = (ar && ar.episodes) || [];
  const enEps = (en && en.episodes) || [];
  const list = arEps.length ? arEps : enEps;

  // Only hit TVmaze if something is still missing after Arabic + English.
  const needsMore = list.some((ep) => {
    const e = enEps.find((x) => x.episode_number === ep.episode_number) || {};
    return !(ep.overview || e.overview) || !(ep.still_path || e.still_path);
  });
  const tvmaze = needsMore ? await getTvmazeEpisodes(tvId) : [];

  const backdrop = show.backdrop_path ? TMDB_IMG + show.backdrop_path : null;

  return list.map((ep) => {
    const a = arEps.find((x) => x.episode_number === ep.episode_number) || {};
    const e = enEps.find((x) => x.episode_number === ep.episode_number) || {};
    const t =
      tvmaze.find(
        (x) => x.season === seasonNumber && x.number === ep.episode_number
      ) || {};

    const still = a.still_path || e.still_path;
    const genericName = /^(episode|الحلقة)\s*\d+$/i;
    const goodName = [a.name, e.name, t.name].find(
      (n) => n && !genericName.test(n.trim())
    );

    return {
      number: ep.episode_number,
      name: goodName || a.name || e.name || `Episode ${ep.episode_number}`,
      overview:
        a.overview ||
        e.overview ||
        stripHtml(t.summary) ||
        show.overview ||
        "No description available.",
      image:
        (still ? TMDB_IMG + still : null) ||
        (t.image && (t.image.medium || t.image.original)) ||
        backdrop,
    };
  });
}

// ===== HOW TO USE =====
// Find the place in app.js where you currently fetch /season/ and build the
// episode cards, and replace it with:
//
//   const episodes = await loadEpisodes(tvId, seasonNumber, showDetails);
//   episodes.forEach(ep => {
//       // use ep.number, ep.name, ep.overview, ep.image
//       // (ep.image is a full URL, so don't add the TMDB image prefix again)
//   });
//
// tvId and showDetails are whatever your code already calls the series id and
// the series details object.
