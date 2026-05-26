import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Mic, Sparkles, Clock, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  learners: number;
  drillsCompleted: number;
  aiCoachingSessions: number;
  minutesPracticed: number;
}

const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(count, value, { duration: 2, ease: "circOut" });
    return controls.stop;
  }, [value]);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return unsub;
  }, [rounded]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
};

export const ImpactBanner = () => {
  const [stats, setStats] = useState<Stats>({ learners: 0, drillsCompleted: 0, aiCoachingSessions: 0, minutesPracticed: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: metrics, error } = await supabase.rpc("get_global_metrics");

        if (error) throw error;

        if (metrics && metrics.length > 0) {
          const m = metrics[0];
          setStats({
            learners: Number(m.total_learners),
            drillsCompleted: Number(m.total_drills),
            aiCoachingSessions: Number(m.total_feedback),
            minutesPracticed: Number(m.total_minutes),
          });
        }
      } catch (err) {
        console.error("Failed to fetch impact stats:", err);
      } finally {
        setLoaded(true);
      }
    };

    fetchStats();
  }, []);

  const metrics = [
    {
      icon: Globe,
      value: stats.learners,
      suffix: "",
      label: "Operators joined",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Mic,
      value: stats.drillsCompleted,
      suffix: "",
      label: "Practice drills completed",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Sparkles,
      value: stats.aiCoachingSessions,
      suffix: "",
      label: "AI coaching sessions",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      icon: Clock,
      value: stats.minutesPracticed,
      suffix: "",
      label: "Minutes practiced",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  if (!loaded) return null;

  return (
    <section className="relative z-10 px-4 md:container pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16 space-y-4"
      >
        <div className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.6em] text-primary">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
          SDG 4 · LIVE PLATFORM IMPACT
        </div>
        <h2 className="speak-serif text-4xl md:text-6xl tracking-tighter leading-none">
          Real learners. <span className="text-primary italic">Real growth.</span>
        </h2>
        <p className="text-sm font-medium opacity-40 max-w-lg mx-auto leading-relaxed">
          Real-time telemetry showing the global growth of our learner community.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, type: "spring" }}
              className="group relative bg-muted/5 border border-border/60 rounded-[2rem] p-8 text-center space-y-4 hover:border-primary/30 transition-all duration-700 overflow-hidden"
            >
              {/* Icon */}
              <div className={`h-14 w-14 rounded-[1rem] ${metric.bg} ${metric.color} flex items-center justify-center mx-auto`}>
                <Icon className="h-7 w-7" />
              </div>
              {/* Animated number */}
              <div className={`speak-serif text-4xl md:text-5xl font-bold italic ${metric.color} tabular-nums leading-none`}>
                <AnimatedNumber value={metric.value} suffix={metric.suffix} />
              </div>
              {/* Label */}
              <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 leading-snug group-hover:opacity-60 transition-opacity">
                {metric.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
        className="text-center mt-12"
      >
        <div className="inline-flex items-center gap-3 px-8 py-3 rounded-full border border-border/40 bg-muted/5 text-[11px] font-black uppercase tracking-[0.4em] opacity-30">
          <Globe className="h-3 w-3" />
          United Nations SDG 4 · Quality Education · Free for everyone
        </div>
      </motion.div>
    </section>
  );
};
