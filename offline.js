"use strict";

// "No internet" screen. Kept apart from app.js so it still works when the
// app can't fully start offline (Firebase and TMDB live on other servers).
(function () {
  const style = document.createElement("style");
  style.textContent = `
    .offline-screen {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; padding: 24px; text-align: center;
      background: #1a1a1a; color: #fff;
      font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .offline-screen[hidden] { display: none; }
    .offline-screen svg { width: 96px; height: 96px; margin-bottom: 8px; }
    .offline-screen h1 { margin: 0; font-size: 1.4rem; font-weight: 700; }
    .offline-screen p { margin: 0; max-width: 300px; color: #93b0b6; font-size: 0.95rem; line-height: 1.45; }
    .offline-screen button {
      margin-top: 10px; padding: 11px 28px; border: 0; border-radius: 8px;
      background: #22d3ee; color: #0b1215; font: inherit; font-weight: 700; cursor: pointer;
    }`;
  document.head.appendChild(style);

  const screen = document.createElement("div");
  screen.className = "offline-screen";
  screen.id = "offline-screen";
  screen.hidden = true;
  screen.setAttribute("role", "alert");
  screen.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <g stroke="#5c6b6e" stroke-width="1.8">
        <path d="M2 8.8a15 15 0 0 1 20 0" />
        <path d="M5.2 12.4a10.5 10.5 0 0 1 13.6 0" />
        <path d="M8.6 15.9a5.6 5.6 0 0 1 6.8 0" />
      </g>
      <circle cx="12" cy="19.3" r="1.2" fill="#5c6b6e" />
      <path d="M3.5 3.5l17 17" stroke="#ef4444" stroke-width="2.2" />
    </svg>
    <h1>No internet connection</h1>
    <p>Check your Wi-Fi or mobile data, then try again.</p>
    <button type="button">Try again</button>`;

  // Set when the app couldn't start properly while offline; coming back
  // online then reloads so everything (login, rows) loads fresh.
  let needsReload = false;

  function show(on) {
    if (on && !screen.isConnected) document.body.appendChild(screen);
    screen.hidden = !on;
  }

  screen.querySelector("button").addEventListener("click", () => location.reload());

  // app.js calls this when a request fails because there's no connection.
  window.mtflixShowOffline = () => {
    needsReload = true;
    show(true);
  };

  window.addEventListener("offline", () => show(true));
  window.addEventListener("online", () => {
    if (needsReload) location.reload();
    else show(false);
  });

  if (!navigator.onLine) {
    needsReload = true;
    show(true);
  }
})();
