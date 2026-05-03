// XP System Configuration

export const RANK_SYSTEM = {
  "Novice": { minXP: 0, maxXP: 499, color: "from-gray-400 to-gray-600", icon: "🌱" },
  "Apprentice": { minXP: 500, maxXP: 1499, color: "from-green-400 to-green-600", icon: "📚" },
  "Practitioner": { minXP: 1500, maxXP: 3499, color: "from-blue-400 to-blue-600", icon: "🎯" },
  "Expert": { minXP: 3500, maxXP: 6999, color: "from-purple-400 to-purple-600", icon: "⚡" },
  "Master": { minXP: 7000, maxXP: 11999, color: "from-amber-400 to-amber-600", icon: "👑" },
  "Legendary": { minXP: 12000, maxXP: Infinity, color: "from-red-400 to-red-600", icon: "🔥" },
} as const;

export type Rank = keyof typeof RANK_SYSTEM;

export const RANKS_ORDERED: Rank[] = [
  "Novice",
  "Apprentice",
  "Practitioner",
  "Expert",
  "Master",
  "Legendary",
];

// XP Rewards based on difficulty
export const XP_REWARDS = {
  easy: 10,
  medium: 25,
  hard: 50,
  interview: 40,
  "body-language": 35,
  impromptu: 45,
  "public-speaking": 50,
} as const;

export function getRankFromXP(xp: number): Rank {
  for (const rank of RANKS_ORDERED) {
    const { minXP, maxXP } = RANK_SYSTEM[rank];
    if (xp >= minXP && xp < maxXP) {
      return rank;
    }
  }
  return "Legendary";
}

export function getXPForNextRank(currentXP: number): number {
  const currentRank = getRankFromXP(currentXP);
  const currentRankIndex = RANKS_ORDERED.indexOf(currentRank);
  
  if (currentRankIndex === RANKS_ORDERED.length - 1) {
    return Infinity; // Already at max rank
  }
  
  const nextRank = RANKS_ORDERED[currentRankIndex + 1];
  return RANK_SYSTEM[nextRank].minXP;
}

export function getXPProgressInRank(currentXP: number): { current: number; max: number } {
  const currentRank = getRankFromXP(currentXP);
  const { minXP, maxXP } = RANK_SYSTEM[currentRank];
  
  return {
    current: currentXP - minXP,
    max: maxXP - minXP,
  };
}

export function getPercentageToNextRank(currentXP: number): number {
  const { current, max } = getXPProgressInRank(currentXP);
  return max === 0 ? 100 : (current / max) * 100;
}
