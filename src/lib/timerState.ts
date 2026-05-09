import { useState, useEffect, useCallback } from "react";

// ── Active / paused state ─────────────────────────────────────────
type Listener = (active: boolean) => void;
const listeners = new Set<Listener>();
let timerActive = false;

export function registerTimer(onActive: Listener): () => void {
  listeners.add(onActive);
  if (timerActive) onActive(true);
  return () => { listeners.delete(onActive); };
}

export function setTimerActive(active: boolean) {
  timerActive = active;
  listeners.forEach(fn => fn(active));
}

export function useTimerActive() {
  const [active, setActive] = useState(false);
  const handler = useCallback((v: boolean) => setActive(v), []);
  useEffect(() => registerTimer(handler), [handler]);
  return active;
}

// ── Live seconds broadcast ────────────────────────────────────────
type SecondsListener = (s: number) => void;
const secondsListeners = new Set<SecondsListener>();
let currentSeconds = 0;
let currentDuration = 0;

export function setTimerSeconds(seconds: number, duration: number) {
  currentSeconds = seconds;
  currentDuration = duration;
  secondsListeners.forEach(fn => fn(seconds));
}

export function useTimerSeconds() {
  const [seconds, setSeconds] = useState(currentSeconds);
  const [duration, setDuration] = useState(currentDuration);
  useEffect(() => {
    const handler = (s: number) => { setSeconds(s); setDuration(currentDuration); };
    secondsListeners.add(handler);
    handler(currentSeconds);
    return () => { secondsListeners.delete(handler); };
  }, []);
  return { seconds, duration };
}
