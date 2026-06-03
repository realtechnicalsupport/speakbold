import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Sparkles, RotateCcw, Trophy, Eye, Smile, Hand, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BodyLanguageSession } from "@/hooks/useBodyLanguage";
import { generateBodyLanguageFeedback } from "@/services/geminiService";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FEEDBACK_SAVED_EVENT } from "@/hooks/useSkillProfile";

interface Props {
  session: BodyLanguageSession;
  onReset: () => void;
}

const METRIC_CONFIG = [
  { key: "posture" as const, label: "POSTURE", icon: Activity, color: "#f97316" },
  { key: "eyeContact" as const, label: "EYE CONTACT", icon: Eye, color: "#38bdf8" },
  { key: "expression" as const, label: "EXPRESSION", icon: Smile, color: "#a78bfa" },
  { key: "gesture" as const, label: "GESTURE", icon: Hand, color: "#34d399" },
];

function scoreLabel(n: number): { label: string; color: string } {
  if (n >= 80) return { label: "EXCELLENT", color: "text-green-400" };
  if (n >= 65) return { label: "SOLID", color: "text-primary" };
  if (n >= 45) return { label: "DEVELOPING", color: "text-yellow-400" };
  return { label: "NEEDS WORK", color: "text-red-400" };
}

/**
 * Recent-sessions delivery trend — the payoff of persisting body-language
 * sessions. Reads the last few `body-language` skill_events and plots their
 * overall score oldest → newest so the user can see progress across runs. Hidden
 * until there are at least two sessions (a single bar isn't a trend). Refetches
 * on FEEDBACK_SAVED_EVENT so the run that just completed appears as it lands.
 */
function DeliveryTrend() {
  const { user } = useAuth();
  const [points, setPoints] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("skill_events")
        .select("overall, scores, created_at")
        .eq("user_id", user.id)
        .eq("source", "body-language")
        .order("created_at", { ascending: false })
        .limit(8);
      if (cancelled || !data) return;
      const vals: number[] = data
        .map((r: any) => (typeof r.overall === "number" ? r.overall : Number(r?.scores?.delivery)))
        .filter((n: number) => Number.isFinite(n))
        .reverse(); // DB is newest-first → chronological for the strip
      setPoints(vals);
    };
    load();
    const onSaved = () => load();
    window.addEventListener(FEEDBACK_SAVED_EVENT, onSaved);
    return () => {
      cancelled = true;
      window.removeEventListener(FEEDBACK_SAVED_EVENT, onSaved);
    };
  }, [user?.id]);

  if (points.length < 2) return null;

  const delta = points[points.length - 1] - points[0];
  const Trend = delta >= 5 ? TrendingUp : delta <= -5 ? TrendingDown : Minus;
  const trendColor = delta >= 5 ? "text-green-400" : delta <= -5 ? "text-red-400" : "opacity-50";

  return (
    <div className="p-5 rounded-2xl bg-muted/5 border border-border/60 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">
          RECENT DELIVERY · LAST {points.length}
        </span>
        <span className={cn("flex items-center gap-1 text-[10px] font-black uppercase tracking-widest", trendColor)}>
          <Trend className="h-3.5 w-3.5" />
          {delta > 0 ? `+${delta}` : delta}
        </span>
      </div>
      <div className="flex items-end gap-2 h-20">
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
              <span className={cn("text-[9px] font-black tabular-nums", isLast ? "opacity-70" : "opacity-30")}>{p}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(6, p)}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                className={cn("w-full rounded-full", isLast ? "bg-primary" : "bg-primary/30")}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BodyLanguageReport({ session, onReset }: Props) {
  const { averageMetrics: m, durationMs } = session;
  const [bullets, setBullets] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateBodyLanguageFeedback({
      posture: m.posture,
      eyeContact: m.eyeContact,
      expression: m.expression,
      gesture: m.gesture,
      overall: m.overall,
      durationSecs: Math.round(durationMs / 1000),
    })
      .then((res) => {
        setBullets(res.bullets);
        setTitle(res.title);
      })
      .catch(() => {
        setBullets([
          "Review your posture score and focus on keeping shoulders level.",
          "Eye contact is your strongest presence signal — keep working on it.",
          "Bring more gestural variety to command the room.",
        ]);
        setTitle("Keep Building");
      })
      .finally(() => setLoading(false));
  }, [m, durationMs]);

  const overallData = [{ value: m.overall, fill: "#f97316" }];
  const { label: overallLabel, color: overallColor } = scoreLabel(m.overall);
  const durationStr = `${Math.floor(durationMs / 60000)}:${String(Math.round((durationMs % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-primary">
          <Trophy className="h-4 w-4" />
          SESSION COMPLETE
        </div>
        <span className="speak-serif text-xl italic opacity-30 tabular-nums">{durationStr}</span>
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-8 items-start">
        {/* Overall score ring */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-48 h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="75%" outerRadius="100%"
                startAngle={90} endAngle={-270}
                data={overallData}
                barSize={14}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "rgba(255,255,255,0.05)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="speak-serif text-5xl font-bold italic leading-none">{m.overall}</span>
              <span className={cn("text-[10px] font-black uppercase tracking-[0.3em] mt-1", overallColor)}>
                {overallLabel}
              </span>
            </div>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] opacity-30">OVERALL SCORE</p>
        </div>

        {/* Individual metrics */}
        <div className="grid grid-cols-2 gap-4">
          {METRIC_CONFIG.map(({ key, label, icon: Icon, color }) => {
            const score = m[key];
            const { label: sl, color: sc } = scoreLabel(score);
            return (
              <div
                key={key}
                className="p-5 rounded-2xl bg-muted/5 border border-border/60 space-y-3 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">{label}</span>
                </div>
                <div className="flex items-end gap-3">
                  <span className="speak-serif text-4xl font-bold italic leading-none">{score}</span>
                  <span className={cn("text-[9px] font-black uppercase tracking-wider mb-1", sc)}>{sl}</span>
                </div>
                {/* Progress bar */}
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery trend across recent sessions */}
      <DeliveryTrend />

      {/* AI Coaching */}
      <div className="p-6 md:p-10 rounded-2xl md:rounded-[3rem] bg-muted/5 border border-border/60 space-y-6 relative overflow-hidden">
        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-primary relative z-10">
          <Sparkles className="h-4 w-4" />
          AI COACHING REPORT
          {loading && <span className="opacity-40 normal-case font-medium tracking-normal">— Generating...</span>}
        </div>

        {title && !loading && (
          <p className="speak-serif text-2xl md:text-3xl italic relative z-10">{title}</p>
        )}

        {loading ? (
          <div className="space-y-3 relative z-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 rounded-full bg-white/5 animate-pulse" style={{ width: `${70 + i * 8}%` }} />
            ))}
          </div>
        ) : (
          <ul className="space-y-4 relative z-10">
            {bullets.map((b, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-start gap-4"
              >
                <span className="text-primary font-black text-lg leading-none mt-0.5 shrink-0">
                  {["01", "02", "03"][i]}
                </span>
                <p className="text-sm font-medium opacity-70 leading-relaxed">{b}</p>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* CTA */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onReset}
          className="group flex items-center gap-4 px-10 py-4 rounded-full border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-500"
        >
          <RotateCcw className="h-4 w-4 opacity-40 group-hover:rotate-[-45deg] group-hover:opacity-100 transition-all duration-500" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">RECORD AGAIN</span>
        </button>
      </div>
    </motion.div>
  );
}
