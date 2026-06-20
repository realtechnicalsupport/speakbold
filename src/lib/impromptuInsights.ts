// ── Impromptu insights ────────────────────────────────────────────────────────
// Pure functions that combine the transcript, the acoustic segments/pauses, and
// the local rep log into coaching-grade signals. No AI, no network. Anything
// that maps words to time is APPROXIMATE — we have no true word-level timestamps,
// so words are distributed across acoustic speech segments by voiced duration
// (much better than uniform time, but still an estimate). Labelled as such.

import type { VoiceSegment, VoicePause } from "@/lib/voiceAnalysis";
import type { ImpromptuRep } from "@/lib/impromptuRepLog";

function splitWords(t: string): string[] {
  return t.trim().split(/\s+/).filter(Boolean);
}

/** Distribute transcript words across segments, weighted by each segment's
 *  voiced duration. Pauses carry no words, so this beats uniform-time mapping. */
function assignWords(words: string[], segments: VoiceSegment[]): string[][] {
  if (segments.length === 0) return [words];
  const durs = segments.map(s => Math.max(0.05, s.endSec - s.startSec));
  const total = durs.reduce((a, b) => a + b, 0) || 1;
  const out: string[][] = [];
  let idx = 0;
  let acc = 0;
  for (let i = 0; i < segments.length; i++) {
    acc += durs[i];
    const end = i === segments.length - 1 ? words.length : Math.round((acc / total) * words.length);
    out.push(words.slice(idx, Math.max(idx, end)));
    idx = Math.max(idx, end);
  }
  return out;
}

export interface PauseInsight {
  startSec: number;
  durationSec: number;
  type: "boundary" | "search";
  beforeWords: string;
  afterWords: string;
  approxWordIndex: number;
}

/** Tag each long pause with the words around it (approx) and its type. */
export function buildPauseInsights(
  transcript: string, segments: VoiceSegment[], pauses: VoicePause[],
): PauseInsight[] {
  const words = splitWords(transcript);
  const perSeg = assignWords(words, segments);
  const cum: number[] = [];
  let c = 0;
  for (const seg of perSeg) { c += seg.length; cum.push(c); }

  return pauses.map(p => {
    let prevIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].endSec <= p.startSec + 0.3) prevIdx = i;
    }
    const before = prevIdx >= 0 ? perSeg[prevIdx].slice(-4).join(" ") : "";
    const after = prevIdx + 1 < perSeg.length ? perSeg[prevIdx + 1].slice(0, 4).join(" ") : "";
    return {
      startSec: p.startSec,
      durationSec: p.durationSec,
      type: p.type,
      beforeWords: before,
      afterWords: after,
      approxWordIndex: prevIdx >= 0 ? cum[prevIdx] : 0,
    };
  });
}

export interface ClusteringResult { label: "spread" | "bunched" | "too few"; detail: string; }

export function pauseClustering(pauses: VoicePause[], totalSec: number): ClusteringResult {
  if (pauses.length < 3) {
    return { label: "too few", detail: `${pauses.length} long pause${pauses.length === 1 ? "" : "s"} — not enough to judge spread.` };
  }
  const thirds = [0, 0, 0];
  for (const p of pauses) {
    const t = Math.min(2, Math.floor((p.startSec / Math.max(1, totalSec)) * 3));
    thirds[t]++;
  }
  const max = Math.max(...thirds);
  const where = ["first", "middle", "final"][thirds.indexOf(max)];
  if (max >= pauses.length * 0.6) {
    return { label: "bunched", detail: `${max} of ${pauses.length} long pauses cluster in the ${where} third — likely a structural gap there, not general fluency.` };
  }
  return { label: "spread", detail: "Long pauses are spread fairly evenly — reads as general thinking pace, not one weak spot." };
}

export interface PaceTrend { wpm: [number, number, number]; trend: "steady" | "slowing" | "speeding up"; }

export function paceOverTime(transcript: string, segments: VoiceSegment[], totalSec: number): PaceTrend {
  const words = splitWords(transcript);
  const perSeg = assignWords(words, segments);
  const thirdSec = Math.max(1, totalSec) / 3;
  const wordsT = [0, 0, 0];
  const timeT = [0, 0, 0];
  segments.forEach((s, i) => {
    const mid = (s.startSec + s.endSec) / 2;
    const t = Math.min(2, Math.floor(mid / thirdSec));
    wordsT[t] += perSeg[i].length;
    timeT[t] += s.endSec - s.startSec;
  });
  const wpm = wordsT.map((w, i) => (timeT[i] > 0.5 ? Math.round(w / (timeT[i] / 60)) : 0)) as [number, number, number];
  let trend: PaceTrend["trend"] = "steady";
  if (wpm[0] > 0 && wpm[2] > 0) {
    if (wpm[2] < wpm[0] * 0.85) trend = "slowing";
    else if (wpm[2] > wpm[0] * 1.15) trend = "speeding up";
  }
  return { wpm, trend };
}

export interface TrailingOff { pct: number; faded: number; total: number; label: "frequent" | "occasional" | "rare" | "n/a"; }

export function trailingOff(segments: VoiceSegment[]): TrailingOff {
  const valid = segments.filter(s => s.meanDb > -80);
  if (valid.length === 0) return { pct: 0, faded: 0, total: 0, label: "n/a" };
  const faded = valid.filter(s => s.endDb <= s.meanDb - 3).length;
  const pct = Math.round((faded / valid.length) * 100);
  const label = pct >= 50 ? "frequent" : pct >= 25 ? "occasional" : "rare";
  return { pct, faded, total: valid.length, label };
}

export interface RollingAverages { count: number; avgWpm: number; avgFillers: number; avgProjectedPct: number; }

export function rollingAverages(reps: ImpromptuRep[]): RollingAverages | null {
  if (reps.length === 0) return null;
  const n = reps.length;
  return {
    count: n,
    avgWpm: Math.round(reps.reduce((a, r) => a + r.wpm, 0) / n),
    avgFillers: Math.round((reps.reduce((a, r) => a + r.fillerCount, 0) / n) * 10) / 10,
    avgProjectedPct: Math.round(reps.reduce((a, r) => a + r.projectedPct, 0) / n),
  };
}

function normWords(t: string): string[] {
  return t.toLowerCase().replace(/[^\w\s']/g, " ").split(/\s+/).filter(Boolean);
}

/** Phrases (4–6 words) in the current transcript that also appear in any prior. */
export function repeatedPhrases(current: string, priors: string[]): string[] {
  const MIN = 4, MAX = 6;
  const cur = normWords(current);
  if (cur.length < MIN || priors.length === 0) return [];

  const priorGrams = new Set<string>();
  for (const p of priors) {
    const w = normWords(p);
    for (let len = MIN; len <= MAX; len++) {
      for (let i = 0; i + len <= w.length; i++) priorGrams.add(w.slice(i, i + len).join(" "));
    }
  }

  const found: string[] = [];
  for (let len = MAX; len >= MIN; len--) {
    for (let i = 0; i + len <= cur.length; i++) {
      const g = cur.slice(i, i + len).join(" ");
      if (priorGrams.has(g) && !found.some(f => f.includes(g))) found.push(g);
    }
  }
  return found.slice(0, 6);
}
