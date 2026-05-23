import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Confetti } from "@/components/Confetti";
import { rankFor, rankProgress, ALL_RANKS } from "@/lib/rank";

interface XPCardProps {
  totalXP: number;
  previousXP?: number;
  displayName?: string;
  variant?: "compact" | "detailed";
}

const rankGradient = (tier: number) => {
  // Tier 6-8: Gold, Tier 3-5: Silver, Tier 1-2: Bronze
  if (tier >= 6) return "from-amber-400 via-amber-500 to-yellow-500"; // Gold
  if (tier >= 3) return "from-zinc-300 via-zinc-400 to-gray-400"; // Silver
  return "from-amber-900 via-orange-900 to-amber-950"; // Bronze (brown)
};

const emblemColor = (tier: number) => {
  if (tier >= 6) return "text-amber-300";
  if (tier >= 3) return "text-zinc-200";
  return "text-amber-700"; // Bronze (brown)
};

export function XPCard({
  totalXP,
  previousXP,
  displayName,
  variant = "detailed",
}: XPCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Detect rank up
  useEffect(() => {
    if (previousXP !== undefined && previousXP < totalXP) {
      const previousRank = rankFor(previousXP);
      const currentRank = rankFor(totalXP);
      if (previousRank.name !== currentRank.name) {
        setShowConfetti(true);
      }
    }
  }, [totalXP, previousXP]);

  const currentRank = rankFor(totalXP);
  const progress = rankProgress(totalXP);
  const currentRankIndex = currentRank.tier - 1;
  const nextRank = ALL_RANKS[currentRankIndex + 1] ?? null;
  const gradient = rankGradient(currentRank.tier);
  const embColor = emblemColor(currentRank.tier);

  if (variant === "compact") {
    return (
      <Card className={`border-0 bg-gradient-to-br ${gradient} shadow-lg`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Current Rank</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-2xl ${embColor}`}>{currentRank.emblem}</span>
                <div>
                  <p className="font-bold text-lg text-white">{currentRank.name}</p>
                  <p className="text-xs text-white/70">{totalXP.toLocaleString()} XP</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {showConfetti && <Confetti />}
      <Card className={`border-0 bg-gradient-to-br ${gradient} shadow-xl overflow-hidden transition-all duration-300`}>
        <CardContent className="p-6 text-white">
          {/* Header with rank icon and title */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm opacity-90">Current Rank</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-5xl ${embColor}`}>{currentRank.emblem}</span>
                <div>
                  <h2 className="text-3xl font-bold">{currentRank.name}</h2>
                  <p className="text-sm opacity-80">Tier {currentRank.tier}</p>
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
              <span className="font-semibold">{progress.pct}%</span>
            </div>
            <Progress value={progress.pct} className="h-3 bg-white/20" />
            <div className="flex justify-between text-xs opacity-75">
              <span>{progress.into.toLocaleString()} XP</span>
              {nextRank && (
                <span>{(nextRank.min - totalXP).toLocaleString()} to {nextRank.name}</span>
              )}
            </div>
          </div>

          {/* Next rank preview */}
          {nextRank && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-sm opacity-80 mb-3">Next Rank</p>
              <div className="flex items-center gap-2">
                <span className={`text-3xl ${emblemColor(nextRank.tier)}`}>{nextRank.emblem}</span>
                <div>
                  <p className="font-semibold">{nextRank.name}</p>
                  <p className="text-xs opacity-75">
                    {(nextRank.min - totalXP).toLocaleString()} XP to go
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
