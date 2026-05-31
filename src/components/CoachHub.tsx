import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, RefreshCw, Loader2, Mic, ArrowRight, Compass,
  TrendingUp, TrendingDown, Minus, Video,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSkillProfile } from "@/hooks/useSkillProfile";
import { useAdaptivePlan } from "@/hooks/useAdaptivePlan";
import { SkillRadar, type RadarDim } from "@/components/SkillRadar";
import { cn } from "@/lib/utils";
import type { DimensionStat } from "@/lib/skillProfile";

const TrendIcon = ({ trend }: { trend: DimensionStat["trend"] }) => {
  if (trend === "improving") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (trend === "declining") return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 opacity-40" />;
};

// The adaptive AI-coach hub — skill radar + diagnosis + today's tailored plan.
// Self-contained (no page shell) so it can headline The Lab. Assumes it renders
// inside an authenticated route.
export const CoachHub = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useSkillProfile();
  const { plan, loading: planLoading, generating, regenerate } = useAdaptivePlan(profile);

  const displayName = (user?.user_metadata as any)?.display_name ?? user?.email?.split("@")[0] ?? "Speaker";
  const loading = profileLoading || planLoading;

  const radarDims: RadarDim[] = (profile?.dimensions ?? []).map((d) => ({
    label: d.label,
    average: d.average,
    sampleCount: d.sampleCount,
    isFocus: (profile?.weakest ?? []).includes(d.dimension),
  }));

  const focusDims = profile?.weakest ?? [];
  const deliveryUnmeasured = profile?.dimensions.find((d) => d.dimension === "delivery" && d.sampleCount === 0);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8 md:mb-12">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Your AI Coach
          </div>
          <h1 className="speak-serif text-4xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tighter">
            Today, <span className="text-primary italic">{displayName}</span>.
          </h1>
        </div>
        {profile && plan && (
          <button
            onClick={() => regenerate(true)}
            disabled={generating}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity disabled:opacity-30 shrink-0 mt-2"
            title="Regenerate plan"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {generating ? "Updating" : "Refresh"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8">
          <div className="h-80 rounded-[2.5rem] bg-muted/10 animate-pulse" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted/10 animate-pulse" />)}
          </div>
        </div>
      ) : !profile ? (
        <p className="opacity-40 italic">Couldn't load your coach. Try again shortly.</p>
      ) : (
        <>
          {/* Headline + rationale */}
          {plan && (
            <div className="space-y-2 mb-8 md:mb-12 max-w-3xl">
              <h2 className="speak-serif text-2xl md:text-4xl tracking-tight leading-tight">{plan.headline}</h2>
              <p className="text-sm md:text-base opacity-60 leading-relaxed">{plan.rationale}</p>
              {profile.coldStart && (
                <p className="text-xs font-medium text-primary/70 pt-1">
                  This plan is based on your goals for now — record a few drills and it sharpens to your real performance.
                </p>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 lg:gap-14">

            {/* ── LEFT: Radar + skills ── */}
            <div className="space-y-8">
              <div className="rounded-[2.5rem] border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-muted/5 to-transparent p-6 md:p-8 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/10 blur-[90px] pointer-events-none" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4 relative z-10">Your skill profile</p>
                <div className="relative z-10 text-foreground">
                  <SkillRadar dims={radarDims} />
                </div>
                {profile.coldStart && (
                  <p className="relative z-10 text-center text-xs opacity-40 mt-3">
                    Record drills with feedback to fill in your radar.
                  </p>
                )}
              </div>

              {/* Dimension bars */}
              {!profile.coldStart && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Breakdown</p>
                  {profile.dimensions.map((d) => {
                    const isFocus = focusDims.includes(d.dimension);
                    return (
                      <div key={d.dimension} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn("font-semibold", isFocus ? "text-primary" : "opacity-60")}>{d.label}</span>
                          <span className="flex items-center gap-1.5 tabular-nums opacity-50">
                            <TrendIcon trend={d.trend} />
                            {d.sampleCount > 0 ? d.average : "—"}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${d.sampleCount > 0 ? d.average : 0}%` }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className={cn("h-full rounded-full", isFocus ? "bg-primary" : "bg-foreground/30")}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Body-language nudge — delivery is camera-only */}
              {deliveryUnmeasured && (
                <Link
                  to="/tracks/body-language"
                  className="group flex items-center gap-3 p-4 rounded-2xl border border-border/60 bg-background/40 hover:border-primary/40 transition-all"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Video className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">Measure your body language</p>
                    <p className="text-xs opacity-50">Record a camera drill to complete your radar.</p>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              )}
            </div>

            {/* ── RIGHT: Today's session ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Today's session</p>
                {plan && <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">{plan.drills.length} drills</span>}
              </div>

              {plan ? (
                <div className="space-y-3">
                  {plan.drills.map((drill, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <Link
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
                            <span className="text-[10px] font-medium opacity-40 tabular-nums">{drill.durationSeconds}s</span>
                          </div>
                          <p className="text-xs opacity-60 leading-relaxed line-clamp-2">{drill.prompt}</p>
                          {drill.rationale && (
                            <p className="text-[11px] text-primary/60 mt-1 italic">{drill.rationale}</p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center space-y-3">
                  <Compass className="h-8 w-8 mx-auto opacity-20" />
                  <p className="text-sm opacity-50">Building your plan…</p>
                </div>
              )}

              {/* Structured-course handoff */}
              <Link
                to="/pathway"
                className="group flex items-center justify-between gap-3 p-4 rounded-2xl bg-muted/10 border border-border/40 hover:border-primary/30 transition-all mt-2"
              >
                <div className="flex items-center gap-3">
                  <Compass className="h-4 w-4 text-primary opacity-60" />
                  <div>
                    <p className="text-sm font-bold">Prefer a structured course?</p>
                    <p className="text-xs opacity-50">Work through the Pathway, tier by tier.</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
