// ── Coach-export rep log ──────────────────────────────────────────────────────
// A lightweight, local-only log of export-mode reps, kept SEPARATE from the
// AI-coach history (which is score-based) so it never pollutes those stats. It
// stores just enough to compute trends across sessions — rolling averages and
// repeated-phrase detection — and the transcript for the latter. localStorage
// only; nothing is uploaded.

export interface ImpromptuRep {
  ts: number;
  wpm: number;
  fillerCount: number;
  totalWords: number;
  durationSec: number;
  targetSec: number;
  projectedPct: number;   // durationSec / targetSec, clamped 0–100+
  transcript: string;
}

const KEY = "speakbold_impromptu_reps_v1";
const MAX = 30;

export function loadReps(): ImpromptuRep[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function logRep(rep: Omit<ImpromptuRep, "ts">): ImpromptuRep {
  const full: ImpromptuRep = { ...rep, ts: Date.now() };
  const updated = [full, ...loadReps()].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch { /* storage full — ignore */ }
  return full;
}

/** The most recent N reps (newest first). */
export function lastReps(n: number): ImpromptuRep[] {
  return loadReps().slice(0, n);
}
