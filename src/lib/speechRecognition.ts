import { isMobileDevice } from "./isMobileDevice";

/** The Web Speech API SpeechRecognition constructor for this browser, or null. */
export function getSpeechRecognition(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/** True on Brave, which injects a `navigator.brave` object on every page. */
function isBraveBrowser(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as any).brave;
}

/**
 * Whether live Web Speech recognition will ACTUALLY work here — not merely
 * whether the constructor exists. Returns false when:
 *   • the constructor is missing (Firefox never shipped it), or
 *   • we're on a phone/tablet — iOS Safari & Android Chrome ignore
 *     `recognition.continuous = true`, auto-stop every few seconds, and the
 *     restart loop fights the MediaRecorder's mic stream, or
 *   • we're on Brave — it ships the `webkitSpeechRecognition` constructor but
 *     blocks the Google backend it depends on, so `.start()` fails with a
 *     network error and NO transcript ever arrives. The constructor lies, so a
 *     plain `!!getSpeechRecognition()` check wrongly reports "supported" and the
 *     caller takes a live path that silently produces nothing.
 *
 * Any caller that gets `false` here MUST fall back to server-side transcription
 * of the recorded audio — the universal path that works in every browser.
 *
 * A false positive on Brave detection (or a future Brave that re-enables Web
 * Speech) only costs live captions, never the recorded transcript, so erring
 * toward the server path is safe.
 */
export function speechRecognitionSupported(): boolean {
  if (!getSpeechRecognition()) return false;
  if (isMobileDevice()) return false;
  if (isBraveBrowser()) return false;
  return true;
}
