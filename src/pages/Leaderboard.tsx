import { Link, Navigate } from "react-router-dom";
import { Sparkles, ArrowRight, Trophy, Target, Zap, RefreshCw, Microscope, Swords } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/context/AuthContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { getRankFromElo, getNextRankInfo, getRankEmblem } from "@/hooks/arenaUtils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Ranks rendered in the legend at the bottom of the page.
const ARENA_RANKS: { name: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond"; min: number }[] = [
  { name: "Bronze",   min: 0    },
  { name: "Silver",   min: 600  },
  { name: "Gold",     min: 1200 },
  { name: "Platinum", min: 1800 },
  { name: "Diamond",  min: 2400 },
];

const rankBadgeColor = (place: number) => {
  if (place === 1) return "bg-primary text-white shadow-glow shadow-primary/20 border-primary"; 
  if (place === 2) return "bg-muted/10 border-border/60 text-foreground"; 
  if (place === 3) return "bg-muted/5 border-border/60 text-foreground/60"; 
  return "bg-muted/5 border-border/20 text-muted-foreground/40";
};

const Leaderboard = () => {
  const { user, loading } = useAuth();
  const { rows, me, loading: lbLoading } = useLeaderboard(50);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const myRank = me ? getRankFromElo(me.elo) : null;
  const myRankInfo = me ? getNextRankInfo(me.elo) : null;
  const myProgPct = myRankInfo
    ? Math.min(100, Math.max(0, (myRankInfo.offsetInRank / (myRankInfo.nextRankFloor - myRankInfo.rankFloor || 1)) * 100))
    : 0;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <SiteHeader />
      
      {/* Background Motion */}
      <div className="absolute top-[15%] left-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[130px] animate-float opacity-20 pointer-events-none" style={{ animationDelay: "-3s" }} />

      <div className="container relative z-10 pt-20 md:pt-48 pb-32 lg:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="flex flex-col items-center text-center space-y-6 md:space-y-8 mb-12 md:mb-32"
        >
          <h1 className="speak-serif text-5xl md:text-9xl leading-[0.8] tracking-tighter">
            Global <span className="text-primary italic">Mastery</span>.
          </h1>
          <p className="text-base md:text-2xl font-medium tracking-tight opacity-40 max-w-2xl leading-relaxed">
            Win battles in the Arena to climb the ladder. Your ELO is your rank.
          </p>
        </motion.div>

        {/* User Standing Card */}
        <AnimatePresence>
          {me && myRank && myRankInfo && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1 }}
              className="grid lg:grid-cols-[1fr_400px] gap-6 md:gap-8 mb-12 md:mb-40"
            >
              <div className="relative glass-card rounded-3xl md:rounded-[4rem] p-6 md:p-12 lg:p-20 overflow-hidden shadow-soft group">
                <div className="absolute top-0 right-0 p-8 md:p-16 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-1000">
                  <Trophy className="h-32 w-32 md:h-64 md:w-64 text-primary" />
                </div>

                <div className="relative space-y-8 md:space-y-16">
                  <div className="space-y-3 md:space-y-6">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">My standing</p>
                    <div className="flex items-baseline gap-4 md:gap-8">
                      <span className="speak-serif text-6xl md:text-[12rem] font-bold tracking-tighter tabular-nums italic leading-none">
                        #{me.rank}
                      </span>
                      <span className="text-xs font-black uppercase tracking-widest opacity-20">Position</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 md:gap-16 pt-6 md:pt-16 border-t border-border/60">
                    <div className="space-y-2 md:space-y-4">
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-30">ELO Rating</p>
                      <p className="speak-serif text-3xl md:text-5xl font-bold tabular-nums italic text-primary">{me.elo.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2 md:space-y-4 text-right">
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-30">Rank</p>
                      <div className="flex items-center justify-end gap-2 md:gap-4">
                        <span className="text-2xl md:text-4xl">{getRankEmblem(myRank.name)}</span>
                        <p className="speak-serif text-xl md:text-3xl font-bold uppercase tracking-tighter italic">{myRank.name} {myRank.tier}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-6">
                    <div className="flex items-center justify-between text-[10px] md:text-xs font-black uppercase tracking-widest">
                      <span className="opacity-30">Next rank</span>
                      <span className="text-primary text-right">
                        {myRankInfo.isMaxRank
                          ? "Apex rank reached"
                          : `${myRankInfo.pointsToNext.toLocaleString()} ELO to go`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${myProgPct}%` }}
                        transition={{ duration: 2, ease: "circOut" }}
                        className="h-full bg-primary shadow-glow shadow-primary/40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-3xl md:rounded-[4rem] p-5 md:p-12 space-y-6 md:space-y-12 flex flex-col justify-between relative overflow-hidden shadow-soft">
                <div className="space-y-6 md:space-y-10">
                  <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl md:rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                  </div>
                  <div className="space-y-4 md:space-y-6">
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">How to climb</p>
                    <ul className="space-y-4 md:space-y-6">
                      {[
                        { icon: Swords, label: "Win Arena battles to gain ELO" },
                        { icon: Zap, label: "Higher scores → bigger swings" },
                        { icon: Target, label: "Debate mode moves ELO most" }
                      ].map((rule, i) => (
                        <li key={i} className="text-xs font-black uppercase tracking-widest flex items-center gap-3 md:gap-4 group">
                          <rule.icon className="h-4 w-4 text-primary opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                          <span className="opacity-40 group-hover:opacity-100 transition-opacity">{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Link to="/arena" className="button-pill w-full py-6 flex items-center justify-center gap-4 bg-primary text-white shadow-glow group">
                  <span className="text-xs font-black uppercase tracking-[0.2em]">ENTER THE ARENA</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Board */}
        <section className="space-y-10 md:space-y-20 border-t border-border/60 pt-10 md:pt-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-12">
            <div className="space-y-3 md:space-y-6">
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-primary">
                <RefreshCw className="h-4 w-4 animate-spin-slow" />
                Live rankings
              </div>
              <h2 className="speak-serif text-4xl md:text-8xl leading-none tracking-tighter">
                Top <span className="text-primary italic">speakers</span>.
              </h2>
              <p className="text-sm font-medium tracking-tight opacity-40 max-w-sm leading-relaxed">
                The highest-rated speakers, refreshed in real-time.
              </p>
            </div>
            <Link
              to="/profile"
              className="text-xs font-black uppercase tracking-widest opacity-30 hover:opacity-100 hover:text-primary transition-all flex items-center gap-3"
            >
              My stats <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="max-w-6xl mx-auto">
            {lbLoading ? (
              <div className="py-20 md:py-40 text-center space-y-8">
                <div className="h-1.5 w-32 bg-muted rounded-full mx-auto overflow-hidden border border-border/60">
                  <motion.div 
                    animate={{ x: ["-100%", "100%"] }} 
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} 
                    className="h-full w-1/2 bg-primary shadow-glow shadow-primary/40" 
                  />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40 animate-pulse">LOADING RANKINGS...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="border-2 border-dashed border-border/60 rounded-3xl md:rounded-[4rem] p-16 md:p-40 text-center space-y-6">
                 <Microscope className="h-12 w-12 md:h-16 md:w-16 opacity-5 mx-auto" />
                 <p className="speak-serif text-2xl md:text-3xl italic opacity-20">No one here yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((row, i) => {
                  const r = getRankFromElo(row.elo);
                  const isMe = row.id === user.id;
                  const place = i + 1;
                  return (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, x: -20, y: 10 }}
                      whileInView={{ opacity: 1, x: 0, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, duration: 0.6 }}
                      className={cn(
                        "group relative glass-card rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 lg:p-10 flex items-center gap-4 md:gap-8 transition-all duration-700 overflow-hidden shadow-soft",
                        isMe
                          ? "border-primary bg-primary/[0.05] shadow-glow shadow-primary/5"
                          : "hover:border-primary/40 hover:bg-primary/[0.02]"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 md:h-16 md:w-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center shrink-0 speak-serif text-lg md:text-2xl font-bold italic border-2 transition-all duration-700",
                          rankBadgeColor(place)
                        )}
                      >
                        {place}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1 md:space-y-3">
                        <div className="flex items-center gap-2 md:gap-6">
                          <span className="speak-serif text-xl md:text-3xl lg:text-4xl italic tracking-tighter truncate group-hover:text-primary transition-colors">
                            {row.display_name?.trim() || `User ${row.id.slice(0, 4)}`}
                          </span>
                          {isMe && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-white px-2 py-0.5 bg-primary rounded-full shadow-glow shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">
                          <span className="text-primary italic font-black">{r.name}</span>
                          <span className="h-1 w-1 rounded-full bg-foreground/20 hidden sm:block" />
                          <span className="hidden sm:block">Tier {r.tier}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1 md:space-y-2">
                        <div className="speak-serif text-2xl md:text-4xl lg:text-5xl font-bold tabular-nums tracking-tighter italic">
                          {row.elo.toLocaleString()}
                        </div>
                        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-20">
                          ELO
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Tiers Legend */}
        <section className="py-16 md:py-40 space-y-10 md:space-y-24">
          <div className="space-y-4 md:space-y-6 text-center">
            <p className="text-xs font-black uppercase tracking-widest opacity-30">The five ranks</p>
            <h2 className="speak-serif text-4xl md:text-8xl leading-none tracking-tighter">Rank <span className="text-primary italic">Progress</span>.</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-8">
            {ARENA_RANKS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl md:rounded-[3rem] p-5 md:p-10 space-y-4 md:space-y-8 group hover:border-primary/40 transition-all duration-700 relative overflow-hidden shadow-soft"
              >
                <div className="text-3xl md:text-5xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 origin-left inline-block">{getRankEmblem(t.name)}</div>
                <div className="space-y-1 md:space-y-3">
                  <p className="speak-serif text-xl md:text-3xl font-bold uppercase tracking-tighter italic group-hover:text-primary transition-colors">{t.name}</p>
                  <p className="text-[10px] md:text-xs font-black opacity-30 uppercase tracking-widest">
                    {t.min.toLocaleString()}+ ELO
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="py-16 md:py-32 flex flex-col items-center gap-6 md:gap-8 border-t border-border/60">
          <div className="h-16 md:h-20 w-[1px] bg-gradient-to-b from-primary/20 to-transparent" />
        </div>
      </div>
    </main>
  );
};

export default Leaderboard;
