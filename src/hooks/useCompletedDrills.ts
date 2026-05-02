import { useCallback, useEffect, useState } from "react";

const KEY = "speakbold.completed.v1";

type CompletedState = {
  drills: Record<string, string[]>; // trackId -> array of drill IDs
};

const read = (): CompletedState => {
  if (typeof window === "undefined") return { drills: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { drills: {} };
    return JSON.parse(raw) as CompletedState;
  } catch {
    return { drills: {} };
  }
};

const write = (s: CompletedState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
};

export const useCompletedDrills = (trackId: string) => {
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    const state = read();
    setCompleted(state.drills[trackId] || []);
  }, [trackId]);

  const markCompleted = useCallback((drillId: string) => {
    setCompleted((prev) => {
      if (prev.includes(drillId)) return prev;
      const next = [...prev, drillId];
      const state = read();
      state.drills[trackId] = next;
      write(state);
      return next;
    });
  }, [trackId]);

  const isCompleted = useCallback((drillId: string) => {
    return completed.includes(drillId);
  }, [completed]);

  const completedCount = completed.length;

  return { completed, markCompleted, isCompleted, completedCount };
};
