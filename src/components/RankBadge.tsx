import { RANK_SYSTEM, getRankFromXP, type Rank } from "@/lib/xp-system";

interface RankBadgeProps {
  xp: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizeMap = {
  sm: { icon: "text-lg", container: "px-2 py-1 text-xs" },
  md: { icon: "text-2xl", container: "px-3 py-2 text-sm" },
  lg: { icon: "text-4xl", container: "px-4 py-3 text-base" },
};

export function RankBadge({ xp, size = "md", showLabel = true }: RankBadgeProps) {
  const rank = getRankFromXP(xp);
  const rankData = RANK_SYSTEM[rank];
  const sizeClass = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${rankData.color} text-white font-semibold ${sizeClass.container}`}>
      <span className={sizeClass.icon}>{rankData.icon}</span>
      {showLabel && <span>{rank}</span>}
    </div>
  );
}
