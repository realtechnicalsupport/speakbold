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
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  // iPadOS 13+ identifies as Mac in UA — disambiguate via touch points.
  if (/iPad/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}
