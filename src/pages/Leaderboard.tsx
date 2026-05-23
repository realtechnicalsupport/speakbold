import { Link, Navigate } from "react-router-dom";
import { Sparkles, ArrowRight, Trophy, Target, ShieldCheck, Zap, RefreshCw, Microscope, Mic, Globe } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/context/AuthContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { rankFor, rankProgress, ALL_RANKS } from "@/lib/rank";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

  const myRank = me ? rankFor(me.xp) : null;
  const myProg = me ? rankProgress(me.xp) : null;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <SiteHeader />
      
      {/* Background Motion */}
      <div className="absolute top-[15%] left-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[130px] animate-float opacity-20 pointer-events-none" style={{ animationDelay: "-3s" }} />

      <div className="container relative z-10 pt-32 md:pt-48 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="flex flex-col items-center text-center space-y-8 mb-32"
        >
          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
            <Globe className="h-3 w-3" />
            UN SDG 4 · QUALITY EDUCATION
          </div>
          <h1 className="speak-serif text-5xl md:text-9xl leading-[0.8] tracking-tighter">
            Global <span className="text-primary italic">Mastery</span>.
          </h1>
          <p className="text-lg md:text-2xl font-medium tracking-tight opacity-40 max-w-2xl leading-relaxed">
            Earn XP in every session. Rank up by practicing every day.
          </p>
        </motion.div>

        {/* User Standing Card */}
        <AnimatePresence>
          {me && myRank && myProg && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1 }}
              className="grid lg:grid-cols-[1fr_400px] gap-8 mb-40"
            >
              <div className="relative glass-card rounded-[4rem] p-12 md:p-20 overflow-hidden shadow-soft group">
                <div className="grain pointer-events-none" />
                <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-1000">
                  <Trophy className="h-64 w-64 text-primary" />
                </div>
                
                <div className="relative space-y-16">
                  <div className="space-y-6">
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-primary">MY STANDING</p>
                    <div className="flex items-baseline gap-8">
                      <span className="speak-serif text-7xl md:text-[12rem] font-bold tracking-tighter tabular-nums italic leading-none">
                        #{me.rank}
                      </span>
                      <span className="text-xs font-black uppercase tracking-[0.4em] opacity-20">POSITION</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-16 pt-16 border-t border-border/60">
                    <div className="space-y-4">
                      <p className="text-xs font-black uppercase tracking-[0.4em] opacity-30">TOTAL XP</p>
                      <p className="speak-serif text-5xl font-bold tabular-nums italic text-primary">{me.xp.toLocaleString()}</p>
                    </div>
                    <div className="space-y-4 text-right">
                      <p className="text-xs font-black uppercase tracking-[0.4em] opacity-30">RANK</p>
                      <div className="flex items-center justify-end gap-4">
                        <span className="text-4xl animate-float">{myRank.emblem}</span>
                        <p className="speak-serif text-3xl font-bold uppercase tracking-tighter italic">{myRank.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.3em]">
                      <span className="opacity-30">NEXT RANK</span>
                      <span className="text-primary">
                        {myRank.next == null
                          ? "MAX RANK REACHED"
                          : `${(myRank.next - me.xp).toLocaleString()} XP TO ${ALL_RANKS[myRank.tier]?.name.toUpperCase()}`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${myProg.pct}%` }}
                        transition={{ duration: 2, ease: "circOut" }}
                        className="h-full bg-primary shadow-glow shadow-primary/40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-[4rem] p-12 space-y-12 flex flex-col justify-between relative overflow-hidden shadow-soft">
                <div className="grain pointer-events-none" />
                <div className="space-y-10">
                  <div className="h-16 w-16 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-6">
                    <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40">HOW TO EARN XP</p>
                    <ul className="space-y-6">
                      {[
                        { icon: Mic, label: "+10 XP PER RECORDED DRILL" },
                        { icon: Zap, label: "+1 XP PER 10 SECONDS SPOKEN" },
                        { icon: Target, label: "+5 XP FOR DAILY CHECK-IN" }
                      ].map((rule, i) => (
                        <li key={i} className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-4 group">
                          <rule.icon className="h-4 w-4 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                          <span className="opacity-40 group-hover:opacity-100 transition-opacity">{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <Link to="/tracks/impromptu" className="button-pill w-full py-6 flex items-center justify-center gap-4 bg-primary text-white shadow-glow group">
                  <span className="text-xs font-black uppercase tracking-[0.2em]">START PRACTICE</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Board */}
        <section className="space-y-20 border-t border-border/60 pt-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.5em] text-primary">
                <RefreshCw className="h-4 w-4 animate-spin-slow" />
                LIVE RANKINGS
              </div>
              <h2 className="speak-serif text-4xl md:text-8xl leading-none tracking-tighter">
                Top <span className="text-primary italic">speakers</span>.
              </h2>
              <p className="text-sm font-medium tracking-tight opacity-40 max-w-sm leading-relaxed">
                The highest-XP voices in the ecosystem, refreshed in real-time.
              </p>
            </div>
            <Link
              to="/profile"
              className="text-xs font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 hover:text-primary transition-all flex items-center gap-4"
            >
              VIEW MY STATS <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="max-w-6xl mx-auto">
            {lbLoading ? (
              <div className="py-40 text-center space-y-8">
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
              <div className="border-2 border-dashed border-border/60 rounded-[4rem] p-40 text-center space-y-6">
                 <Microscope className="h-16 w-16 opacity-5 mx-auto" />
                 <p className="speak-serif text-3xl italic opacity-20">No active activity detected.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((row, i) => {
                  const r = rankFor(row.xp);
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
                        "group relative glass-card rounded-[2.5rem] p-8 md:p-10 flex items-center gap-10 transition-all duration-700 overflow-hidden shadow-soft",
                        isMe
                          ? "border-primary bg-primary/[0.05] shadow-glow shadow-primary/5"
                          : "hover:border-primary/40 hover:bg-primary/[0.02]"
                      )}
                    >
                      <div className="grain pointer-events-none" />
                      <div
                        className={cn(
                          "h-20 w-20 rounded-[1.5rem] flex items-center justify-center shrink-0 speak-serif text-3xl font-bold italic border-2 transition-all duration-700",
                          rankBadgeColor(place)
                        )}
                      >
                        {place}
                      </div>

                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-6">
                          <span className="speak-serif text-3xl md:text-4xl italic tracking-tighter truncate group-hover:text-primary transition-colors">
                            {row.display_name?.trim() || `ANON_${row.id.slice(0, 4)}`}
                          </span>
                          {isMe && (
                            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white px-3 py-1 bg-primary rounded-full shadow-glow">
                              SENDER
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] opacity-40">
                          <span className="text-primary italic font-black">{r.name}</span>
                          <span className="h-1 w-1 rounded-full bg-foreground/20" />
                          <span>TIER 0{r.tier + 1}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-2">
                        <div className="speak-serif text-4xl md:text-5xl font-bold tabular-nums tracking-tighter italic">
                          {row.xp.toLocaleString()}
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.4em] opacity-20">
                          XP
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
        <section className="py-40 space-y-24">
          <div className="space-y-6 text-center">
            <p className="text-xs font-black uppercase tracking-[0.6em] opacity-30">THE EIGHT RANKS</p>
            <h2 className="speak-serif text-4xl md:text-8xl leading-none tracking-tighter">Rank <span className="text-primary italic">Progress</span>.</h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {ALL_RANKS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-[3rem] p-10 space-y-8 group hover:border-primary/40 transition-all duration-700 relative overflow-hidden shadow-soft"
              >
                <div className="grain pointer-events-none" />
                <div className="text-5xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 origin-left inline-block">{t.emblem}</div>
                <div className="space-y-3">
                  <p className="speak-serif text-3xl font-bold uppercase tracking-tighter italic group-hover:text-primary transition-colors">{t.name}</p>
                  <p className="text-xs font-black opacity-30 uppercase tracking-[0.4em]">
                    {t.min.toLocaleString()}+ XP • LEVEL 0{i + 1}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="py-32 flex flex-col items-center gap-8 border-t border-border/60">
          <div className="flex items-center gap-6 text-xs font-black uppercase tracking-[0.8em] opacity-10">
            <ShieldCheck className="h-4 w-4" />
            LIVE RANKING SYSTEM
          </div>
          <div className="h-20 w-[1px] bg-gradient-to-b from-primary/20 to-transparent" />
        </div>
      </div>
    </main>
  );
};

export default Leaderboard;
