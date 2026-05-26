import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, RotateCcw, Flame, CheckCircle2, Sparkles, ShieldCheck, Target, Microscope, Zap, Clock } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import { RecorderPanel } from "@/components/RecorderPanel";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, useInView as useFramerInView } from "framer-motion";
import { cn } from "@/lib/utils";

const DAILY_PROMPTS = [
  "The best advice you've ever ignored.",
  "Describe a smell that instantly takes you somewhere.",
  "If you could ban one word from meetings, which and why?",
  "The smallest decision that changed your life.",
  "Convince me to try your favorite hobby in 60 seconds.",
  "A time you were wrong — and what you did about it.",
  "What does 'home' mean to you right now?",
  "The most underrated skill in your field.",
  "A rule you break on purpose.",
  "Something you believed at 15 that you don't anymore.",
  "The last thing that genuinely surprised you.",
  "If your week had a title, what would it be?",
  "A person who shaped you without knowing it.",
  "What you'd tell a room of nervous first-day interns.",
];

const dayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
};

const DURATION = 60;

const awardDailyXP = async (userId: string, userEmail?: string) => {
  const xpReward = 15;
  const { data: xpData } = await supabase.from("user_xp").select("total_xp").eq("user_id", userId).maybeSingle();
  const displayName = userEmail?.split('@')[0] || 'Anonymous';
  
  if (!xpData) {
    await supabase.from("user_xp").insert({ user_id: userId, total_xp: xpReward, display_name: displayName });
  } else {
    await supabase.from("user_xp").update({ total_xp: (xpData.total_xp || 0) + xpReward, display_name: displayName }).eq("user_id", userId);
  }
  toast.success(`+${xpReward} XP earned!`);
  window.dispatchEvent(new Event("xp-updated"));
};

export const DailyChallenge = () => {
  const { user } = useAuth();
  const prompt = useMemo(() => DAILY_PROMPTS[dayOfYear() % DAILY_PROMPTS.length], []);
  const [left, setLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const ref = useRef<number | null>(null);
  const { count, practicedToday, markPracticed } = useStreak();
  const sectionRef = useRef(null);
  const isInView = useFramerInView(sectionRef, { once: true, margin: "-100px" });
  
  const recorderRef = useRef<{ start: () => void; pause: () => void; resume: () => void; stop: () => void } | null>(null);
  
  useEffect(() => {
    if (running && recorderRef.current) {
      if (left === DURATION) recorderRef.current.start();
      else recorderRef.current.resume();
    } else if (!running && recorderRef.current && left < DURATION && !finished) {
      recorderRef.current.pause();
    }
  }, [running, finished, left]);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(ref.current!);
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => { if (ref.current) window.clearInterval(ref.current); };
  }, [running]);

  useEffect(() => {
    if (!finished) return;
    markPracticed();
    if (user) awardDailyXP(user.id, user.email);
  }, [finished, user]);

  const reset = () => {
    if (ref.current) window.clearInterval(ref.current);
    setLeft(DURATION);
    setRunning(false);
    setFinished(false);
  };

  const pct = ((DURATION - left) / DURATION) * 100;

  return (
    <section className="container py-40 md:py-60 border-t border-border/60 relative overflow-hidden" ref={sectionRef}>
      {/* Background Motion */}
      <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[130px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px] animate-float opacity-20 pointer-events-none" style={{ animationDelay: "-5s" }} />

      <div className="max-w-6xl mx-auto text-center space-y-32 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 1 }}
          className="space-y-16"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
              <ShieldCheck className="h-4 w-4" />
              60-SECOND DAILY DRILL
            </div>
            <h2 className="speak-serif text-2xl md:text-6xl leading-[0.9] tracking-tighter italic">
              "{prompt}"
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-16">
            <div className="space-y-4">
               <div className="flex items-end justify-between text-[11px] font-black uppercase tracking-[0.4em] opacity-20">
                  <span className="flex items-center gap-2"><Target className="h-3 w-3" /> CAPTURE PROGRESS</span>
                  <span>{Math.round(pct)}% COMPLETE</span>
               </div>
               <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/60 relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                    className="h-full bg-primary shadow-glow shadow-primary/40"
                  />
               </div>
            </div>
            
            <div className="flex flex-col items-center gap-4">
<div className="speak-serif text-[48px] sm:text-[80px] md:text-[160px] font-bold tracking-tighter tabular-nums leading-[0.7] text-foreground italic">
                  {String(left).padStart(2, "0")}
                </div>
               <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] opacity-20">
                  <Clock className="h-4 w-4" /> SECONDS REMAINING
               </div>
            </div>

            <div className="flex justify-center items-center gap-10">
              {!running && left === DURATION && !finished && (
                <button onClick={() => setRunning(true)} className="button-pill px-16 py-6 bg-primary text-white shadow-glow group hover:scale-105 transition-all duration-700">
                  <span className="text-xs font-black uppercase tracking-[0.3em]">INITIALIZE DRILL</span>
                  <Play className="h-5 w-5 ml-4 group-hover:scale-110 transition-transform" fill="currentColor" />
                </button>
              )}
              {running && (
                <button onClick={() => setRunning(false)} className="button-pill bg-white text-primary border-white px-16 py-6 shadow-xl scale-110">
                  <Pause className="h-5 w-5 mr-4" fill="currentColor" />
                  <span className="text-xs font-black uppercase tracking-[0.3em]">SYSTEM PAUSE</span>
                </button>
              )}
              {!running && left < DURATION && !finished && (
                <button onClick={() => setRunning(true)} className="button-pill px-16 py-6 bg-primary text-white shadow-glow">
                  <Play className="h-5 w-5 mr-4" fill="currentColor" />
                  <span className="text-xs font-black uppercase tracking-[0.3em]">RESUME FLOW</span>
                </button>
              )}
              {(left < DURATION || finished) && (
                <button onClick={reset} className="h-16 w-16 rounded-full border border-border/60 flex items-center justify-center opacity-20 hover:opacity-100 transition-all hover:border-primary/40 group">
                  <RotateCcw className="h-5 w-5 group-hover:rotate-[-45deg] transition-transform" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="pt-32 border-t border-border/60 grid md:grid-cols-3 gap-24 items-center"
        >
          <div className="space-y-6">
            <p className="text-xs font-black uppercase tracking-[0.5em] opacity-30">DRILL MOMENTUM</p>
            <div className="flex items-center justify-center gap-6">
              <div className="relative">
                 <Flame className={cn("h-12 w-12 transition-all duration-1000", count > 0 ? "text-primary drop-shadow-glow" : "opacity-10")} />
                 {count > 0 && <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />}
              </div>
              <span className="speak-serif text-7xl font-bold italic tabular-nums">{count}</span>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-20">CONSECUTIVE DAYS ACTIVE</p>
          </div>

          <div className="md:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
               <p className="text-xs font-black uppercase tracking-[0.5em] opacity-30 flex items-center gap-3">
                 <Microscope className="h-4 w-4" />
                 OPERATIONAL HISTORY
               </p>
               <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">14-DAY ANALYTIC VIEW</span>
            </div>
            <div className="flex gap-3 h-16">
              {Array.from({ length: 14 }).map((_, i) => {
                const filled = i < count;
                return (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.05 + 0.5 }}
                    className={cn(
                      "flex-1 rounded-[0.5rem] transition-all duration-1000 origin-bottom",
                      filled ? "bg-primary shadow-glow shadow-primary/20" : "bg-muted/30"
                    )}
                  />
                );
              })}
            </div>
            <p className="text-xs font-black uppercase tracking-widest opacity-20 text-center">
              {practicedToday ? "DAILY QUOTA MET" : "SYSTEM AWAITING TODAY'S INPUT"}
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="pt-32"
        >
          <div className="max-w-4xl mx-auto">
            <RecorderPanel
              ref={recorderRef}
              label="SENSORY CAPTURE"
              hint="Session is encrypted and stored locally for audit purposes."
              recorderStartRef={() => {}}
              recorderPauseRef={() => {}}
              recorderResumeRef={() => {}}
              recorderStopRef={() => {}}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
