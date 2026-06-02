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

  // ── Hardware capability check (UA-spoof-proof) ────────────────────────────
  // Chrome's "Desktop site" mode changes the UA string but does NOT spoof
  // maxTouchPoints or CSS pointer media queries, so a tablet in desktop mode
  // passes all UA checks and slips through to the live-speech path — producing
  // the exact "stops then restarts on every pause" bug.
  //
  // Check hardware FIRST: a device with multiple touch points and no fine
  // pointer (mouse/trackpad) is unambiguously a phone or tablet regardless of
  // UA or viewport mode. Touchscreen laptops are excluded because they always
  // have a fine pointer via their built-in trackpad.
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const touchPoints = typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;
    const hasFinePointer = window.matchMedia("(any-pointer: fine)").matches;
    if (touchPoints > 1 && !hasFinePointer) return true;
  }

  // ── UA fallback (catches cases before matchMedia is available) ────────────
  const ua = navigator.userAgent || "";
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  // iPadOS 13+ with default UA identifies as Mac — disambiguate via touch points.
  if (/iPad/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1) {
    return true;
  }

  // ── Coarse-primary fallback for single-touch-point devices ────────────────
  // Catches any remaining touch-primary devices the checks above missed.
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const coarsePrimary = window.matchMedia("(pointer: coarse)").matches;
    const hasFinePointer = window.matchMedia("(any-pointer: fine)").matches;
    const touchPoints = typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;
    if (coarsePrimary && !hasFinePointer && touchPoints > 0) return true;
  }

  return false;
}
