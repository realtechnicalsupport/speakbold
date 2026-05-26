import { Rank, RankName, RankTier, UserProfile, Gamemode } from "@/context/ArenaContext";

// ─── Gamemode catalogue ──────────────────────────────────────────────────────
export const GAMEMODES = {
  blitz:    { label: "Blitz Impromptu",  duration: 30, color: "text-orange-500",  bg: "bg-orange-500/10",  desc: "Quick 30s response." },
  standard: { label: "Standard Battle",  duration: 60, color: "text-red-500",     bg: "bg-red-500/10",     desc: "Standard 60s speech." },
  debate:   { label: "Debate Clash",     duration: 90, color: "text-blue-500",    bg: "bg-blue-500/10",    desc: "Extended 90s argument." },
  pitch:    { label: "Speed Pitch",      duration: 45, color: "text-emerald-500", bg: "bg-emerald-500/10", desc: "Fast 45s product pitch." },
};

// ─── Rank colours ────────────────────────────────────────────────────────────
export const getRankColor = (rank: Rank) => {
  switch (rank.name) {
    case "Diamond":  return "text-cyan-600 dark:text-cyan-400 border-cyan-500 dark:border-cyan-400";
    case "Platinum": return "text-teal-600 dark:text-teal-300 border-teal-500 dark:border-teal-300";
    case "Gold":     return "text-amber-600 dark:text-yellow-400 border-amber-500 dark:border-yellow-400";
    case "Silver":   return "text-slate-500 dark:text-gray-300 border-slate-400 dark:border-gray-300";
    case "Bronze":   return "text-orange-700 dark:text-amber-600 border-orange-600 dark:border-amber-600";
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  NEW ELO SYSTEM — performance-based, score-aware, rank-decayed
// ═══════════════════════════════════════════════════════════════════════════════

// ── Constants exposed to the rest of the app ────────────────────────────────
/** Default ELO assigned to a brand-new account. Lands them at Silver II. */
export const STARTING_ELO = 1000;
/** Hard lower bound — accounts cannot fall below this even after many losses. */
export const ELO_FLOOR = 100;
/** One tier (III / II / I) inside a rank. */
export const TIER_SPAN = 200;
/** Total range of a single rank (3 tiers). */
export const RANK_SPAN = TIER_SPAN * 3; // 600
/** Flat penalty applied when the user self-forfeits. */
export const FORFEIT_PENALTY = 30;
/** Bo3 ranked-series multiplier (was 3x in v1; eased to 2x). */
export const BO3_MULTIPLIER = 2.0;
/** Legacy alias — older callers still import this name. */
export const BO3_ELO_MULTIPLIER = BO3_MULTIPLIER;

// ── Rank thresholds ─────────────────────────────────────────────────────────
// With STARTING_ELO = 1000 a new player begins inside Silver (II).
//   Bronze:   0   – 599
//   Silver:   600 – 1199   ← new players spawn here
//   Gold:    1200 – 1799
//   Platinum:1800 – 2399
//   Diamond: 2400 +
const RANK_THRESHOLDS: { name: RankName; min: number }[] = [
  { name: "Bronze",   min: 0    },
  { name: "Silver",   min: 600  },
  { name: "Gold",     min: 1200 },
  { name: "Platinum", min: 1800 },
  { name: "Diamond",  min: 2400 },
];

/** Derive rank + tier from a raw ELO value. */
export const getRankFromElo = (elo: number): Rank => {
  const e = Math.max(0, elo);
  // Walk thresholds — last one whose min we exceed is our rank.
  let rank = RANK_THRESHOLDS[0];
  for (const r of RANK_THRESHOLDS) {
    if (e >= r.min) rank = r;
  }
  const offset = e - rank.min;
  let tier: RankTier = "III";
  if (offset >= TIER_SPAN * 2) tier = "I";
  else if (offset >= TIER_SPAN) tier = "II";
  return { name: rank.name, tier };
};

/**
 * Where am I inside my rank, and how far to the next?
 * Used by the Arena progress-bar UI so it no longer hardcodes a 400-ELO span.
 */
export const getNextRankInfo = (elo: number): {
  rankFloor: number;
  nextRankFloor: number;
  offsetInRank: number;
  pointsToNext: number;
  isMaxRank: boolean;
} => {
  const e = Math.max(0, elo);
  let rankFloor = RANK_THRESHOLDS[0].min;
  let nextRankFloor = RANK_THRESHOLDS[1]?.min ?? rankFloor + RANK_SPAN;
  let isMaxRank = false;
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (e >= RANK_THRESHOLDS[i].min) {
      rankFloor = RANK_THRESHOLDS[i].min;
      if (i + 1 < RANK_THRESHOLDS.length) {
        nextRankFloor = RANK_THRESHOLDS[i + 1].min;
        isMaxRank = false;
      } else {
        // Already at the top rank — show progress within the rank itself.
        nextRankFloor = rankFloor + RANK_SPAN;
        isMaxRank = true;
      }
    }
  }
  return {
    rankFloor,
    nextRankFloor,
    offsetInRank: e - rankFloor,
    pointsToNext: Math.max(0, nextRankFloor - e),
    isMaxRank,
  };
};

// ── Placement matches ───────────────────────────────────────────────────────
export const PLACEMENT_MATCHES_REQUIRED = 5;
export const getMatchesPlayed = (profile: UserProfile): number =>
  (profile?.wins ?? 0) + (profile?.losses ?? 0);
export const isInPlacement = (profile: UserProfile): boolean =>
  getMatchesPlayed(profile) < PLACEMENT_MATCHES_REQUIRED;
export const getPlacementProgress = (profile: UserProfile): number =>
  Math.min(getMatchesPlayed(profile), PLACEMENT_MATCHES_REQUIRED);

// ── Seasons (unchanged) ─────────────────────────────────────────────────────
const SEASON_START_DATE = new Date("2026-04-01T00:00:00Z").getTime();
const SEASON_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const getSeasonInfo = (now: number = Date.now()) => {
  const elapsed = Math.max(0, now - SEASON_START_DATE);
  const seasonNumber = Math.floor(elapsed / SEASON_DURATION_MS) + 1;
  const seasonStart = SEASON_START_DATE + (seasonNumber - 1) * SEASON_DURATION_MS;
  const seasonEnd = seasonStart + SEASON_DURATION_MS;
  const daysRemaining = Math.max(0, Math.ceil((seasonEnd - now) / (24 * 60 * 60 * 1000)));
  const daysElapsed = Math.max(0, Math.floor((now - seasonStart) / (24 * 60 * 60 * 1000)));
  const progressPct = Math.min(100, Math.round((daysElapsed / 30) * 100));
  return { seasonNumber, daysRemaining, daysElapsed, progressPct, seasonStart, seasonEnd };
};

// ── ELO formula ─────────────────────────────────────────────────────────────
// Performance-based: combines the standard chess-ELO expected-score with the
// actual judge-scored margin of victory, plus a small absolute-quality nudge.
//
//    delta = K × (perfMargin − expectedMargin)  +  Q × qualityBonus
//
//  • perfMargin     ∈ [-1, +1]  signed (myScore − oppScore) / 100
//  • expectedMargin ∈ [-1, +1]  derived from current ratings
//  • qualityBonus   ∈ [-0.5, +0.5]  myScore/100 − 0.5  (rewards strong absolute scores)
//
// Then we apply mode multiplier, AI damping, Bo3 multiplier, single-match caps,
// and a hard rule that a sub-30 score never gains ELO.

export interface EloComputationInput {
  myElo: number;
  oppElo: number;
  /** AI-judge score 0-100, or null if unknown (falls back to binary win/loss). */
  myScore: number | null;
  /** Opponent AI-judge score 0-100, or null. */
  oppScore: number | null;
  matchesPlayed: number;
  mode: Gamemode;
  isAi?: boolean;
  bo3?: boolean;
  isTie?: boolean;
  /** "self" = user forfeited; "opponent" = other side forfeited. */
  isForfeit?: "self" | "opponent" | null;
}

// K-factor decays as players climb — protects top of ladder, accelerates new players.
function getKFactor(myElo: number, matchesPlayed: number): number {
  if (matchesPlayed < PLACEMENT_MATCHES_REQUIRED) return 48; // placement: 2x fast calibration
  if (myElo < 600)  return 32;  // Bronze
  if (myElo < 1200) return 28;  // Silver
  if (myElo < 1800) return 24;  // Gold
  if (myElo < 2400) return 20;  // Platinum
  return 16;                    // Diamond
}

// Mode weighting — longer / harder formats move ELO more.
const MODE_MULTIPLIERS: Record<Gamemode, number> = {
  blitz:    0.80,
  pitch:    0.90,
  standard: 1.00,
  debate:   1.20,
};

const AI_DAMPING = 0.75;       // AI matches still count, but discount the grind
const QUALITY_COEF = 8;        // weight of the absolute-quality nudge
const MAX_SINGLE_GAIN = 50;
const MAX_SINGLE_LOSS = 40;
const LOW_SCORE_PENALTY_CAP = 8; // a sub-30 score loses at most 8 ELO

export function computeEloChange(input: EloComputationInput): number {
  const {
    myElo, oppElo, myScore, oppScore,
    matchesPlayed, mode, isAi, bo3, isTie, isForfeit,
  } = input;

  // ── Forfeit short-circuit ─────────────────────────────────────────────
  if (isForfeit === "self") return -FORFEIT_PENALTY;
  if (isForfeit === "opponent") {
    // Award the gain we'd give for a clean 80-20 win.
    return computeEloChange({
      myElo, oppElo,
      myScore: 80, oppScore: 20,
      matchesPlayed, mode, isAi, bo3,
    });
  }

  // ── Expected outcome (chess ELO) ─────────────────────────────────────
  const expectedScore  = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  const expectedSigned = 2 * expectedScore - 1; // map [0,1] → [-1,+1]

  // ── Actual performance + quality ─────────────────────────────────────
  let perfMargin: number;
  let qualityBonus: number;
  const haveScores = myScore != null && oppScore != null && (myScore > 0 || oppScore > 0);

  if (haveScores) {
    perfMargin   = (myScore! - oppScore!) / 100;          // signed margin
    qualityBonus = (myScore! / 100) - 0.5;                // absolute quality
  } else if (isTie) {
    perfMargin = 0;
    qualityBonus = 0;
  } else {
    // Unknown scores — fall back to binary win/loss using whichever side scored higher
    perfMargin = 0;
    qualityBonus = 0;
  }

  const K = getKFactor(myElo, matchesPlayed);
  let delta = K * (perfMargin - expectedSigned) + QUALITY_COEF * qualityBonus;

  // ── Multipliers ─────────────────────────────────────────────────────
  delta *= MODE_MULTIPLIERS[mode] ?? 1.0;
  if (isAi) delta *= AI_DAMPING;
  if (bo3)  delta *= BO3_MULTIPLIER;

  // ── Single-match swing cap ──────────────────────────────────────────
  delta = Math.max(-MAX_SINGLE_LOSS, Math.min(MAX_SINGLE_GAIN, delta));

  // ── A near-silent performance never earns ELO ───────────────────────
  if (myScore != null && myScore < 30 && delta > 0) {
    delta = -Math.min(LOW_SCORE_PENALTY_CAP, Math.abs(delta) || 1);
  }

  // ── Minimum non-zero swing on decisive outcomes ─────────────────────
  const rounded = Math.round(delta);
  if (rounded === 0 && !isTie) {
    if (perfMargin > 0) return 1;
    if (perfMargin < 0) return -1;
    // No scores supplied → respect expected-margin direction
    return expectedSigned > 0 ? -1 : 1;
  }
  return rounded;
}

/**
 * Pre-match preview of ELO at stake on a clean win.
 * Used by the matchmaker UI — shows "+X ELO if you win."
 */
export const estimateEloAtStake = (
  myElo: number,
  oppElo: number = myElo,
  bo3: boolean = false,
  mode: Gamemode = "standard",
  matchesPlayed: number = PLACEMENT_MATCHES_REQUIRED, // assume past placement by default
): number => {
  return Math.max(1, computeEloChange({
    myElo, oppElo,
    myScore: 75, oppScore: 50,
    matchesPlayed, mode, isAi: false, bo3,
  }));
};
