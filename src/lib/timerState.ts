import { useState, useEffect, useCallback } from "react";

type Listener = (active: boolean) => void;
const listeners = new Set<Listener>();
let timerActive = false;

export function registerTimer(onActive: Listener): () => void {
  listeners.add(onActive);
  if (timerActive) onActive(true);
  return () => {
    listeners.delete(onActive);
  };
}

export function setTimerActive(active: boolean) {
  timerActive = active;
  listeners.forEach(fn => fn(active));
}

export function useTimerActive() {
  const [active, setActive] = useState(false);
  const handler = useCallback((v: boolean) => setActive(v), []);
  
  useEffect(() => {
    return registerTimer(handler);
  }, [handler]);
  
  return active;
}
