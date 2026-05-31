import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Zap, Trophy, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { useSyncedStreak } from "@/hooks/useRecordings";
import { useMyXp } from "@/hooks/useLeaderboard";
import { useArena } from "@/hooks/useArena";
import { getRankEmblem } from "@/hooks/arenaUtils";

// Side-by-side comparison of the user against their friends. All three metrics
// (streak / XP / ELO) are already fetched per friend by FriendsContext, so the
// toggle is essentially free. Framed as friendly competition — "catch up", not
// "you're losing".

type Metric = "streak" | "xp" | "elo";

const METRICS: Record<Metric, { label: string; icon: typeof Flame; color: string; fmt: (v: number) => string }> = {
  streak: { label: "Streak", icon: Flame, color: "text-orange-500", fmt: (v) => `${v}` },
  xp: { label: "XP", icon: Zap, color: "text-primary", fmt: (v) => v.toLocaleString() },
  elo: { label: "ELO", icon: Trophy, color: "text-amber-500", fmt: (v) => v.toLocaleString() },
};

interface Row {
  id: string;
  name: string;
  isMe: boolean;
  streak: number;
  bestStreak: number;
  xp: number;
  elo: number;
}

export const FriendsCompare = ({ defaultMetric = "streak" }: { defaultMetric?: Metric }) => {
  const { user } = useAuth();
  const { friends, loading } = useFriends();
  const { count: myStreak, best: myBest } = useSyncedStreak();
  const { xp: myXp } = useMyXp();
  const { profile } = useArena();
  const [metric, setMetric] = useState<Metric>(defaultMetric);

  const displayName =
    (user?.user_metadata as any)?.display_name ?? user?.email?.split("@")[0] ?? "You";

  const valueOf = (r: Row, m: Metric) => (m === "streak" ? r.streak : m === "xp" ? r.xp : r.elo);

  const rows = useMemo<(Row & { place: number; value: number })[]>(() => {
    const me: Row = {
      id: user?.id ?? "me",
      name: displayName,
      isMe: true,
      streak: myStreak,
      bestStreak: myBest,
      xp: myXp,
      elo: profile?.elo ?? 0,
    };
    const fr: Row[] = friends.map((f) => ({
      id: f.id,
      name: f.display_name,
      isMe: false,
      streak: f.streak,
      bestStreak: f.bestStreak,
      xp: f.xp,
      elo: f.elo,
    }));
    return [me, ...fr]
      .sort((a, b) => valueOf(b, metric) - valueOf(a, metric))
      .map((r, i) => ({ ...r, place: i + 1, value: valueOf(r, metric) }));
  }, [friends, myStreak, myBest, myXp, profile?.elo, metric, user?.id, displayName]);

  const myPlace = rows.find((r) => r.isMe)?.place ?? 1;
  const cfg = METRICS[metric];
  const MetricIcon = cfg.icon;

  return (
    <div className="glass-card rounded-[2.5rem] p-6 md:p-12 space-y-6 md:space-y-8 relative overflow-hidden">
      {/* Header + metric toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40">Friends</p>
        </div>
        <div className="flex gap-1 p-1 bg-muted/20 rounded-full">
          {(Object.keys(METRICS) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                metric === m
                  ? "bg-primary text-white shadow-glow"
                  : "opacity-40 hover:opacity-100",
              )}
            >
              {METRICS[m].label}
            </button>
          ))}
        </div>
      </div>

      {loading && friends.length === 0 ? (
        <p className="text-sm opacity-30 italic text-center py-10">Loading friends…</p>
      ) : friends.length === 0 ? (
        /* Empty state — no shaming, just an invite to make it social. */
        <div className="text-center py-10 space-y-5">
          <Users className="h-12 w-12 mx-auto text-primary opacity-20" />
          <div className="space-y-1.5">
            <p className="speak-serif text-xl md:text-2xl italic">Practice is better with friends.</p>
            <p className="text-sm opacity-40 max-w-sm mx-auto leading-relaxed">
              Add a friend to see how your {cfg.label.toLowerCase()} stacks up — and keep each other going.
            </p>
          </div>
          <Link
            to="/friends"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow hover:scale-105 transition-transform"
          >
            Add friends <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Your standing summary */}
          <p className="text-sm font-medium opacity-60">
            You're <span className="text-primary font-black">#{myPlace}</span> of {rows.length} by{" "}
            {cfg.label.toLowerCase()}
            {metric === "streak" && myPlace > 1 && (
              <>
                {" "}— {rows[myPlace - 2].value - rows.find((r) => r.isMe)!.value} day
                {rows[myPlace - 2].value - rows.find((r) => r.isMe)!.value === 1 ? "" : "s"} behind {rows[myPlace - 2].name}.
              </>
            )}
            {myPlace === 1 && <> — you're leading. 🔥</>}
          </p>

          {/* Ranked rows */}
          <div className="space-y-2">
            {rows.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl border transition-colors",
                  r.isMe
                    ? "bg-primary/[0.06] border-primary/30"
                    : "bg-muted/10 border-border/60 hover:border-primary/20",
                )}
              >
                <span
                  className={cn(
                    "w-6 text-center speak-serif text-lg italic font-bold tabular-nums shrink-0",
                    r.place === 1 ? "text-amber-500" : "opacity-30",
                  )}
                >
                  {r.place}
                </span>

                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-bold truncate", r.isMe && "text-primary")}>
                    {r.name}
                    {r.isMe && " (you)"}
                  </p>
                  {metric === "streak" && (
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">
                      Best {r.bestStreak}
                    </p>
                  )}
                  {metric === "elo" && (
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">
                      {getRankEmblem(r.elo >= 2400 ? "Diamond" : r.elo >= 1800 ? "Platinum" : r.elo >= 1200 ? "Gold" : r.elo >= 600 ? "Silver" : "Bronze")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <MetricIcon className={cn("h-4 w-4", cfg.color)} />
                  <span className="speak-serif text-lg md:text-xl font-bold italic tabular-nums">
                    {cfg.fmt(r.value)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
