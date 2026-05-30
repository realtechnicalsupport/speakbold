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

  // Capability fallback for tablets the UA list misses (some Android builds,
  // browsers in "request desktop site" mode, less common vendors). UA strings
  // are unreliable and vary by model — these devices still run the same mobile
  // speech engine that auto-stops on silence, so they need the recording path.
  //
  // We classify a device as touch-primary when the PRIMARY pointer is coarse
  // (touch) AND no fine pointer (mouse/trackpad) exists anywhere. That excludes
  // desktops with a mouse, and touchscreen laptops — which expose a fine pointer
  // via their trackpad and handle live recognition correctly.
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const coarsePrimary = window.matchMedia("(pointer: coarse)").matches;
    const hasFinePointer = window.matchMedia("(any-pointer: fine)").matches;
    const touchPoints = typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;
    if (coarsePrimary && !hasFinePointer && touchPoints > 0) {
      return true;
    }
  }

  return false;
}
