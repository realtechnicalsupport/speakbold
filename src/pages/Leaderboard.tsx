import { Link, Navigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { rankFor, rankProgress, ALL_RANKS } from "@/lib/rank";
import { cn } from "@/lib/utils";

const rankBadgeColor = (place: number) => {
  if (place === 1) return "bg-amber-400 text-amber-950"; // Gold
  if (place === 2) return "bg-zinc-300 text-zinc-800"; // Silver
  if (place === 3) return "bg-orange-400 text-orange-950"; // Bronze
  return "bg-muted text-muted-foreground";
};

const Leaderboard = () => {
  const { user, loading } = useAuth();
  const { rows, me, loading: lbLoading } = useLeaderboard(50);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const myRank = me ? rankFor(me.xp) : null;
  const myProg = me ? rankProgress(me.xp) : null;

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-spotlight opacity-70" />
        <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-accent/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="container relative py-16 md:py-20">
          <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.25em] uppercase mb-3">
            <span className="h-px w-10 bg-primary" /> The room is watching
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-semibold leading-tight max-w-3xl">
            The <em className="not-italic text-primary">leaderboard</em>.
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl">
            Every recording earns XP. Rank up by showing up, day after day.
          </p>

          {/* My card */}
          {me && myRank && myProg && me.xp > 0 && (
            <div className="mt-10 grid md:grid-cols-3 gap-5">
              <div className="md:col-span-2 relative bg-card-gradient border border-primary/40 rounded-3xl p-6 md:p-8 overflow-hidden">
                <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
                <div className="flex items-center justify-between gap-4 relative">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
                      Your standing
                    </p>
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-5xl md:text-6xl font-semibold tabular-nums">
                        #{me.rank}
                      </span>
                      <span className="text-muted-foreground text-sm">on the global board</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl md:text-4xl">{myRank.emblem}</div>
                    <p className="font-display text-xl font-semibold mt-1">{myRank.name}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">
                      Tier {myRank.tier}
                    </p>
                  </div>
                </div>

                <div className="mt-6 relative">
                  <div className="flex items-center justify-between text-xs font-mono mb-2 text-muted-foreground">
                    <span className="text-foreground">{me.xp} XP</span>
                    <span>
                      {myRank.next == null
                        ? "Top tier reached"
                        : `${myRank.next - me.xp} XP to ${ALL_RANKS[myRank.tier]?.name}`}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warm rounded-full transition-all duration-700"
                      style={{ width: `${myProg.pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card-gradient border border-border rounded-3xl p-6 md:p-8">
                <Sparkles className="h-5 w-5 text-accent mb-3" />
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                  How to earn XP
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>· +10 XP per recorded attempt</li>
                  <li>· +1 XP per 10 seconds spoken</li>
                  <li>· +5 XP for your first record of the day</li>
                </ul>
                <Button variant="hero" size="sm" className="mt-5" asChild>
                  <Link to="/tracks/impromptu">
                    Earn XP <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Board */}
      <section className="container py-12 md:py-16">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold">
              Top <em className="text-primary not-italic">speakers</em>
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              The 50 highest-XP voices, refreshed in real time.
            </p>
          </div>
          <Link
            to="/profile"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View your profile →
          </Link>
        </div>

        {lbLoading ? (
          <div className="text-muted-foreground text-sm">Loading the room…</div>
        ) : rows.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-10 text-center">
            <p className="text-muted-foreground">
              No XP earned yet. Be the first voice on the board.
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, i) => {
              const r = rankFor(row.xp);
              const isMe = row.id === user.id;
              const place = i + 1;
              return (
                <li
                  key={row.id}
                  className={cn(
                    "group relative bg-card-gradient border rounded-2xl p-4 md:p-5 flex items-center gap-4 transition-all",
                    isMe
                      ? "border-primary/60 shadow-glow"
                      : "border-border hover:border-primary/30",
                    place <= 3 && "border-amber-400/30",
                  )}
                >
                  <div
                    className={cn(
                      "h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center shrink-0 font-display text-xl md:text-2xl font-semibold",
                      rankBadgeColor(place)
                    )}
                  >
                    {place}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-lg font-semibold truncate">
                        {row.display_name?.trim() || `User ${row.id.slice(0, 8)}...`}
                      </span>
                      {isMe && (
                        <span className="text-[10px] uppercase tracking-widest text-primary font-semibold border border-primary/40 rounded-full px-2 py-0.5">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.name}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-display text-xl md:text-2xl font-semibold tabular-nums">
                      {row.xp}
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      XP
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Ranks legend */}
        <div className="mt-14">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
            The eight ranks
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ALL_RANKS.map((t, i) => (
              <div
                key={t.name}
                className="bg-card-gradient border border-border rounded-2xl p-4"
              >
                <div className="text-2xl">{t.emblem}</div>
                <p className="font-display text-base font-semibold mt-1">{t.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {t.min}+ XP · Tier {i + 1}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Leaderboard;
