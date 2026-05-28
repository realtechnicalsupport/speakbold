import { useState, useEffect, useCallback } from "react";

// ── Recording-active flag (existing API) ────────────────────────────────────
type ActiveListener = (active: boolean) => void;
const activeListeners = new Set<ActiveListener>();
let recordingActive = false;

export function registerRecording(onActive: ActiveListener): () => void {
  activeListeners.add(onActive);
  if (recordingActive) onActive(true);
  return () => {
    activeListeners.delete(onActive);
  };
}

export function setRecordingActive(active: boolean) {
  recordingActive = active;
  activeListeners.forEach(fn => fn(active));
}

export function useRecordingActive() {
  const [active, setActive] = useState(false);
  const handler = useCallback((v: boolean) => setActive(v), []);

  useEffect(() => {
    return registerRecording(handler);
  }, [handler]);

  return active;
}

// ── Shared active MediaStream ────────────────────────────────────────────────
// The recorder publishes its stream here so visualizers (MicrophoneBorder,
// future analyser UIs) can tap into the same getUserMedia handle instead of
// opening their own. One mic stream per active recording is the contract.
type StreamListener = (stream: MediaStream | null) => void;
const streamListeners = new Set<StreamListener>();
let activeStream: MediaStream | null = null;

export function setActiveStream(stream: MediaStream | null) {
  activeStream = stream;
  streamListeners.forEach(fn => fn(stream));
}

export function getActiveStream(): MediaStream | null {
  return activeStream;
}

export function registerActiveStream(onStream: StreamListener): () => void {
  streamListeners.add(onStream);
  if (activeStream) onStream(activeStream);
  return () => {
    streamListeners.delete(onStream);
  };
}

export function useActiveStream(): MediaStream | null {
  const [stream, setStream] = useState<MediaStream | null>(activeStream);
  useEffect(() => registerActiveStream(setStream), []);
  return stream;
}
