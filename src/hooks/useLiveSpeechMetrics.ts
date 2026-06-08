import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { isMobileDevice } from "@/lib/isMobileDevice";

/**
 * Reusable live-speech engine — the same browser Web Speech path that powers the
 * Impromptu stage, decoupled from impromptu's topics/coaching so any timed drill
 * (Public Speaking, Interviews) can stream live captions + WPM + filler counts.
 *
 * Drive it with `active` (true while the user is actually speaking — running and
 * not paused) and the elapsed seconds so WPM can be derived. Transcript
 * accumulates across pause/resume; call reset() before a fresh attempt.
 *
 * Mobile note: on-device Web Speech is unreliable on phones (auto-stops on every
 * pause, fights the MediaRecorder's mic stream), so we skip it there. Callers
 * should treat live captions as a desktop enhancement and check `speechSupported`.
 */

// Minimal structural types for the Web Speech API (not in lib.dom for all TS
// targets) — enough to drive recognition without leaking `any`.
interface SpeechResultAlt { transcript: string }
interface SpeechResult extends ArrayLike<SpeechResultAlt> { isFinal: boolean }
interface SpeechResultEvent { resultIndex: number; results: ArrayLike<SpeechResult> }
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

const FILLER_WORDS = [
  "um", "uh", "like", "you know", "so", "basically", "right",
  "actually", "literally", "kind of", "sort of",
];

function countFillers(text: string): number {
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce(
    (n, w) => n + (lower.match(new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "g"))?.length ?? 0),
    0
  );
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface LiveSpeechMetrics {
  liveTranscript: string;
  liveInterim: string;
  fillerCount: number;
  totalWords: number;
  wpm: number;
  /** False on mobile or browsers without Web Speech — hide the live HUD then. */
  speechSupported: boolean;
  reset: () => void;
}

export function useLiveSpeechMetrics(active: boolean, elapsedSeconds: number): LiveSpeechMetrics {
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveInterim, setLiveInterim] = useState("");
  const [fillerCount, setFillerCount] = useState(0);
  const transcriptRef = useRef("");

  const speechSupported = !isMobileDevice() && !!getSpeechRecognition();

  const reset = useCallback(() => {
    transcriptRef.current = "";
    setLiveTranscript("");
    setLiveInterim("");
    setFillerCount(0);
  }, []);

  useEffect(() => {
    if (!active || !speechSupported) return;
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let stopped = false;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;

    recognition.onresult = (e: SpeechResultEvent) => {
      let interim = "";
      let newFinal = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) newFinal += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      if (newFinal) {
        const updated = transcriptRef.current + newFinal;
        transcriptRef.current = updated;
        setLiveTranscript(updated);
        setFillerCount(countFillers(updated));
      }
      setLiveInterim(interim);
    };
    recognition.onerror = (e: { error: string }) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        stopped = true;
      }
    };
    recognition.onend = () => {
      if (stopped) return;
      try {
        recognition.start();
      } catch {
        restartTimer = setTimeout(() => {
          if (!stopped) try { recognition.start(); } catch (_) { /* engine still tearing down */ }
        }, 200);
      }
    };

    try { recognition.start(); } catch (_) { /* may throw if already started */ }

    return () => {
      stopped = true;
      if (restartTimer) clearTimeout(restartTimer);
      try { recognition.stop(); } catch (_) { /* already stopped */ }
      setLiveInterim("");
    };
  }, [active, speechSupported]);

  const totalWords = useMemo(
    () => liveTranscript.split(/\s+/).filter(Boolean).length,
    [liveTranscript]
  );

  const wpm = elapsedSeconds > 3 ? Math.round((totalWords / elapsedSeconds) * 60) : 0;

  return { liveTranscript, liveInterim, fillerCount, totalWords, wpm, speechSupported, reset };
}
