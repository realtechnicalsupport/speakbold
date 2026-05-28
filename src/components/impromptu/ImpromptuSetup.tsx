import { useEffect, useState, useCallback } from "react";
import { Shuffle, Mic, MicOff, Zap, Lock, Eye, X, ArrowRight, ChevronDown } from "lucide-react";
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

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const SEEN_KEY = "speakbold:impromptu:seen";
const FW_SEEN_PREFIX = "speakbold:impromptu:fw-seen:";

function loadSeenTopics(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markTopicSeen(id: string) {
  try {
    const seen = loadSeenTopics();
    seen.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch { /* ignore */ }
}

function hasSeenFramework(fw: string): boolean {
  return localStorage.getItem(`${FW_SEEN_PREFIX}${fw}`) === "1";
}

function markFrameworkSeen(fw: string) {
  try { localStorage.setItem(`${FW_SEEN_PREFIX}${fw}`, "1"); } catch { /* ignore */ }
}

// ── Framework Tutorial Modal ───────────────────────────────────────────────────
const FRAMEWORK_EXAMPLES: Record<string, { steps: { label: string; example: string }[] }> = {
  "PREP": {
    steps: [
      { label: "Point", example: "\"Asking for help is a professional skill, not a weakness.\"" },
      { label: "Reason", example: "\"No one has all the context — getting input prevents costly mistakes.\"" },
      { label: "Example", example: "\"My team shipped our biggest product after I stopped solo-solving and started asking.\"" },
      { label: "Point", example: "\"Next time you're stuck, ask before you spiral. It's the faster path.\"" },
    ],
  },
  "Past · Present · Future": {
    steps: [
      { label: "Past", example: "\"Offices used to be the only place work happened — proximity meant collaboration.\"" },
      { label: "Present", example: "\"Today, distributed teams build world-class products without sharing a zip code.\"" },
      { label: "Future", example: "\"In ten years, asking where someone works will mean what they do, not a building.\"" },
    ],
  },
  "What · So What · Now What": {
    steps: [
      { label: "What", example: "\"The average meeting has three people who didn't need to be there.\"" },
      { label: "So What", example: "\"That wasted time compounds — it signals everyone's time is equally unimportant.\"" },
      { label: "Now What", example: "\"Audit your recurring meetings. Cancel any where you're actually optional.\"" },
    ],
  },
  "Story Arc": {
    steps: [
      { label: "Setting", example: "\"It was 2 AM. The demo was in six hours. Nothing worked.\"" },
      { label: "Conflict", example: "\"I'd built it alone — no backup, no one to call.\"" },
      { label: "Turning point", example: "\"I opened Slack and typed: 'I need help.' Three people responded in minutes.\"" },
      { label: "Lesson", example: "\"The best people I know aren't the ones who never get stuck. They're the ones who ask first.\"" },
    ],
  },
};

const FrameworkTutorial = ({
  framework,
  onConfirm,
  onDismiss,
}: {
  framework: string;
  onConfirm: () => void;
  onDismiss: () => void;
}) => {
  const fw = FRAMEWORKS[framework];
  const example = FRAMEWORK_EXAMPLES[framework];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg rounded-[2.5rem] border border-primary/20 bg-background shadow-[0_16px_64px_rgba(0,0,0,0.5)] p-8 space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onDismiss}
          className="absolute top-5 right-5 h-8 w-8 flex items-center justify-center rounded-full border border-border/40 opacity-40 hover:opacity-100 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-primary/60">QUICK FRAMEWORK GUIDE</p>
          <p className="text-xl font-black">{fw?.name}</p>
          <p className="text-xs opacity-40 font-medium">{fw?.expanded}</p>
        </div>

        {/* Example steps */}
        {example && (
          <div className="space-y-3">
            {example.steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-[9px] font-black text-primary">{i + 1}</span>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">{step.label}</p>
                  <p className="text-sm italic opacity-60 leading-snug">{step.example}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <p className="text-[9px] font-medium opacity-25 leading-relaxed">
          {fw?.description} Use this as a scaffold — you don't have to follow it word-for-word.
        </p>

        <motion.button
          onClick={onConfirm}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-[1.5rem] bg-primary text-white flex items-center justify-center gap-2 shadow-glow"
        >
          <span className="text-sm font-black uppercase tracking-[0.3em]">Got it — Take the Stage</span>
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
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

  const [seenTopics, setSeenTopics] = useState<Set<string>>(() => loadSeenTopics());
  const [showTutorial, setShowTutorial] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const isTopicSeen = seenTopics.has(topic.id);

  // Enter key to begin
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !showTutorial) onBegin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBegin, showTutorial]);

  const handleBegin = useCallback(() => {
    if (!hasSeenFramework(topic.framework)) {
      setShowTutorial(true);
    } else {
      markTopicSeen(topic.id);
      setSeenTopics(loadSeenTopics());
      onBegin();
    }
  }, [topic, onBegin]);

  const handleTutorialConfirm = useCallback(() => {
    markFrameworkSeen(topic.framework);
    markTopicSeen(topic.id);
    setSeenTopics(loadSeenTopics());
    setShowTutorial(false);
    onBegin();
  }, [topic, onBegin]);

  // Compute best/worst framework for display
  const fwBreakdown = stats.frameworkBreakdown;
  const fwEntries = Object.entries(fwBreakdown).filter(([, v]) => v.count >= 2);
  let bestFw: string | null = null;
  let worstFw: string | null = null;
  if (fwEntries.length >= 2) {
    const sorted = [...fwEntries].sort((a, b) => b[1].avg - a[1].avg);
    bestFw = sorted[0][0];
    worstFw = sorted[sorted.length - 1][0];
  }

  return (
    <>
      <AnimatePresence>
        {showTutorial && (
          <FrameworkTutorial
            framework={topic.framework}
            onConfirm={handleTutorialConfirm}
            onDismiss={() => setShowTutorial(false)}
          />
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 lg:gap-12">

        {/* ── LEFT: Topic hero ────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Stats strip */}
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
              ].map((s) => (
                <div key={s.label} className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border",
                  "bg-muted/5 border-border/40"
                )}>
                  <span className={cn("text-sm font-black tabular-nums", s.color)}>{s.value}</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">{s.label}</span>
                </div>
              ))}

              {/* Framework strength chips */}
              {bestFw && worstFw && bestFw !== worstFw && (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-emerald-500/5 border-emerald-500/20">
                    <span className="text-sm font-black text-emerald-400">↑</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400/70">
                      {bestFw.split(" · ")[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-amber-500/5 border-amber-500/20">
                    <span className="text-sm font-black text-amber-400">↓</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400/70">
                      {worstFw.split(" · ")[0]}
                    </span>
                  </div>
                </>
              )}
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
              {/* Ambient glow */}
              <div className={cn(
                "absolute inset-0 opacity-20 pointer-events-none transition-all duration-700",
                diff.color === "emerald" ? "bg-[radial-gradient(ellipse_at_30%_0%,rgba(52,211,153,0.3),transparent_60%)]"
                  : diff.color === "amber" ? "bg-[radial-gradient(ellipse_at_30%_0%,rgba(251,191,36,0.3),transparent_60%)]"
                  : "bg-[radial-gradient(ellipse_at_30%_0%,rgba(248,113,113,0.3),transparent_60%)]"
              )} />

              <div className="relative z-10 p-8 md:p-12 space-y-6 bg-muted/5">
                {/* Decorative quote mark — absolute so it never affects layout */}
                <div className="absolute top-16 left-8 md:left-12 speak-serif text-[7rem] leading-none text-foreground/5 select-none pointer-events-none">
                  "
                </div>

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
                    {/* Seen indicator */}
                    {isTopicSeen && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest opacity-25">
                        <Eye className="h-2.5 w-2.5" />
                        done
                      </span>
                    )}
                  </div>

                  <button
                    onClick={onShuffle}
                    aria-label="Shuffle topic"
                    className="group h-10 w-10 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <Shuffle className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-500" />
                  </button>
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
                {recentHistory.slice(0, 3).map((s, i) => {
                  const open = expandedSession === s.id;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "rounded-2xl bg-muted/3 border overflow-hidden transition-colors",
                        open ? "border-border/70" : "border-border/30 hover:border-border/60"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedSession(open ? null : s.id)}
                        className="w-full flex items-center gap-4 px-4 py-3 text-left"
                      >
                        <span className={cn("text-sm font-black tabular-nums w-10 shrink-0", scoreColor(s.score))}>
                          {s.score}
                        </span>
                        <span className="flex-1 text-xs font-medium opacity-40 truncate">{s.topicText}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-20 shrink-0">
                          {s.duration}s
                        </span>
                        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
                          <ChevronDown className="h-3.5 w-3.5 opacity-30" />
                        </motion.div>
                      </button>

                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ height: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2 } }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-3 border-t border-border/20 space-y-3">
                              {s.verdict && (
                                <p className="speak-serif text-sm italic leading-snug opacity-60">"{s.verdict}"</p>
                              )}
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { label: "WPM", value: s.wpm > 0 ? s.wpm : "—" },
                                  { label: "FILLERS", value: s.fillerCount },
                                  { label: "WORDS", value: s.totalWords },
                                ].map(m => (
                                  <div key={m.label} className="rounded-xl border border-border/25 bg-muted/4 px-3 py-2">
                                    <p className="text-sm font-black tabular-nums leading-none">{m.value}</p>
                                    <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-25 mt-1">{m.label}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                                  s.difficulty === "Easy" ? "text-emerald-400 border-emerald-400/25 bg-emerald-400/5"
                                    : s.difficulty === "Medium" ? "text-amber-400 border-amber-400/25 bg-amber-400/5"
                                    : "text-red-400 border-red-400/25 bg-red-400/5"
                                )}>
                                  {s.difficulty}
                                </span>
                                {s.framework && (
                                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-primary/25 bg-primary/5 text-primary/70">
                                    {s.framework.split(" · ")[0]}
                                  </span>
                                )}
                                <span className="text-[9px] font-medium uppercase tracking-widest opacity-25 ml-auto">
                                  {timeAgo(s.timestamp)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Config + BEGIN ──────────────────────────────────────── */}
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
              onClick={handleBegin}
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
    </>
  );
};
