import { Trophy, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { rankFor } from "@/lib/rank";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/context/AuthContext";
import { useInView } from "@/hooks/useInView";

export const Progress = () => {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const { rows, loading } = useLeaderboard(5);
  const { user } = useAuth();

  const topFive = rows.slice(0, 5);

  const getMedalEmoji = (position: number) => {
    switch (position) {
      case 1: return "🏆";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return null;
    }
  };

  return (
    <section id="progress" className="container py-24 md:py-32 border-t border-border" ref={ref}>
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div className={isInView ? "animate-fade-right" : "opacity-0"}>
          <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-6">
            <span className="h-px w-10 bg-primary" />
            Leaderboard
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-balance mb-8">
            See how you <em className="text-primary not-italic">rank</em> against others.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed text-pretty mb-10 max-w-lg">
            Practice daily, earn XP, and climb the leaderboard. Join thousands of speakers competing for the top spot.
          </p>
          <Link to="/leaderboard" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            View Full Leaderboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Card className={`bg-card-gradient border border-border rounded-3xl shadow-soft overflow-hidden ${isInView ? "animate-scale-in" : "opacity-0"}`} style={{ animationDelay: "200ms" }}>
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                <CardTitle>Top Speakers</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {loading ? (
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
              topFive.map((entry, index) => {
                const rankData = rankFor(entry.xp);
                const isCurrentUser = entry.id === user?.id;
                const medal = getMedalEmoji(index + 1);
                const position = index + 1;

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors border-2 border-transparent ${
                      isCurrentUser ? "border-primary bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-5 text-center font-semibold">
                        {medal || `#${position}`}
                      </div>
                      <div className="text-xl flex-shrink-0">{rankData.emblem}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm truncate">
                          {entry.display_name}
                          {isCurrentUser && <Badge className="ml-2 bg-primary text-primary-foreground text-xs">You</Badge>}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-bold text-foreground">{entry.xp.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};