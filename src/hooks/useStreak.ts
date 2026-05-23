import { useCallback, useEffect, useState } from "react";

const KEY = "speakbold.streak.v1";

type StreakState = {
  count: number;
  lastDay: string | null; // YYYY-MM-DD
};

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const daysBetween = (a: string, b: string) => {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
};

const read = (): StreakState => {
  if (typeof window === "undefined") return { count: 0, lastDay: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { count: 0, lastDay: null };
    const parsed = JSON.parse(raw) as StreakState;
    return { count: parsed.count ?? 0, lastDay: parsed.lastDay ?? null };
  } catch {
    return { count: 0, lastDay: null };
  }
};

const write = (s: StreakState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
};

export const useStreak = () => {
  const [state, setState] = useState<StreakState>({ count: 0, lastDay: null });

  useEffect(() => {
    const s = read();
    // Auto-break streak if more than 1 day has passed with no practice
    if (s.lastDay) {
      const gap = daysBetween(s.lastDay, todayKey());
      if (gap > 1) {
        const fresh = { count: 0, lastDay: s.lastDay };
        write(fresh);
        setState(fresh);
        return;
      }
    }
    setState(s);
  }, []);

  const markPracticed = useCallback(() => {
    const today = todayKey();
    setState((prev) => {
      if (prev.lastDay === today) return prev; // already counted today
      const gap = prev.lastDay ? daysBetween(prev.lastDay, today) : Infinity;
      const count = gap === 1 ? prev.count + 1 : 1;
      const next = { count, lastDay: today };
      write(next);
      return next;
    });
  }, []);

  const practicedToday = state.lastDay === todayKey();

  return { count: state.count, practicedToday, markPracticed };
};
