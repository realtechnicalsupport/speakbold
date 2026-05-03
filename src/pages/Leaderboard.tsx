import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RANK_SYSTEM } from "@/lib/xp-system";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/context/AuthContext";
import { useUserXP } from "@/hooks/useUserXP";
import { Trophy, Medal, Zap } from "lucide-react";

export default function Leaderboard() {
  const { leaderboard, isLoading } = useLeaderboard();
  const { user } = useAuth();
  const { userXP } = useUserXP();

  const currentUserPosition = leaderboard.find((entry) => entry.user_id === user?.id)?.position;

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-600" />;
      default:
        return <span className="text-sm font-semibold text-gray-600 w-5">#{position}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 via-amber-500 to-orange-600 bg-clip-text text-transparent">
              Leaderboard
            </h1>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-gray-600">Compete and climb the ranks</p>
        </div>

        {/* User's current position */}
        {currentUserPosition && userXP && (
          <Card className="mb-8 border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">
                    {RANK_SYSTEM[userXP.total_xp >= 12000 ? "Legendary" : userXP.total_xp >= 7000 ? "Master" : userXP.total_xp >= 3500 ? "Expert" : userXP.total_xp >= 1500 ? "Practitioner" : userXP.total_xp >= 500 ? "Apprentice" : "Novice"].icon}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Your Position</p>
                    <p className="text-2xl font-bold text-gray-900">#{currentUserPosition}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total XP</p>
                  <p className="text-2xl font-bold text-blue-600">{userXP.total_xp.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Top Performers
            </CardTitle>
            <CardDescription className="text-gray-300">
              {leaderboard.length} users ranked by total XP
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-4 flex-1">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="w-32 h-4" />
                    </div>
                    <Skeleton className="w-24 h-4" />
                  </div>
                ))
              ) : leaderboard.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No users found. Be the first to earn XP!
                </div>
              ) : (
                leaderboard.map((entry) => {
                  const rankData = RANK_SYSTEM[entry.rank as keyof typeof RANK_SYSTEM];
                  const isCurrentUser = entry.user_id === user?.id;

                  return (
                    <div
                      key={entry.id}
                      className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        isCurrentUser ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 flex justify-center">
                          {getMedalIcon(entry.position)}
                        </div>
                        <div className="text-2xl flex-shrink-0">{rankData.icon}</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {entry.display_name}
                            {isCurrentUser && <Badge className="ml-2 bg-blue-500">You</Badge>}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{entry.rank}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-lg text-gray-900">
                          {entry.total_xp.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">XP</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rank legend */}
        <Card className="mt-8 bg-gradient-to-br from-slate-50 to-slate-100 border-0">
          <CardHeader>
            <CardTitle className="text-lg">Rank System</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(RANK_SYSTEM).map(([rankName, rankData]) => (
                <div key={rankName} className="flex items-center gap-3 p-3 rounded-lg bg-white shadow-sm">
                  <span className="text-3xl">{rankData.icon}</span>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{rankName}</p>
                    <p className="text-xs text-gray-600">{rankData.minXP.toLocaleString()} XP</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
