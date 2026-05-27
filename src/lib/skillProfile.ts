/**
 * Pure skill-profile computation. No React, no Supabase — testable in isolation.
 * Consumes the `scores` objects persisted in `recording_feedback` and produces a
 * per-dimension diagnosis (averages, trends, staleness, weakest/strongest).
 */

export const DIMENSIONS = [
  "content_quality",
  "structure",
  "clarity",
  "pace",
  "delivery",
  "confidence",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  content_quality: "Message Quality",
  structure: "Structure",
  clarity: "Clarity",
  pace: "Pacing",
  delivery: "Body Language",
  confidence: "Confidence",
};

/** Which track best trains each dimension (drives plan routing + UI links). */
export const DIMENSION_TRACK: Record<Dimension, { track: string; url: string }> = {
  content_quality: { track: "public-speaking", url: "/tracks/public-speaking" },
  structure: { track: "public-speaking", url: "/tracks/public-speaking" },
  clarity: { track: "impromptu", url: "/tracks/impromptu" },
  pace: { track: "impromptu", url: "/tracks/impromptu" },
  delivery: { track: "body-language", url: "/tracks/body-language" },
  confidence: { track: "impromptu", url: "/tracks/impromptu" },
};

/** Maps onboarding weakness labels to dimensions for cold-start diagnosis. */
export const WEAKNESS_TO_DIMENSION: Record<string, Dimension> = {
  "Filler Words (um, uh)": "clarity",
  "Speaking Too Fast": "pace",
  "Monotone Voice": "delivery",
  "Freezing Under Pressure": "confidence",
  "Lack of Eye Contact": "delivery",
  "Vague Answers": "content_quality",
};

export interface DimensionStat {
  dimension: Dimension;
  label: string;
  average: number; // 0-100 rolling mean over the window
  trend: "improving" | "flat" | "declining";
  trendDelta: number; // recent-half mean minus older-half mean
  sampleCount: number;
  lastPracticed: string | null; // ISO date of most recent recording touching this dim
  stale: boolean; // not practiced within STALE_DAYS
}

export interface SkillProfile {
  dimensions: DimensionStat[];
  weakest: Dimension[]; // up to 2, lowest scoring (priority targets)
  strongest: Dimension[]; // up to 2, highest scoring
  overallAverage: number;
  basedOnCount: number; // # of scored recordings used
  coldStart: boolean; // too little data — diagnosis leans on self-report
  generatedAt: string;
}

/** Minimal shape we need from a recording_feedback row. */
export interface ScoredFeedback {
  scores: Record<string, number>;
  created_at: string;
}

/** A single recommended drill in an adaptive plan. */
export interface AdaptiveDrill {
  title: string;
  prompt: string; // the actual speaking prompt to practice
  targetDimension: Dimension;
  targetLabel: string;
  track: string;
  trackUrl: string;
  durationSeconds: number;
  rationale: string; // 1 line: why this drill helps
}

/** The performance-tailored plan derived from a SkillProfile. */
export interface AdaptivePlan {
  focusDimension: Dimension | null;
  focusLabel: string;
  headline: string;
  rationale: string;
  drills: AdaptiveDrill[];
  generatedAt: string;
  basedOnCount: number;
}

const ROLLING_WINDOW = 10; // most-recent N recordings feed the averages
const MIN_SAMPLES = 3; // below this total => cold start
const STALE_DAYS = 14;
const TREND_THRESHOLD = 5; // points of change to count as improving/declining

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeSkillProfile(
  feedback: ScoredFeedback[],
  selfReportedWeaknesses: string[] = []
): SkillProfile {
  const now = new Date().toISOString();

  // Newest first; cap to the rolling window.
  const sorted = [...feedback]
    .filter((f) => f && f.scores && typeof f.scores === "object")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const windowed = sorted.slice(0, ROLLING_WINDOW);
  const basedOnCount = windowed.length;
  const coldStart = basedOnCount < MIN_SAMPLES;

  const dimensions: DimensionStat[] = DIMENSIONS.map((dim) => {
    // Chronological (oldest -> newest) samples for this dimension.
    const samples = [...windowed]
      .reverse()
      .filter((f) => typeof f.scores[dim] === "number")
      .map((f) => ({ value: f.scores[dim], at: f.created_at }));

    const values = samples.map((s) => s.value);
    const average = Math.round(mean(values));
    const lastPracticed = samples.length ? samples[samples.length - 1].at : null;

    // Trend: compare recent half against older half (needs >= 4 samples).
    let trend: DimensionStat["trend"] = "flat";
    let trendDelta = 0;
    if (samples.length >= 4) {
      const mid = Math.floor(values.length / 2);
      const olderAvg = mean(values.slice(0, mid));
      const recentAvg = mean(values.slice(mid));
      trendDelta = Math.round(recentAvg - olderAvg);
      if (trendDelta >= TREND_THRESHOLD) trend = "improving";
      else if (trendDelta <= -TREND_THRESHOLD) trend = "declining";
    }

    return {
      dimension: dim,
      label: DIMENSION_LABELS[dim],
      average,
      trend,
      trendDelta,
      sampleCount: samples.length,
      lastPracticed,
      stale: lastPracticed ? daysSince(lastPracticed) > STALE_DAYS : false,
    };
  });

  const withData = dimensions.filter((d) => d.sampleCount > 0);
  const overallAverage = Math.round(mean(withData.map((d) => d.average)));

  let weakest: Dimension[];
  let strongest: Dimension[];

  if (coldStart) {
    // Lean on self-reported weaknesses mapped to dimensions.
    const mapped = selfReportedWeaknesses
      .map((w) => WEAKNESS_TO_DIMENSION[w])
      .filter((d): d is Dimension => Boolean(d));
    weakest = Array.from(new Set(mapped)).slice(0, 2);
    strongest = [];
  } else {
    // Rank by score; break ties toward declining/stale dimensions.
    const ranked = [...withData].sort((a, b) => {
      if (a.average !== b.average) return a.average - b.average;
      const score = (d: DimensionStat) => (d.trend === "declining" ? -2 : 0) + (d.stale ? -1 : 0);
      return score(a) - score(b);
    });
    weakest = ranked.slice(0, 2).map((d) => d.dimension);
    strongest = ranked
      .slice()
      .reverse()
      .slice(0, 2)
      .map((d) => d.dimension);
  }

  return {
    dimensions,
    weakest,
    strongest,
    overallAverage,
    basedOnCount,
    coldStart,
    generatedAt: now,
  };
}
