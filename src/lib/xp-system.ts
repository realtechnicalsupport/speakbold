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
