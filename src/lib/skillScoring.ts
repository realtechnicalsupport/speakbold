/**
 * Pure normalization: turns each practice surface's existing signals into a
 * partial 6-dimension skill score the Coach can ingest. No AI calls — every
 * input here is already computed by the surface that produced it.
 *
 * Dimensions: content_quality, structure, clarity, pace, delivery, confidence.
 * (delivery/Body Language is camera-only and stays unset here.)
 */
import type { Dimension } from "./skillProfile";
import { TARGET_WPM } from "@/data/impromptuTopics";

export type DimScores = Partial<Record<Dimension, number>>;

const clamp = (n: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, Math.round(n)));

/** Pace 0-100 from words-per-minute, peaking inside the conversational band. */
export function paceScore(wpm: number): number {
  if (!wpm || wpm <= 0) return 0;
  if (wpm >= TARGET_WPM.min && wpm <= TARGET_WPM.max) return 100;
  const dist = wpm < TARGET_WPM.min ? TARGET_WPM.min - wpm : wpm - TARGET_WPM.max;
  return clamp(100 - dist * 1.1);
}

/** Clarity 0-100 from filler density (fillers per 100 spoken words). */
export function clarityScore(fillerCount: number, totalWords: number): number {
  if (!totalWords || totalWords <= 0) return 0;
  const per100 = (fillerCount / totalWords) * 100;
  return clamp(100 - per100 * 11); // ~9 fillers / 100 words ≈ 0
}

/** Impromptu drill → content/structure/clarity/pace/confidence. */
export function impromptuToDims(p: {
  score: number;
  wpm: number;
  fillerCount: number;
  totalWords: number;
  frameworkHitRate: number; // 0-1
}): DimScores {
  return {
    content_quality: clamp(p.score),
    structure: clamp(p.frameworkHitRate * 100),
    clarity: clarityScore(p.fillerCount, p.totalWords),
    pace: paceScore(p.wpm),
    confidence: clamp(p.score),
  };
}

/** Pathway lesson → the dimensions structured drills train. */
export function pathwayToDims(score: number): DimScores {
  const s = clamp(score);
  return { content_quality: s, structure: s, confidence: s };
}

/**
 * Arena battle → opponent-weighted so a hard matchup doesn't misleadingly tank
 * the radar. A tougher opponent (higher ELO) lifts the effective score; a weaker
 * one discounts it. Debate also informs structure.
 */
export function arenaToDims(p: {
  score: number;
  myElo: number;
  oppElo: number;
  mode: string;
}): DimScores {
  const diff = Math.max(-0.5, Math.min(0.5, (p.oppElo - p.myElo) / 400));
  const weighted = clamp(p.score + diff * 20);
  const dims: DimScores = { content_quality: weighted, confidence: weighted };
  if (p.mode === "debate") dims.structure = weighted;
  return dims;
}

/**
 * Coach drill → the targeted dimension (from the AI judge) plus measurable
 * delivery signals derived from the same speech (pace from WPM, clarity from
 * filler density). One drill enriches several spokes honestly.
 */
export function coachToDims(p: {
  score: number;
  targetDimension: Dimension;
  wpm?: number;
  fillerCount?: number;
  totalWords?: number;
}): DimScores {
  const dims: DimScores = { [p.targetDimension]: clamp(p.score) };
  if (typeof p.wpm === "number" && p.wpm > 0) dims.pace = paceScore(p.wpm);
  if (typeof p.fillerCount === "number" && typeof p.totalWords === "number" && p.totalWords > 0) {
    dims.clarity = clarityScore(p.fillerCount, p.totalWords);
  }
  return dims;
}

/**
 * Body-language session → the `delivery` spoke (which is literally "Body
 * Language" in the radar) plus an honest nudge to `confidence`: steady posture
 * and an animated, engaged face are exactly what an audience reads as
 * confident. Camera sessions are the only source that can fill `delivery`, so
 * without this the radar's Body Language spoke stays permanently empty.
 */
export function bodyToDims(m: {
  posture: number;
  expression: number;
  gesture: number;
  overall: number;
}): DimScores {
  return {
    delivery: clamp(m.overall),
    confidence: clamp(m.posture * 0.6 + m.expression * 0.4),
  };
}

/** Pass-through of audio-analysis scores (recording_feedback shape). */
export function analyzeToDims(scores: Record<string, number>): DimScores {
  const out: DimScores = {};
  (["content_quality", "structure", "clarity", "pace", "confidence", "delivery"] as Dimension[]).forEach((d) => {
    if (typeof scores[d] === "number") out[d] = clamp(scores[d]);
  });
  return out;
}
