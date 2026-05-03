import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  RANK_SYSTEM,
  getRankFromXP,
  getXPProgressInRank,
  getPercentageToNextRank,
  RANKS_ORDERED,
} from "@/lib/xp-system";

interface XPCardProps {
  totalXP: number;
  displayName?: string;
  variant?: "compact" | "detailed";
  showAnimation?: boolean;
}

export function XPCard({
  totalXP,
  displayName,
  variant = "detailed",
  showAnimation = false,
}: XPCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  const currentRank = getRankFromXP(totalXP);
  const rankData = RANK_SYSTEM[currentRank];
  const { current: xpInRank, max: xpToNextRank } = getXPProgressInRank(totalXP);
  const progressPercent = getPercentageToNextRank(totalXP);
  const currentRankIndex = RANKS_ORDERED.indexOf(currentRank);
  const nextRankIndex = currentRankIndex + 1;
  const nextRank = nextRankIndex < RANKS_ORDERED.length ? RANKS_ORDERED[nextRankIndex] : null;

  if (variant === "compact") {
    return (
      <Card className="border-0 bg-gradient-to-br shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Rank</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl">{rankData.icon}</span>
                <div>
                  <p className="font-bold text-lg">{currentRank}</p>
                  <p className="text-xs text-gray-500">{totalXP.toLocaleString()} XP</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-0 bg-gradient-to-br ${rankData.color} shadow-xl overflow-hidden`}>
      <CardContent className="p-6 text-white">
        {/* Header with rank icon and title */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm opacity-90">Current Rank</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-5xl">{rankData.icon}</span>
              <div>
                <h2 className="text-3xl font-bold">{currentRank}</h2>
                <p className="text-sm opacity-80">Level {currentRankIndex + 1}</p>
              </div>
            </div>
          </div>
          <Badge className="bg-white text-gray-900 font-bold">
            {totalXP.toLocaleString()} XP
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="opacity-90">Progress to next rank</span>
            <span className="font-semibold">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-3 bg-white/20" />
          <div className="flex justify-between text-xs opacity-75">
            <span>{xpInRank.toLocaleString()} XP</span>
            {nextRank && (
              <span>{xpToNextRank.toLocaleString()} to {nextRank}</span>
            )}
          </div>
        </div>

        {/* Next rank preview */}
        {nextRank && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-sm opacity-80 mb-3">Next Rank</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{RANK_SYSTEM[nextRank].icon}</span>
              <div>
                <p className="font-semibold">{nextRank}</p>
                <p className="text-xs opacity-75">
                  {(RANK_SYSTEM[nextRank].minXP - totalXP).toLocaleString()} XP to go
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
