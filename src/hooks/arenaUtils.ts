import { Rank, RankName, RankTier, UserProfile, Gamemode } from "@/context/ArenaContext";

// ─── Gamemode catalogue ──────────────────────────────────────────────────────
export const GAMEMODES = {
  blitz:    { label: "Blitz Impromptu",  duration: 30, color: "text-orange-500",  bg: "bg-orange-500/10",  desc: "Quick 30s response." },
  standard: { label: "Standard Battle",  duration: 60, color: "text-red-500",     bg: "bg-red-500/10",     desc: "Standard 60s speech." },
  debate:   { label: "Debate Clash",     duration: 90, color: "text-blue-500",    bg: "bg-blue-500/10",    desc: "Extended 90s argument." },
  pitch:    { label: "Speed Pitch",      duration: 45, color: "text-emerald-500", bg: "bg-emerald-500/10", desc: "Fast 45s product pitch." },
};

// ─── Rank emblems (used by leaderboards) ────────────────────────────────────
export const getRankEmblem = (name: RankName): string => {
  switch (name) {
    case "Bronze":   return "🥉";
    case "Silver":   return "🥈";
    case "Gold":     return "🥇";
    case "Platinum": return "💎";
    case "Diamond":  return "💠";
  }
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
/** Hard lower bound — ELO cannot go negative. Set to 0 so a manual reset
 *  to 0 isn't silently raised back to 100 by the floor on the next loss. */
export const ELO_FLOOR = 0;
/** One tier (III / II / I) inside a rank. */
export const TIER_SPAN = 200;
/** Total range of a single rank (3 tiers). */
export const RANK_SPAN = TIER_SPAN * 3; // 600
/** Flat penalty applied when the user self-forfeits. */
export const FORFEIT_PENALTY = 30;

/**
 * Is this ELO an *earned* rating, or a brand-new account that hasn't battled?
 * New signups now store `NULL` elo (genuinely unranked — see the
 * 20260601_elo_unranked_default migration) and only get a number after their
 * first completed battle. The legacy cohort was back-filled to exactly
 * `STARTING_ELO`, so we treat that value as unranked too. Such accounts are
 * "unranked" — the leaderboard hides them from the board (`.neq("elo", …)`,
 * which also drops NULLs) and the user's own standing card shows "Unranked"
 * instead of a fabricated rank. Centralised so every surface applies it alike.
 */
export const isRankedElo = (elo: number | null | undefined): boolean =>
  elo != null && elo !== STARTING_ELO;

/**
 * Keep an *earned* rating off the unranked sentinel. STARTING_ELO does double
 * duty as the "no rating yet" marker (see isRankedElo + the leaderboard's
 * `.neq("elo", STARTING_ELO)` filter), so a ranked player whose ELO happens to
 * drift onto exactly 1000 through normal wins/losses would be wrongly hidden
 * from the board and shown as "Unranked". Nudge by +1 (still the same rank/tier)
 * so an earned rating can never collide with the sentinel. Placement already
 * does this; this covers ordinary win/loss/forfeit drift. Apply only to values
 * that are actually being persisted as a rating.
 */
export const nudgeOffSentinel = (elo: number): number =>
  elo === STARTING_ELO ? STARTING_ELO + 1 : elo;

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

// ── Placement (single match) ─────────────────────────────────────────────────
// Placement is now a one-shot: a new account is "in placement" until its FIRST
// rated battle assigns an ELO (see computePlacementElo). We key this off the
// `ranked` flag the ArenaContext derives from the DB (NULL elo / legacy-1000 =
// unranked) rather than a match counter, so the Arena's "Unranked" state and the
// leaderboard's visibility filter always agree.
export const PLACEMENT_MATCHES_REQUIRED = 5; // retained: still 2x K-factor for the first few matches
export const getMatchesPlayed = (profile: UserProfile): number =>
  (profile?.wins ?? 0) + (profile?.losses ?? 0);
export const isInPlacement = (profile: UserProfile): boolean =>
  profile?.ranked === false;
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

// ── Placement (first rated match) ────────────────────────────────────────────
// A brand-new account has NO rating (NULL elo). Instead of seeding everyone at
// 1000 and nudging, their FIRST completed battle *places* them: the AI judge's
// score margin + the opponent's strength decide an absolute starting ELO. One
// match can't mint Diamond or bottom you out, so the result is clamped to a
// believable first-rating window.
const PLACEMENT_FLOOR = 200;   // worst first placement — low Bronze
const PLACEMENT_CAP   = 1600;  // best first placement — Gold I
const PLACEMENT_MARGIN_COEF  = 4; // weight of (myScore − oppScore)
const PLACEMENT_QUALITY_COEF = 4; // weight of absolute quality (myScore − 50)

export function computeEloChange(input: EloComputationInput): number {
  const {
    myElo, oppElo, myScore, oppScore,
    matchesPlayed, mode, isAi, isTie, isForfeit,
  } = input;

  // ── Forfeit short-circuit ─────────────────────────────────────────────
  if (isForfeit === "self") return -FORFEIT_PENALTY;
  if (isForfeit === "opponent") {
    // Award the gain we'd give for a clean 80-20 win.
    return computeEloChange({
      myElo, oppElo,
      myScore: 80, oppScore: 20,
      matchesPlayed, mode, isAi,
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

  // ── Single-match swing cap ──────────────────────────────────────────
  delta = Math.max(-MAX_SINGLE_LOSS, Math.min(MAX_SINGLE_GAIN, delta));

  // ── Outcome-sign guarantee ──────────────────────────────────────────
  // The performance + quality terms above are a hybrid of chess-ELO and judged
  // margin, so a narrow loss to a stronger opponent (or a high-scoring loss)
  // can come out positive — "you beat expectations" — which reads as a bug
  // when the match history says you LOST. Pin the delta's SIGN to the actual
  // score outcome for decisive, scored matches: a loss never gains rating, a
  // win never loses it. Magnitudes (incl. genuine upset wins) are untouched —
  // only sign mismatches are corrected.
  if (haveScores && !isTie && myScore != null && oppScore != null && myScore !== oppScore) {
    const iWon = myScore > oppScore;
    if (!iWon && delta > 0) {
      delta = -Math.min(LOW_SCORE_PENALTY_CAP, Math.abs(delta) || 1);
    } else if (iWon && delta < 0) {
      delta = Math.min(LOW_SCORE_PENALTY_CAP, Math.abs(delta) || 1);
    }
  }

  // ── Minimum non-zero swing on decisive outcomes ─────────────────────
  const rounded = Math.round(delta);
  if (rounded === 0 && !isTie) {
    if (myScore != null && myScore < 30) return (oppScore != null && myScore > oppScore) ? 1 : -1;
    if (perfMargin > 0) return 1;
    if (perfMargin < 0) return -1;
    // No scores supplied → respect expected-margin direction
    return expectedSigned > 0 ? -1 : 1;
  }
  return rounded;
}

/**
 * Place an unranked player from the result of their FIRST rated battle.
 * Anchored to the opponent's level, then pushed up/down by how decisively the
 * judge scored them (relative margin) and how strong their speech was on its own
 * (absolute quality). AI matches are damped so a single bot win can't over-place.
 * The output is clamped to [PLACEMENT_FLOOR, PLACEMENT_CAP] — one match decides a
 * starting rank, not the whole ladder.
 */
export function computePlacementElo(input: {
  oppElo: number;
  myScore: number | null;
  oppScore: number | null;
  isAi?: boolean;
}): number {
  const { oppElo, myScore, oppScore, isAi } = input;
  const me  = myScore  ?? 50;
  const opp = oppScore ?? 50;
  const margin  = me - opp;   // −100..100  performance vs this opponent
  const quality = me - 50;    // −50..50    absolute quality of the speech
  let push = margin * PLACEMENT_MARGIN_COEF + quality * PLACEMENT_QUALITY_COEF;
  if (isAi) push *= AI_DAMPING;
  const placement = Math.round(Math.max(PLACEMENT_FLOOR, Math.min(PLACEMENT_CAP, oppElo + push)));
  // Never place exactly on the unranked sentinel (STARTING_ELO) — that value is
  // treated as "no rating" and would re-hide a player who just earned one.
  return nudgeOffSentinel(placement);
}

/**
 * Pre-match preview of ELO at stake on a clean win.
 * Used by the matchmaker UI — shows "+X ELO if you win."
 */
export const estimateEloAtStake = (
  myElo: number,
  oppElo: number = myElo,
  mode: Gamemode = "standard",
  matchesPlayed: number = PLACEMENT_MATCHES_REQUIRED, // assume past placement by default
): number => {
  return Math.max(1, computeEloChange({
    myElo, oppElo,
    myScore: 75, oppScore: 50,
    matchesPlayed, mode, isAi: false,
  }));
};
