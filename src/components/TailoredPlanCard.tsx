import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  RefreshCw,
  Loader2,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSkillProfile } from "@/hooks/useSkillProfile";
import { useAdaptivePlan } from "@/hooks/useAdaptivePlan";
import type { DimensionStat } from "@/lib/skillProfile";

const TrendIcon = ({ trend }: { trend: DimensionStat["trend"] }) => {
  if (trend === "improving") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (trend === "declining") return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 opacity-40" />;
};

const SkillBar = ({ stat, isFocus }: { stat: DimensionStat; isFocus: boolean }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs">
      <span className={cn("font-semibold", isFocus ? "text-primary" : "opacity-60")}>{stat.label}</span>
      <span className="flex items-center gap-1.5 tabular-nums opacity-50">
        <TrendIcon trend={stat.trend} />
        {stat.sampleCount > 0 ? stat.average : "—"}
      </span>
    </div>
    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${stat.sampleCount > 0 ? stat.average : 0}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn("h-full rounded-full", isFocus ? "bg-primary" : "bg-foreground/30")}
      />
    </div>
  </div>
);

export const TailoredPlanCard = () => {
  const { profile, loading: profileLoading } = useSkillProfile();
  const { plan, loading: planLoading, generating, regenerate } = useAdaptivePlan(profile);

  if (profileLoading || planLoading) {
    return (
      <div className="rounded-[2.5rem] border border-border/60 bg-muted/5 p-8 md:p-10 mb-10 md:mb-14 animate-pulse">
        <div className="h-4 w-40 bg-muted/40 rounded-full mb-6" />
        <div className="h-8 w-64 bg-muted/40 rounded-full mb-4" />
        <div className="h-4 w-full max-w-md bg-muted/30 rounded-full" />
      </div>
    );
  }

  if (!profile || !plan) return null;

  const focusDims = profile.weakest;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-[2.5rem] border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-muted/5 to-transparent p-8 md:p-10 mb-10 md:mb-14 overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Tailored for you
        </div>
        <button
          onClick={() => regenerate(true)}
          disabled={generating}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity disabled:opacity-30"
          title="Regenerate plan"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {generating ? "Updating" : "Refresh"}
        </button>
      </div>

      {/* Headline + rationale */}
      <div className="relative z-10 space-y-2 mb-8">
        <h2 className="speak-serif text-2xl md:text-4xl tracking-tight leading-tight">{plan.headline}</h2>
        <p className="text-sm md:text-base opacity-60 leading-relaxed max-w-2xl">{plan.rationale}</p>
        {profile.coldStart && (
          <p className="text-xs font-medium text-primary/70 pt-1">
            Record a few drills with feedback and this plan sharpens to your real performance.
          </p>
        )}
      </div>

      <div className="relative z-10 grid lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-12">
        {/* Skill breakdown */}
        {!profile.coldStart && (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Your skills</p>
            <div className="space-y-3">
              {profile.dimensions.map((d) => (
                <SkillBar key={d.dimension} stat={d} isFocus={focusDims.includes(d.dimension)} />
              ))}
            </div>
          </div>
        )}

        {/* Recommended drills */}
        <div className={cn("space-y-4", profile.coldStart && "lg:col-span-2")}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
            Recommended drills
          </p>
          <div className="space-y-3">
            {plan.drills.map((drill, i) => (
              <Link
                key={i}
                to={drill.trackUrl}
                className="group flex items-start gap-4 p-4 md:p-5 rounded-2xl border border-border/60 bg-background/40 hover:border-primary/40 hover:bg-primary/[0.03] transition-all"
              >
                <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mic className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold tracking-tight">{drill.title}</h3>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {drill.targetLabel}
                    </span>
                    <span className="text-[10px] font-medium opacity-40 tabular-nums">
                      {drill.durationSeconds}s
                    </span>
                  </div>
                  <p className="text-xs opacity-60 leading-relaxed line-clamp-2">{drill.prompt}</p>
                  {drill.rationale && (
                    <p className="text-[11px] text-primary/60 mt-1 italic">{drill.rationale}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
};
