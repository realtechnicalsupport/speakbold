import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Globe, Clock, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GlobalStats {
  drills: number;
  sessions: number;
  minutes: number;
}

export const Hero = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<GlobalStats>({ drills: 0, sessions: 0, minutes: 0 });

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const { data: metrics, error } = await supabase.rpc("get_global_metrics");

        if (error) throw error;

        if (metrics && metrics.length > 0) {
          const m = metrics[0];
          setStats({
            drills: Number(m.total_drills),
            sessions: Number(m.total_feedback),
            minutes: Number(m.total_minutes),
          });
        }
      } catch (err) {
        console.error("Failed to fetch hero stats:", err);
      }
    };
    fetchGlobalStats();
  }, []);
  
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background bg-waves">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 pointer-events-none opacity-20"
      >
        <svg width="100%" height="100%" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <motion.path 
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            d="M0,1000 C200,800 400,900 600,700 C800,500 900,600 1000,400" 
            stroke="currentColor" strokeWidth="0.5" fill="none"
          />
          <motion.path 
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, delay: 0.5, ease: "easeInOut" }}
            d="M0,900 C200,700 400,800 600,600 C800,400 900,500 1000,300" 
            stroke="currentColor" strokeWidth="0.5" fill="none"
          />
        </svg>
      </motion.div>

      <div className="container relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-xs font-bold uppercase tracking-[0.4em] mb-20 opacity-60 flex items-center gap-4"
        >
          <Globe className="h-3 w-3 text-primary" />
          UN SDG 4 · QUALITY EDUCATION
          <span className="h-px w-8 bg-foreground/20" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-12"
        >
           <h1 className="flex flex-col items-center select-none">
            <span className="speak-serif text-5xl sm:text-7xl md:text-[120px] leading-[0.9] text-foreground tracking-tighter">SPEAK</span>
            <span className="bold-sans text-[60px] sm:text-[100px] md:text-[160px] leading-[0.8] relative text-primary">
              BOLD
              <span className="absolute inset-0 text-primary opacity-20 blur-[1px] translate-x-[2px] translate-y-[2px]">BOLD</span>
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="text-lg md:text-2xl font-medium tracking-tight mb-20 max-w-2xl text-foreground/60"
        >
          Democratizing elite communication skills. Gamified <span className="text-primary italic">quality education</span> for anyone, anywhere.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center gap-6"
        >
          <Link 
            to={user ? "/pathway" : "/login"}
            className="group relative flex items-center gap-8 px-10 py-4 rounded-full bg-primary text-white hover:scale-105 transition-all duration-500 overflow-hidden shadow-glow"
          >
            <span className="text-white text-xl font-serif">✱</span>
            <span className="text-sm font-black uppercase tracking-[0.3em]">
              {user ? "THE JOURNEY" : "ACCESS PLATFORM"}
            </span>
            <span className="text-white text-xl font-serif">✱</span>
          </Link>

          <Link 
            to={user ? "/arena" : "/login"}
            className="group relative flex items-center gap-8 px-10 py-4 rounded-full border border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-500 overflow-hidden"
          >
            <span className="text-primary text-xl font-serif animate-pulse">⚡</span>
            <span className="text-sm font-black uppercase tracking-[0.3em] text-primary">
              PRACTICE LOUNGE
            </span>
            <span className="text-primary text-xl font-serif animate-pulse">⚡</span>
          </Link>
        </motion.div>
        {/* SDG 4 Impact Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-24 w-full max-w-3xl mx-auto grid grid-cols-3 gap-4 px-4"
        >
          {[
            { icon: Mic, value: stats.drills.toLocaleString(), label: "Practice drills completed" },
            { icon: Sparkles, value: stats.sessions.toLocaleString(), label: "AI coaching sessions" },
            { icon: Clock, value: stats.minutes.toLocaleString(), label: "Minutes practiced" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 + i * 0.15 }}
                className="flex flex-col items-center gap-2 p-6 rounded-[1.5rem] bg-muted/5 border border-border/30"
              >
                <Icon className="h-5 w-5 text-primary opacity-60" />
                <p className="speak-serif text-2xl font-bold italic text-primary">{stat.value}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 text-center">{stat.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 px-10 flex justify-between items-center text-xs font-bold uppercase tracking-widest opacity-40">
        <span>© {new Date().getFullYear()} SPEAKBOLD</span>
        <div className="flex gap-8">
          <span>PRACTICE</span>
          <span>RECORD</span>
          <span>MASTER</span>
        </div>
      </div>
    </section>
  );
};
