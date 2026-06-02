/**
 * UA + touch-based detection for phones AND tablets.
 *
 * Web Speech API on iOS Safari and Chrome for Android ignores
 * `recognition.continuous = true` and auto-stops every few seconds.
 * The restart loop re-opens getUserMedia each cycle, causing a visible
 * mic-indicator blink and conflicting with the MediaRecorder's own
 * stream. On these devices we skip live recognition entirely and
 * transcribe the recorded blob server-side instead.
 *
 * The viewport-based `useIsMobile()` hook only catches narrow screens,
 * so iPads in landscape (>=768px) would slip through — hence UA check.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const touchPoints = typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;

  // ── Default mobile UAs ────────────────────────────────────────────────────
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  if (/iPad/i.test(ua)) return true;
  // iPadOS 13+ (and iPad in "Request Desktop Website") reports as Macintosh.
  // Disambiguate via the touch digitizer — desktop Macs never have one.
  if (/Macintosh/i.test(ua) && touchPoints > 1) return true;

  // ── Android tablet/phone in Chrome "Desktop site" mode ────────────────────
  // This is the case that bit us: "Desktop site" rewrites the UA to a generic
  // desktop-Linux string ("X11; Linux x86_64") AND fakes the pointer media
  // queries to report a fine (mouse) pointer — so every UA and (any-pointer:
  // fine) check above passes and the device wrongly takes the live-speech path,
  // giving the "mic stops on every pause then restarts" bug.
  //
  // The one thing desktop-site mode does NOT change is navigator.maxTouchPoints
  // (the physical digitizer). A UA claiming desktop *Linux* while exposing a
  // multi-touch screen is almost certainly an Android device masquerading as
  // desktop — genuine Linux desktops with a 5-point touchscreen are vanishingly
  // rare. Scoped to Linux on purpose: real Windows / ChromeOS / macOS touch-
  // laptops report their true OS in the UA, so they KEEP the live-recognition
  // path (which works correctly for them) instead of being demoted here.
  if (/Linux/i.test(ua) && !/Android/i.test(ua) && touchPoints > 1) return true;

  // ── Capability fallback for touch-primary devices the UA list missed ──────
  // Primary pointer is coarse AND no fine pointer exists anywhere. (Won't fire
  // in desktop-site mode, which fakes a fine pointer — the Linux+touch branch
  // above covers that case.)
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const coarsePrimary = window.matchMedia("(pointer: coarse)").matches;
    const hasFinePointer = window.matchMedia("(any-pointer: fine)").matches;
    if (coarsePrimary && !hasFinePointer && touchPoints > 0) return true;
  }

  return false;
}
