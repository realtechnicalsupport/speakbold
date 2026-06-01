import { Trophy, ArrowRight, Target, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getRankFromElo } from "@/hooks/arenaUtils";
import { RankEmblem } from "@/components/RankEmblem";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/context/AuthContext";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export const Progress = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { rows, loading } = useLeaderboard(5);
  const { user } = useAuth();

  const topFive = rows.slice(0, 5);

  return (
    <section id="progress" className="container py-16 md:py-60 border-t border-border/60 relative overflow-hidden" ref={ref}>
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] animate-pulse-subtle pointer-events-none" />

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-24 items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.4em] mb-12 opacity-40">
            <span className="h-px w-8 bg-foreground/20" />
            GLOBAL HIERARCHY
          </div>
          <h2 className="speak-serif text-4xl md:text-8xl leading-[0.9] text-foreground mb-8 md:mb-12 tracking-tighter">
            See how you <br />
            <span className="text-primary italic">rank</span> globally.
          </h2>
          <p className="text-lg md:text-2xl font-medium tracking-tight opacity-60 mb-12 max-w-lg leading-relaxed">
            Win battles. Climb the ladder. Your ELO is your rank — and the leaderboard never lies.
          </p>
          <Link to="/leaderboard" className="button-pill inline-flex items-center gap-6 group hover:scale-105 transition-transform">
            <span className="text-xs font-black uppercase tracking-widest">FULL LEADERBOARD</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="rounded-[2rem] md:rounded-[3.5rem] border border-border/60 bg-muted/5 overflow-hidden p-5 md:p-14 shadow-soft relative group hover:border-primary/20 transition-all duration-700">
             {/* Inner Glow */}
             <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
               <Trophy className="h-32 w-32" />
             </div>

            <div className="flex items-center gap-4 mb-14 opacity-40 relative z-10">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">CURRENT STANDINGS</span>
            </div>
            
            <div className="space-y-4 relative z-10">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-muted/20 rounded-2xl">
                    <Skeleton className="w-48 h-6" />
                    <Skeleton className="w-12 h-6" />
                  </div>
                ))
              ) : topFive.length === 0 ? (
                <div className="py-20 text-center space-y-4 opacity-40">
                  <Target className="h-12 w-12 mx-auto" />
                  <p className="text-xs font-bold uppercase tracking-widest">No protocol data available</p>
                </div>
              ) : (
                topFive.map((entry, index) => {
                  const rankData = getRankFromElo(entry.elo);
                  const isCurrentUser = entry.id === user?.id;
                  const position = index + 1;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className={cn(
                        "flex items-center justify-between p-6 rounded-[2.5rem] transition-all duration-500",
                        isCurrentUser ? "bg-primary border border-primary text-white shadow-glow" : "bg-background/40 border border-border/60 hover:border-primary/40 hover:bg-primary/[0.02]"
                      )}
                    >
                      <div className="flex items-center gap-6">
                        <span className={cn(
                          "speak-serif text-xl w-6",
                          isCurrentUser ? "text-white" : "opacity-40"
                        )}>
                          {position}
                        </span>
                        <RankEmblem rank={rankData} size="md" />
                        <div>
                          <p className={cn(
                            "text-xs font-black tracking-widest uppercase",
                            isCurrentUser ? "text-white" : "text-foreground"
                          )}>
                            {entry.display_name}
                          </p>
                          {isCurrentUser && (
                            <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">MASTER RANK</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-2xl font-sans-bold tracking-tighter tabular-nums",
                          isCurrentUser ? "text-white" : "text-foreground"
                        )}>
                          {entry.elo.toLocaleString()}
                        </p>
                        <p className={cn(
                          "text-[11px] font-black uppercase tracking-widest",
                          isCurrentUser ? "text-white/60" : "opacity-40"
                        )}>ELO</p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
