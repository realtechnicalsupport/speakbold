import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Crown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getRankFromElo, getRankColor, STARTING_ELO, isRankedElo } from "@/hooks/arenaUtils";
import { arenaEmitter } from "@/lib/events";

interface LeaderRow {
  id: string;
  name: string;
  elo: number;
}

export const ArenaLeaderboardPreview = () => {
  const { user } = useAuth();
  const [top, setTop] = useState<LeaderRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myRanked, setMyRanked] = useState(true);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    if (!user) return;
    try {
      // Top 5 — exclude default-ELO accounts (legacy + never-played) and 0-ELO
      // (junk/test data or a manual reset).
      const { data: topData } = await supabase
        .from("profiles")
        .select("id, display_name, elo")
        .neq("elo", STARTING_ELO)
        .gt("elo", 0)
        .order("elo", { ascending: false })
        .limit(5);

      // My ELO
      const { data: meData } = await supabase
        .from("profiles")
        .select("elo")
        .eq("id", user.id)
        .maybeSingle();

      // Total ranked players (excludes default-ELO and 0-ELO accounts).
      const { count: total } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .neq("elo", STARTING_ELO)
        .gt("elo", 0);

      setTop(
        (topData || []).map((r: any) => ({
          id: r.id,
          name: r.display_name || "Anonymous",
          elo: r.elo ?? 0,
        }))
      );
      setTotalPlayers(total ?? 0);

      // A fresh account still at the default ELO is unranked — don't fabricate
      // a position for a rating it hasn't earned.
      const myElo = meData?.elo ?? 0;
      const ranked = isRankedElo(myElo);
      setMyRanked(ranked);
      if (ranked) {
        // Ranked players above me (= my rank - 1), excluding default-ELO accounts.
        const { count: above } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .neq("elo", STARTING_ELO)
          .gt("elo", myElo);
        setMyRank((above ?? 0) + 1);
      } else {
        setMyRank(null);
      }
    } catch (err) {
      console.error("[ArenaLeaderboardPreview] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Re-fetch whenever a battle moves ELO so the board never shows a stale
  // value (e.g. the user's own freshly-changed rating snapping back to 1000).
  useEffect(() => {
    const onEloUpdate = () => fetchLeaderboard();
    arenaEmitter.on("elo:updated", onEloUpdate);
    return () => arenaEmitter.off("elo:updated", onEloUpdate);
  }, [fetchLeaderboard]);

  const myPercentile = myRank && totalPlayers > 0
    ? Math.max(1, Math.round((myRank / totalPlayers) * 100))
    : null;

  return (
    <div className="p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-500/5 via-muted/20 to-muted/20 border border-amber-500/20 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 opacity-10">
        <Trophy className="h-32 w-32 text-amber-500" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.4em] text-amber-600 dark:text-amber-400">
            <Crown className="h-4 w-4" />
            GLOBAL RANKINGS
          </div>
          <Link
            to="/leaderboard"
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
          >
            FULL BOARD
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Your placement */}
        {!loading && !myRanked && (
          <div className="mb-5 p-4 rounded-2xl bg-background/50 border border-border/60">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">YOUR RANK</p>
            <div className="flex items-baseline gap-2">
              <span className="speak-serif text-3xl font-bold italic opacity-50">Unranked</span>
            </div>
            <p className="text-[10px] font-bold opacity-40 mt-1">Win an Arena battle to earn your rating.</p>
          </div>
        )}
        {myRanked && myRank !== null && (
          <div className="mb-5 p-4 rounded-2xl bg-background/50 border border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">YOUR RANK</p>
                <div className="flex items-baseline gap-2">
                  <span className="speak-serif text-3xl font-bold italic tabular-nums">#{myRank.toLocaleString()}</span>
                  <span className="text-xs font-bold opacity-50">of {totalPlayers.toLocaleString()}</span>
                </div>
              </div>
              {myPercentile && (
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">TOP</p>
                  <p className={cn(
                    "speak-serif text-3xl font-bold italic tabular-nums",
                    myPercentile <= 1 ? "text-amber-500" :
                    myPercentile <= 10 ? "text-cyan-500" :
                    myPercentile <= 25 ? "text-emerald-500" :
                    "text-foreground/60"
                  )}>{myPercentile}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top 5 */}
        <div className="space-y-2">
          {loading && (
            <p className="text-xs opacity-30 italic text-center py-6">Loading rankings...</p>
          )}
          {!loading && top.length === 0 && (
            <p className="text-xs opacity-30 italic text-center py-6">No ranked players yet.</p>
          )}
          {top.map((row, i) => {
            const rank = getRankFromElo(row.elo);
            const isMe = row.id === user?.id;
            const isChampion = i === 0;
            const medalColor =
              i === 0 ? "text-amber-500" :
              i === 1 ? "text-slate-400" :
              i === 2 ? "text-orange-600" :
              "text-foreground/30";

            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ x: 2 }}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl transition-colors relative overflow-hidden",
                  isMe ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/20",
                  isChampion && "bg-gradient-to-r from-amber-500/10 to-transparent"
                )}
              >
                {/* Champion shimmer — passive ambient sweep */}
                {isChampion && (
                  <motion.div
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-amber-500/15 to-transparent pointer-events-none"
                    animate={{ x: ["-100%", "400%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
                  />
                )}
                <div className={cn("w-7 text-center speak-serif text-xl italic font-bold tabular-nums relative z-10", medalColor)}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                  <p className={cn("text-xs font-bold truncate", isMe && "text-primary")}>
                    {row.name}{isMe && " (you)"}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    {rank.name} {rank.tier} · {row.elo.toLocaleString()} ELO
                  </p>
                </div>
                <motion.div
                  animate={isChampion ? { scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0 relative z-10",
                    rank.name === "Diamond" && "bg-cyan-500 shadow-[0_0_6px_rgba(34,211,238,0.8)]",
                    rank.name === "Platinum" && "bg-teal-400",
                    rank.name === "Gold" && "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]",
                    rank.name === "Silver" && "bg-slate-400",
                    rank.name === "Bronze" && "bg-orange-700",
                  )}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
