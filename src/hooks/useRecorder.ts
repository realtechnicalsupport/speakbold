import { useCallback, useEffect, useRef, useState } from "react";

export type RecordingState = "idle" | "recording" | "paused" | "stopped" | "denied";

export interface Recording {
  url: string;
  blob: Blob;
  durationMs: number;
  createdAt: number;
}

export const useRecorder = () => {
  const [state, setState] = useState<RecordingState>("idle");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (recording?.url) {
      URL.revokeObjectURL(recording.url);
      setRecording(null);
    }
    try {
      // Check for saved microphone preference
      const savedDeviceId = localStorage.getItem('speakbold-mic-device');
      const constraints = savedDeviceId
        ? { audio: { deviceId: { exact: savedDeviceId } } }
        : { audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Save microphone choice
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack?.getSettings().deviceId) {
        localStorage.setItem('speakbold-mic-device', audioTrack.getSettings().deviceId!);
      }
      
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const durationMs = Date.now() - startedAtRef.current - pauseDurationRef.current;
        setRecording({ url, blob, durationMs, createdAt: Date.now() });
        setState("stopped");
      };
      startedAtRef.current = Date.now();
      pauseDurationRef.current = 0;
      setElapsedMs(0);
      mr.start();
      setState("recording");
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
      setState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      pauseDurationRef.current += Date.now() - pausedAtRef.current;
      setState("recording");
    }
  }, []);

  const reset = useCallback(() => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setState("idle");
    setElapsedMs(0);
    setError(null);
    pauseDurationRef.current = 0;
  }, [recording]);

  useEffect(() => {
    // Don't auto-stop - let user manually stop
    return () => {
      // Cleanup only on unmount if recording is still active
      if (state === "recording" || state === "paused") {
        // Warn user or save recording?
        // For now, just cleanup
        if (recording?.url) URL.revokeObjectURL(recording.url);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, recording, elapsedMs, error, start, stop, pause, resume, reset };
};
