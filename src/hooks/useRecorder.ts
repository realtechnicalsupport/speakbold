import { useCallback, useEffect, useRef, useState } from "react";
import { setRecordingActive, setActiveStream } from "@/lib/recordingState";

export type RecordingState = "idle" | "recording" | "paused" | "stopped" | "denied";

/**
 * Pick a container/codec the current browser can actually produce.
 * iOS Safari only supports audio/mp4 (never webm); Chrome/Firefox prefer webm/opus.
 * Returning undefined lets MediaRecorder fall back to its own default.
 */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export interface Recording {
  url: string;
  blob: Blob;
  durationMs: number;
  createdAt: number;
}

/**
 * Optional live-capture hooks. Off by default — when omitted the recorder
 * behaves byte-for-byte as before (a single `mr.start()`, one blob on stop).
 *
 * `timeslice` switches MediaRecorder into chunked mode (`mr.start(ms)`), and
 * `onChunks` fires after every chunk with the cumulative array captured so far.
 * Used by the live PvP debate so a mobile speaker (where the Web Speech API is
 * unavailable) can periodically re-transcribe the audio so far and stream it to
 * the watching opponent. The final blob built on stop is unaffected.
 */
export interface RecorderOptions {
  timeslice?: number;
  onChunks?: (chunks: Blob[]) => void;
}

export const useRecorder = (opts?: RecorderOptions) => {
  const [state, setState] = useState<RecordingState>("idle");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Keep the live-capture options in refs so `start` (memoised on [recording])
  // never needs them in its dep array and can't go stale.
  const timesliceRef = useRef(opts?.timeslice);
  const onChunksRef = useRef(opts?.onChunks);
  timesliceRef.current = opts?.timeslice;
  onChunksRef.current = opts?.onChunks;
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const pauseDurationRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupTimer = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    cleanupTimer();
    setRecordingActive(false);
    setActiveStream(null);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (recording?.url) {
      URL.revokeObjectURL(recording.url);
      setRecording(null);
    }
    try {
      // Mobile-friendly capture: explicitly enable auto gain so soft/distant
      // voices aren't lost, and keep mono to match what analysis expects.
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      };

      // A device id saved on one device (e.g. desktop) is invalid on another
      // (e.g. phone) and used to make getUserMedia throw OverconstrainedError.
      // Switched from `exact` → `ideal` so an invalid pinned device silently
      // falls back to the system default instead of failing the whole start.
      // (We still keep the explicit fallback below for browsers that ignore
      // `ideal` and treat any deviceId object as a hard constraint.)
      const savedDeviceId = localStorage.getItem("speakbold-mic-device");
      let stream: MediaStream;
      if (savedDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { ...audioConstraints, deviceId: { ideal: savedDeviceId } },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      }
      streamRef.current = stream;
      // Publish to the shared store so visualizers can attach without opening
      // a second getUserMedia call.
      setActiveStream(stream);

      // Save microphone choice
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack?.getSettings().deviceId) {
        localStorage.setItem('speakbold-mic-device', audioTrack.getSettings().deviceId!);
      }

      const mimeType = pickMimeType();
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          // Hand the cumulative chunks to the live consumer (debate live
          // transcription). A copy, so they can build a blob without racing
          // our next push.
          onChunksRef.current?.(chunksRef.current.slice());
        }
      };
      mr.onstop = () => {
        // Use the recorder's actual mime type so the blob is never mislabeled
        // (iOS records mp4, not webm — forcing "audio/webm" corrupts the file).
        const type = mr.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        const durationMs = Date.now() - startedAtRef.current - pauseDurationRef.current;
        setRecording({ url, blob, durationMs, createdAt: Date.now() });
        setState("stopped");
      };
      startedAtRef.current = Date.now();
      pauseDurationRef.current = 0;
      setElapsedMs(0);
      // Chunked mode only when a timeslice was requested — otherwise a bare
      // start() (one blob on stop), identical to the original behaviour.
      const ts = timesliceRef.current;
      if (ts && ts > 0) mr.start(ts); else mr.start();
      setState("recording");
      setRecordingActive(true);
      tickRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current - pauseDurationRef.current);
      }, 100);
    } catch (e) {
      setState("denied");
      setError(
        e instanceof Error ? e.message : "Microphone access was blocked. Allow it in your browser settings.",
      );
    }
  }, [recording]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      pausedAtRef.current = Date.now();
      // Stop the tick while paused — without this, the interval keeps firing
      // every 100ms and computing the same elapsedMs over and over. It also
      // means a JS macrotask backlog (a long task during pause) can show a
      // visible tick-jump the first frame after resume. Cheaper + steadier
      // to suspend ticks for the paused window.
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      setState("paused");
      // Keep border active while paused
      setRecordingActive(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      pauseDurationRef.current += Date.now() - pausedAtRef.current;
      // Restart the elapsed tick now that we're recording again. The wall-clock
      // math (now - startedAt - pauseDuration) already accounts for the pause,
      // so the first tick lands at the correct elapsed value with no jump.
      if (!tickRef.current) {
        tickRef.current = window.setInterval(() => {
          setElapsedMs(Date.now() - startedAtRef.current - pauseDurationRef.current);
        }, 100);
      }
      setState("recording");
      setRecordingActive(true);
    }
  }, []);

  const reset = useCallback(() => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setState("idle");
    setElapsedMs(0);
    setError(null);
    pauseDurationRef.current = 0;
    setRecordingActive(false);
  }, [recording]);

  // Unmount cleanup — must be UNCONDITIONAL. Previously this only ran when
  // `state` was "recording"/"paused", but with an empty deps array `state` was
  // a stale closure (always "idle"), so the cleanup never fired. Result: the
  // OS mic indicator and the browser tab "recording" dot stayed on after the
  // user navigated away. Now we always tear down the MediaRecorder + stream
  // + tick interval + shared store entry, regardless of React state.
  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch { /* recorder already torn down */ }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      cleanupTimer();
      setRecordingActive(false);
      setActiveStream(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, recording, elapsedMs, error, start, stop, pause, resume, reset };
};
