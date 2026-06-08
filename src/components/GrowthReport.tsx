import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSkillProfile } from "@/hooks/useSkillProfile";

const fmtDelta = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/**
 * Proof-of-learning hero: the baseline→latest improvement delta plus the
 * session-over-session curve. This is the artifact that turns "the app measures
 * you" into "the app made you better" — the story an education rubric rewards.
 * Data comes from useSkillProfile().growth (full history, fires from 2 sessions).
 *
 * Renders a motivating prompt (not nothing) when there isn't enough history yet,
 * so a brand-new user sees what they'll unlock.
 */
export const GrowthReport = ({
  className,
  compact = false,
  strip = false,
}: {
  className?: string;
  /** Headline delta + curve only (no per-dimension bars) — for above-the-fold
   *  placement like the Lab landing, where the rising curve is the hook. */
  compact?: boolean;
  /** Slim one-row ribbon (delta + mini sparkline + "see report") — for the very
   *  top of the Lab, where growth should be present but must not overshadow the
   *  practice tracks. Links through to the full /report. */
  strip?: boolean;
}) => {
  const { growth, loading } = useSkillProfile();

  const chartData = useMemo(
    () => (growth?.series ?? []).map((p, i) => ({ session: i + 1, overall: p.overall })),
    [growth]
  );

  // ── Slim strip variant ─────────────────────────────────────────────────────
  if (strip) {
    if (loading) {
      return <div className={cn("rounded-2xl border border-border/60 bg-muted/5 h-[72px] animate-pulse", className)} />;
    }
    if (!growth?.hasData) {
      return (
        <Link
          to="/report"
          className={cn("group flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/5 hover:border-primary/40 transition-all p-4 md:p-5", className)}
        >
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Your growth</p>
            <p className="text-sm font-medium opacity-60 leading-snug">Record two drills to unlock your improvement curve.</p>
          </div>
          <ArrowRight className="h-4 w-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
        </Link>
      );
    }
    const up = growth.delta > 0;
    const isFlat = growth.delta === 0;
    const StripIcon = up ? TrendingUp : isFlat ? Minus : TrendingDown;
    const stripAccent = up ? "text-primary" : isFlat ? "opacity-40" : "text-destructive";
    return (
      <Link
        to="/report"
        className={cn("group flex items-center gap-4 md:gap-6 rounded-2xl border border-primary/20 bg-primary/[0.04] hover:border-primary/40 hover:bg-primary/[0.07] transition-all p-4 md:p-5", className)}
      >
        <div className={cn("flex items-center gap-2 shrink-0", stripAccent)}>
          <StripIcon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
          <span className="speak-serif text-3xl md:text-4xl font-bold italic leading-none">{fmtDelta(growth.delta)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Your growth</p>
          <p className="text-sm font-medium opacity-70 leading-snug truncate">
            {growth.baseline} → {growth.latest} over {growth.sessions} sessions
          </p>
        </div>
        <div className="hidden sm:block w-28 md:w-40 h-10 shrink-0 -my-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="growthStripFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[0, 100]} hide />
              <Area type="monotone" dataKey="overall" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#growthStripFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-primary opacity-60 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity">
          <span className="hidden md:inline">See report</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </span>
      </Link>
    );
  }

  if (loading) {
    return (
      <div className={cn("rounded-[2.5rem] border border-border/60 bg-muted/5 p-8 animate-pulse h-64", className)} />
    );
  }

  if (!growth?.hasData) {
    return (
      <div className={cn("rounded-[2.5rem] border border-border/60 bg-muted/5 p-8 md:p-10 text-center space-y-3", className)}>
        <p className="text-xs font-black uppercase tracking-[0.4em] text-primary">YOUR GROWTH</p>
        <p className="speak-serif text-2xl md:text-3xl leading-tight">
          Two sessions unlock your <span className="text-primary italic">improvement curve</span>.
        </p>
        <p className="text-sm font-medium opacity-40 max-w-sm mx-auto">
          We track every dimension over time, so you can see — not just feel — that you're getting sharper.
        </p>
      </div>
    );
  }

  const improving = growth.delta > 0;
  const flat = growth.delta === 0;
  const TrendIcon = improving ? TrendingUp : flat ? Minus : TrendingDown;
  const accent = improving ? "text-primary" : flat ? "opacity-40" : "text-destructive";

  return (
    <div className={cn("rounded-[2.5rem] border border-border/60 bg-muted/5 p-8 md:p-10 shadow-soft overflow-hidden print:border-2 print:border-black print:rounded-none print:shadow-none", className)}>
      {/* Headline delta */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-primary print:text-black">
            YOUR GROWTH · {growth.sessions} SESSIONS
          </p>
          <div className="flex items-baseline gap-4">
            <span className="speak-serif text-4xl md:text-5xl opacity-30 print:text-black print:opacity-60">{growth.baseline}</span>
            <ArrowRight className="h-6 w-6 opacity-30 self-center" />
            <span className="speak-serif text-6xl md:text-7xl font-bold text-primary print:text-black leading-none">{growth.latest}</span>
          </div>
          <p className="text-sm font-medium opacity-40 print:text-black print:opacity-100">Overall delivery score, first session → latest</p>
        </div>

        <div className={cn("flex items-center gap-3", accent)}>
          <TrendIcon className="h-8 w-8" strokeWidth={2.5} />
          <span className="speak-serif text-5xl md:text-6xl font-bold italic leading-none">{fmtDelta(growth.delta)}</span>
        </div>
      </div>

      {/* Session-over-session curve */}
      <div className={cn("-mx-2 print:hidden", compact ? "h-32 md:h-36 mb-0" : "h-44 md:h-52 mb-8")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="session"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, opacity: 0.4 }}
              tickFormatter={(v) => `S${v}`}
            />
            <YAxis domain={[0, 100]} hide />
            <ReferenceLine y={growth.baseline} stroke="hsl(var(--border))" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.2 }}
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(v) => `Session ${v}`}
              formatter={(v: number) => [`${v}`, "Overall"]}
            />
            <Area
              type="monotone"
              dataKey="overall"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fill="url(#growthFill)"
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-dimension baseline→latest */}
      {!compact && growth.perDimension.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 border-b border-border/60 pb-3 print:text-black print:border-black">
            BY DIMENSION
          </p>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
            {growth.perDimension.map((d) => {
              const up = d.delta > 0;
              const down = d.delta < 0;
              return (
                <div key={d.dimension} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold print:text-black">{d.label}</span>
                    <span
                      className={cn(
                        "font-black tabular-nums",
                        up ? "text-primary" : down ? "text-destructive" : "opacity-40",
                        "print:text-black"
                      )}
                    >
                      {d.baseline} → {d.latest} ({fmtDelta(d.delta)})
                    </span>
                  </div>
                  {/* baseline (faint) vs latest (solid) bars on a 0-100 track */}
                  <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden border border-border/60 print:border-black">
                    <div className="absolute inset-y-0 left-0 bg-primary/20" style={{ width: `${d.baseline}%` }} />
                    <div
                      className={cn("absolute inset-y-0 left-0 rounded-full", up || !down ? "bg-primary" : "bg-destructive", "print:bg-black")}
                      style={{ width: `${d.latest}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
