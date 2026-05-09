import { Rank, RankName, RankTier } from "@/context/ArenaContext";

export const GAMEMODES = {
  blitz: { label: "Blitz Impromptu", duration: 30, color: "text-orange-500", bg: "bg-orange-500/10", desc: "Quick 30s response." },
  standard: { label: "Standard Battle", duration: 60, color: "text-red-500", bg: "bg-red-500/10", desc: "Standard 60s speech." },
  debate: { label: "Debate Clash", duration: 90, color: "text-blue-500", bg: "bg-blue-500/10", desc: "Extended 90s argument." },
  pitch: { label: "Speed Pitch", duration: 45, color: "text-emerald-500", bg: "bg-emerald-500/10", desc: "Fast 45s product pitch." },
};

export const getRankColor = (rank: Rank) => {
  switch (rank.name) {
    case "Diamond": return "text-cyan-600 dark:text-cyan-400 border-cyan-500 dark:border-cyan-400";
    case "Platinum": return "text-teal-600 dark:text-teal-300 border-teal-500 dark:border-teal-300";
    case "Gold": return "text-amber-600 dark:text-yellow-400 border-amber-500 dark:border-yellow-400";
    case "Silver": return "text-slate-500 dark:text-gray-300 border-slate-400 dark:border-gray-300";
    case "Bronze": return "text-orange-700 dark:text-amber-600 border-orange-600 dark:border-amber-600";
  }
};

export const getRankFromElo = (elo: number): Rank => {
  const ranks: RankName[] = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
  const maxRankIndex = ranks.length - 1;
  const rankIndex = Math.min(Math.floor(elo / 400), maxRankIndex);
  const name = ranks[rankIndex];
  
  // Cap at Diamond I if ELO goes beyond the final tier threshold
  if (elo >= (maxRankIndex * 400) + 266) {
    return { name, tier: "I" };
  }
  
  const pointsInRank = elo % 400;
  let tier: RankTier = "III";
  if (pointsInRank >= 266) tier = "I";
  else if (pointsInRank >= 133) tier = "II";
  
  return { name, tier };
};
