import { rankFor, ALL_RANKS } from "@/lib/rank";

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
  const rank = rankFor(xp);
  const sizeClass = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 text-white font-semibold ${sizeClass.container}`}>
      <span className={sizeClass.icon}>{rank.emblem}</span>
      {showLabel && <span>{rank.name}</span>}
    </div>
  );
}
