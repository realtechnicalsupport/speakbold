// XP rewards per drill / battle. Previously every entry was 5, and the
// lookup at the call site was case-sensitive — meaning the actual values
// flowing through ("Easy"/"Medium"/"Hard"/"Debate"/"Arena") all missed and
// silently fell through to the `|| 20` default. Net effect: every drill
// awarded 20 XP regardless of effort. Now keys are normalised at lookup time
// and difficulty actually matters.

export const XP_REWARDS: Record<string, number> = {
  // Impromptu / general difficulty buckets
  easy:    5,
  medium:  10,
  hard:    20,
  standard: 10,

  // Track-specific labels (passed by track pages on upload)
  impromptu:          10,
  "public-speaking":  10,
  interview:          12,
  "body-language":    10,
  pathway:            12,

  // Competitive modes — longest and most demanding
  arena:   20,
  debate:  25,
};

/** Default reward when no key matches — kept low so unmapped paths don't over-reward. */
export const XP_DEFAULT = 8;

/**
 * Resolve an XP reward from a free-form difficulty / mode string. Matches are
 * case-insensitive so call sites that pass "Easy", "Medium", "Debate", etc.
 * land on the same row as the canonical lowercase keys above.
 */
export function getXpReward(difficulty: string | null | undefined): number {
  if (!difficulty) return XP_DEFAULT;
  const key = difficulty.toLowerCase().trim();
  return XP_REWARDS[key] ?? XP_DEFAULT;
}

// ─── Levels ──────────────────────────────────────────────────────────────────
// Gives the raw XP number meaning. Cumulative XP to *reach* level L is
// 25·(L−1)·L  →  L2:50, L3:150, L4:300, L5:500, L6:750 … a gentle ramp tuned to
// the 5–25 XP-per-drill economy above.

export const LEVEL_TITLES = [
  "Novice", "Apprentice", "Speaker", "Orator",
  "Rhetorician", "Master", "Virtuoso", "Luminary",
];

export interface LevelInfo {
  level: number;
  title: string;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  /** XP span of the current level (next threshold − current threshold). */
  xpForLevel: number;
  /** XP remaining to the next level. */
  xpToNext: number;
  /** 0–100 progress through the current level. */
  progressPct: number;
  isMax: boolean;
}

const cumulativeXpForLevel = (level: number): number => 25 * (level - 1) * level;

export function getLevel(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= safeXp) level++;

  const isMax = level >= LEVEL_TITLES.length;
  const totalForCurrent = cumulativeXpForLevel(level);
  const totalForNext = cumulativeXpForLevel(level + 1);
  const xpIntoLevel = safeXp - totalForCurrent;
  const xpForLevel = totalForNext - totalForCurrent;

  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    xpIntoLevel,
    xpForLevel,
    xpToNext: Math.max(0, totalForNext - safeXp),
    progressPct: isMax ? 100 : Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100)),
    isMax,
  };
}
