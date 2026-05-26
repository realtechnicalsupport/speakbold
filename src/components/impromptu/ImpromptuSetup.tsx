import { useEffect } from "react";
import { Shuffle, Mic, MicOff, Zap, Lock, Flame, Trophy, Target, ChevronRight, ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Difficulty, ImpromptuTopic } from "@/data/impromptuTopics";
import { FRAMEWORKS } from "@/data/impromptuTopics";
import type { ImpromptuStats } from "@/lib/impromptuHistory";
import type { ImpromptuSessionRecord } from "@/lib/impromptuHistory";

interface Props {
  topic: ImpromptuTopic;
  difficulty: Difficulty;
  duration: number;
  curveballEnabled: boolean;
  recordEnabled: boolean;
  challengeMode: boolean;
  stats: ImpromptuStats;
  recentHistory: ImpromptuSessionRecord[];
  hasUser: boolean;
  onBegin: () => void;
  onShuffle: () => void;
  onSetDifficulty: (d: Difficulty) => void;
  onSetDuration: (d: number) => void;
  onSetCurveball: (v: boolean) => void;
  onSetRecord: (v: boolean) => void;
  onSetChallenge: (v: boolean) => void;
}

const DIFFICULTIES: { level: Difficulty; color: string; dots: number; label: string }[] = [
  { level: "Easy", color: "emerald", dots: 1, label: "Personal · Narrative" },
  { level: "Medium", color: "amber", dots: 2, label: "Opinion · Evidence" },
  { level: "Hard", color: "red", dots: 3, label: "Debate · Philosophy" },
];

const DURATIONS = [30, 60, 90, 120];

const scoreColor = (s: number) =>
  s >= 75 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-red-400";

export const ImpromptuSetup = ({
  topic,
  difficulty,
  duration,
  curveballEnabled,
  recordEnabled,
  challengeMode,
  stats,
  recentHistory,
  hasUser,
  onBegin,
  onShuffle,
  onSetDifficulty,
  onSetDuration,
  onSetCurveball,
  onSetRecord,
  onSetChallenge,
}: Props) => {
  const framework = FRAMEWORKS[topic.framework];
  const diff = DIFFICULTIES.find(d => d.level === difficulty)!;

  // Enter key to begin
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) onBegin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBegin]);

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8 lg:gap-12">

      {/* ── LEFT: Topic hero ──────────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* Stats strip — only when user has history */}
        {stats.totalSessions > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 flex-wrap"
          >
            {[
              { label: "SESSIONS", value: stats.totalSessions, color: "text-foreground" },
              { label: "AVG", value: `${stats.avgScore}`, color: stats.avgScore >= 70 ? "text-emerald-400" : stats.avgScore >= 50 ? "text-amber-400" : "text-red-400" },
              { label: "BEST", value: `${stats.bestScore}`, color: "text-amber-400" },
              { label: "STREAK", value: `${stats.streak}d`, color: stats.streak > 0 ? "text-orange-400" : "text-foreground" },
            ].map((s, i) => (
              <div key={s.label} className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border",
                "bg-muted/5 border-border/40"
              )}>
                <span className={cn("text-sm font-black tabular-nums", s.color)}>{s.value}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">{s.label}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Difficulty selector */}
        <div className="grid grid-cols-3 gap-3">
          {DIFFICULTIES.map(d => (
            <button
              key={d.level}
              onClick={() => onSetDifficulty(d.level)}
              className={cn(
                "relative p-4 rounded-2xl border-2 transition-all duration-300 text-left group overflow-hidden",
                difficulty === d.level
                  ? d.color === "emerald" ? "border-emerald-500/60 bg-emerald-500/8 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
                    : d.color === "amber" ? "border-amber-500/60 bg-amber-500/8 shadow-[0_0_20px_rgba(251,191,36,0.1)]"
                    : "border-red-500/60 bg-red-500/8 shadow-[0_0_20px_rgba(248,113,113,0.1)]"
                  : "border-border/40 bg-muted/3 hover:border-border/80"
              )}
            >
              {/* Intensity dots */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className={cn(
                    "h-1.5 w-4 rounded-full transition-all duration-300",
                    n <= d.dots
                      ? difficulty === d.level
                        ? d.color === "emerald" ? "bg-emerald-400"
                          : d.color === "amber" ? "bg-amber-400"
                          : "bg-red-400"
                        : "bg-foreground/20"
                      : "bg-foreground/6"
                  )} />
                ))}
              </div>
              <p className={cn(
                "text-xs font-black uppercase tracking-[0.3em] transition-colors",
                difficulty === d.level
                  ? d.color === "emerald" ? "text-emerald-400"
                    : d.color === "amber" ? "text-amber-400"
                    : "text-red-400"
                  : "text-foreground/40"
              )}>
                {d.level}
              </p>
              <p className="text-[9px] font-medium opacity-30 mt-0.5 hidden md:block">{d.label}</p>
            </button>
          ))}
        </div>

        {/* Topic card — the hero */}
        <AnimatePresence mode="wait">
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-[2.5rem] overflow-hidden border border-border/60 shadow-[0_2px_40px_rgba(0,0,0,0.3)]"
          >
            {/* Ambient glow layer */}
            <div className={cn(
              "absolute inset-0 opacity-20 pointer-events-none transition-all duration-700",
              diff.color === "emerald" ? "bg-[radial-gradient(ellipse_at_30%_0%,rgba(52,211,153,0.3),transparent_60%)]"
                : diff.color === "amber" ? "bg-[radial-gradient(ellipse_at_30%_0%,rgba(251,191,36,0.3),transparent_60%)]"
                : "bg-[radial-gradient(ellipse_at_30%_0%,rgba(248,113,113,0.3),transparent_60%)]"
            )} />

            <div className="relative z-10 p-8 md:p-12 space-y-8 bg-muted/5">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-[0.4em] px-3 py-1.5 rounded-full border",
                    diff.color === "emerald" ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/5"
                      : diff.color === "amber" ? "text-amber-400 border-amber-400/30 bg-amber-400/5"
                      : "text-red-400 border-red-400/30 bg-red-400/5"
                  )}>
                    {topic.difficulty}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-25">
                    {topic.category}
                  </span>
                </div>

                <button
                  onClick={onShuffle}
                  aria-label="Shuffle topic"
                  className="group h-10 w-10 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Shuffle className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-500" />
                </button>
              </div>

              {/* Decorative quote mark */}
              <div className="speak-serif text-[6rem] leading-none text-foreground/5 select-none -mb-6 -mt-2">
                "
              </div>

              {/* Topic text */}
              <h2 className="speak-serif text-2xl md:text-4xl lg:text-5xl leading-[1.1] tracking-tighter">
                {topic.text}
              </h2>

              {/* Framework */}
              {framework && (
                <div className="pt-6 border-t border-border/30 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-25">FRAMEWORK</p>
                    <p className="text-sm font-black text-primary italic">{framework.name}</p>
                  </div>
                  <p className="text-[10px] font-medium opacity-25 text-right max-w-[200px] leading-relaxed hidden md:block">
                    {framework.expanded}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Recent sessions */}
        {recentHistory.length > 0 && (
          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-25">RECENT</p>
            <div className="space-y-2">
              {recentHistory.slice(0, 3).map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group flex items-center gap-4 px-4 py-3 rounded-2xl bg-muted/3 border border-border/30 hover:border-border/60 transition-all"
                >
                  <span className={cn("text-sm font-black tabular-nums w-10 shrink-0", scoreColor(s.score))}>
                    {s.score}
                  </span>
                  <span className="flex-1 text-xs font-medium opacity-40 truncate">{s.topicText}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-20 shrink-0">
                    {s.duration}s
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Config + BEGIN ─────────────────────────────────────────── */}
      <aside>
        <div className="sticky top-28 space-y-4">

          {/* Duration */}
          <div className="rounded-[1.75rem] border border-border/40 bg-muted/3 p-5 space-y-4">
            <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">DURATION</p>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => onSetDuration(d)}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-black tracking-widest border transition-all duration-200",
                    duration === d
                      ? "bg-primary text-white border-primary shadow-glow"
                      : "border-border/40 opacity-40 hover:opacity-80"
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="rounded-[1.75rem] border border-border/40 bg-muted/3 p-5 divide-y divide-border/30">
            {[
              {
                key: "curveball",
                icon: <Zap className="h-3.5 w-3.5" />,
                label: "CURVEBALL",
                sub: curveballEnabled ? "TWIST AT 55%" : "OFF",
                active: curveballEnabled,
                activeColor: "text-primary border-primary/30 bg-primary/8",
                toggle: onSetCurveball,
                value: curveballEnabled,
                disabled: false,
              },
              {
                key: "challenge",
                icon: <Lock className="h-3.5 w-3.5" />,
                label: "CHALLENGE",
                sub: challengeMode ? "HINTS LOCKED" : "OFF",
                active: challengeMode,
                activeColor: "text-amber-400 border-amber-400/30 bg-amber-400/8",
                toggle: onSetChallenge,
                value: challengeMode,
                disabled: false,
              },
              {
                key: "record",
                icon: recordEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />,
                label: "RECORD",
                sub: !hasUser ? "SIGN IN" : recordEnabled ? "SAVING" : "OFF",
                active: recordEnabled,
                activeColor: "text-primary border-primary/30 bg-primary/8",
                toggle: onSetRecord,
                value: recordEnabled,
                disabled: !hasUser,
              },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center border transition-all",
                    item.active ? item.activeColor : "text-foreground/20 border-border/30"
                  )}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em]">{item.label}</p>
                    <p className="text-[9px] font-medium opacity-25 uppercase tracking-widest">{item.sub}</p>
                  </div>
                </div>
                <Switch
                  checked={item.value}
                  onCheckedChange={item.toggle}
                  disabled={item.disabled}
                />
              </div>
            ))}
          </div>

          {/* BEGIN */}
          <motion.button
            onClick={onBegin}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full py-6 rounded-[1.75rem] bg-primary text-white overflow-hidden group"
            style={{ boxShadow: "0 0 40px rgba(var(--primary-rgb, 139,92,246), 0.35)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center justify-center gap-3">
              <span className="text-sm font-black uppercase tracking-[0.3em]">TAKE THE STAGE</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>

          {/* Keyboard hint */}
          <p className="text-center text-[9px] font-medium opacity-15 uppercase tracking-[0.4em]">
            or press <kbd className="font-mono bg-foreground/10 px-1.5 py-0.5 rounded text-[9px]">Enter</kbd>
          </p>

          {/* Session summary */}
          <p className="text-center text-[9px] font-medium opacity-20 uppercase tracking-widest">
            {framework?.name} · {duration}s · {difficulty}
          </p>
        </div>
      </aside>
    </div>
  );
};
