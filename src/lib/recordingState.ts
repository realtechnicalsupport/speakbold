import { useState, useEffect, useCallback } from "react";

type Listener = (active: boolean) => void;
const listeners = new Set<Listener>();
let recordingActive = false;

export function registerRecording(onActive: Listener): () => void {
  listeners.add(onActive);
  if (recordingActive) onActive(true);
  return () => {
    listeners.delete(onActive);
  };
}

export function setRecordingActive(active: boolean) {
  recordingActive = active;
  listeners.forEach(fn => fn(active));
}

export function useRecordingActive() {
  const [active, setActive] = useState(false);
  const handler = useCallback((v: boolean) => setActive(v), []);

  useEffect(() => {
    return registerRecording(handler);
  }, [handler]);

  return active;
}
