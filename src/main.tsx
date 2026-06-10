import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Self-heal stale deploys ───────────────────────────────────────────────────
// This SPA navigates client-side and lazy-loads each route's JS chunk on demand.
// A tab opened BEFORE a deploy keeps the OLD chunk hashes in memory; after a new
// deploy those files are gone, so the server's SPA fallback returns index.html
// in their place and the browser rejects it ("Expected a JavaScript module but
// got a MIME type of text/html") — the route silently fails to load.
//
// Vite dispatches `vite:preloadError` whenever a lazy chunk import fails. We
// reload once to pull the fresh index.html + current chunk hashes, so a stale
// tab heals itself on the next navigation instead of showing a dead screen
// (critical for judges/visitors who won't think to hard-refresh). The
// short-lived sessionStorage guard prevents a reload loop if a chunk is
// genuinely missing (e.g. a half-finished deploy) rather than just stale.
const RELOAD_GUARD = "sb_chunk_reload_at";
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault(); // suppress the default re-throw; we handle it by reloading
  const last = Number(sessionStorage.getItem(RELOAD_GUARD) || 0);
  if (Date.now() - last < 10_000) return; // already reloaded recently — don't loop
  sessionStorage.setItem(RELOAD_GUARD, String(Date.now()));
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
