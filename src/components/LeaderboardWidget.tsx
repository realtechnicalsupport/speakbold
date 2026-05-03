import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RANK_SYSTEM, type Rank } from "@/lib/xp-system";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/context/AuthContext";
import { Trophy, ArrowRight } from "lucide-react";

export function LeaderboardWidget() {
  const { leaderboard, isLoading } = useLeaderboard();
  const { user } = useAuth();

  const topFive = leaderboard.slice(0, 5);
  const userPosition = leaderboard.find((entry) => entry.user_id === user?.id);

  const getMedalEmoji = (position: number) => {
    switch (position) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return null;
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <CardTitle>Top Speakers</CardTitle>
          </div>
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="w-6 h-6 rounded" />
                <Skeleton className="w-24 h-4" />
              </div>
              <Skeleton className="w-16 h-4" />
            </div>
          ))
        ) : topFive.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-4">No users yet</p>
        ) : (
          topFive.map((entry) => {
            const rankData = RANK_SYSTEM[entry.rank as Rank];
            const isCurrentUser = entry.user_id === user?.id;
            const medal = getMedalEmoji(entry.position);

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  isCurrentUser ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-5 text-center font-semibold">
                    {medal || `#${entry.position}`}
                  </div>
                  <div className="text-xl flex-shrink-0">{rankData.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {entry.display_name}
                      {isCurrentUser && <Badge className="ml-2 bg-blue-500 text-xs">You</Badge>}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="font-bold text-gray-900">{entry.total_xp.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">XP</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
