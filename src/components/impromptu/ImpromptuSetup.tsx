import { useEffect, useState, useCallback } from "react";
import { Shuffle, Mic, MicOff, Zap, Lock, Eye, X, ArrowRight, ArrowLeft, Check, Calendar, Target } from "lucide-react";
import { getTodayPlan } from "@/lib/impromptuPlan";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Difficulty, ImpromptuTopic } from "@/data/impromptuTopics";
import { FRAMEWORKS, COMPETITION_PREP_SECONDS, COMPETITION_SPEAK_SECONDS } from "@/data/impromptuTopics";
import type { ImpromptuStats } from "@/lib/impromptuHistory";
import type { ImpromptuSessionRecord } from "@/lib/impromptuHistory";

interface Props {
  topic: ImpromptuTopic;
  difficulty: Difficulty;
  duration: number;
  /** Prep-time override in seconds; 0 = auto (difficulty default). */
  prepTime: number;
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
  onSetPrepTime: (s: number) => void;
  onSetCurveball: (v: boolean) => void;
  onSetRecord: (v: boolean) => void;
  onSetChallenge: (v: boolean) => void;
}

const DIFFICULTIES: { level: Difficulty; color: string; dots: number; label: string }[] = [
  { level: "Easy", color: "emerald", dots: 1, label: "Personal · Narrative" },
  { level: "Medium", color: "amber", dots: 2, label: "Opinion · Evidence" },
  { level: "Hard", color: "red", dots: 3, label: "Debate · Philosophy" },
  { level: "News", color: "sky", dots: 3, label: "Current Affairs · Real Issues" },
];

// Per-color class lookups — keeps the difficulty-themed styling in one place so
// new tiers only need an entry here rather than another nested ternary.
const DIFF_STYLE: Record<string, {
  selected: string;   // selected selector-card border/bg/shadow
  dotActive: string;  // active difficulty dot
  textActive: string; // active label text
  glow: string;       // ambient glow on the topic card
  badge: string;      // difficulty badge on the topic card
}> = {
  emerald: {
    selected: "border-emerald-500/60 bg-emerald-500/8 shadow-[0_0_20px_rgba(52,211,153,0.1)]",
    dotActive: "bg-emerald-400",
    textActive: "text-emerald-400",
    glow: "bg-[radial-gradient(ellipse_at_30%_0%,rgba(52,211,153,0.3),transparent_60%)]",
    badge: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
  },
  amber: {
    selected: "border-amber-500/60 bg-amber-500/8 shadow-[0_0_20px_rgba(251,191,36,0.1)]",
    dotActive: "bg-amber-400",
    textActive: "text-amber-400",
    glow: "bg-[radial-gradient(ellipse_at_30%_0%,rgba(251,191,36,0.3),transparent_60%)]",
    badge: "text-amber-400 border-amber-400/30 bg-amber-400/5",
  },
  red: {
    selected: "border-red-500/60 bg-red-500/8 shadow-[0_0_20px_rgba(248,113,113,0.1)]",
    dotActive: "bg-red-400",
    textActive: "text-red-400",
    glow: "bg-[radial-gradient(ellipse_at_30%_0%,rgba(248,113,113,0.3),transparent_60%)]",
    badge: "text-red-400 border-red-400/30 bg-red-400/5",
  },
  sky: {
    selected: "border-sky-500/60 bg-sky-500/8 shadow-[0_0_20px_rgba(56,189,248,0.1)]",
    dotActive: "bg-sky-400",
    textActive: "text-sky-400",
    glow: "bg-[radial-gradient(ellipse_at_30%_0%,rgba(56,189,248,0.3),transparent_60%)]",
    badge: "text-sky-400 border-sky-400/30 bg-sky-400/5",
  },
};

const DURATIONS = [30, 60, 120, 180];
// Prep-length choices. 0 = auto (derive from difficulty). 180 = competition prep.
const PREP_CHOICES: { value: number; label: string }[] = [
  { value: 0, label: "Auto" },
  { value: 60, label: "1:00" },
  { value: 120, label: "2:00" },
  { value: 180, label: "3:00" },
];

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
  "Three Pillars": {
    steps: [
      { label: "Claim", example: "\"Cities should make public transport free — it's the highest-leverage thing they can do.\"" },
      { label: "Pillar 1 — Money", example: "\"It puts cash back in the pockets of the people who need it most, every single day.\"" },
      { label: "Pillar 2 — Roads", example: "\"Fewer cars means less congestion — even drivers win.\"" },
      { label: "Pillar 3 — Climate", example: "\"And it's the fastest emissions cut a mayor can actually deliver.\"" },
      { label: "Close", example: "\"Money, roads, climate — free transit isn't a cost, it's the smartest investment a city can make.\"" },
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
  prepTime,
  curveballEnabled,
  recordEnabled,
  challengeMode,
  stats,
  hasUser,
  onBegin,
  onShuffle,
  onSetDifficulty,
  onSetDuration,
  onSetPrepTime,
  onSetCurveball,
  onSetRecord,
  onSetChallenge,
}: Props) => {
  const framework = FRAMEWORKS[topic.framework];
  const diff = DIFFICULTIES.find(d => d.level === difficulty)!;

  // "Competition 3+3" is on when both prep and speak match the contest format.
  const isCompetition = prepTime === COMPETITION_PREP_SECONDS && duration === COMPETITION_SPEAK_SECONDS;
  const setCompetition = useCallback(() => {
    onSetPrepTime(COMPETITION_PREP_SECONDS);
    onSetDuration(COMPETITION_SPEAK_SECONDS);
  }, [onSetPrepTime, onSetDuration]);

  const [seenTopics, setSeenTopics] = useState<Set<string>>(() => loadSeenTopics());
  const [showTutorial, setShowTutorial] = useState(false);

  const isTopicSeen = seenTopics.has(topic.id);

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

  // ── Stepped setup: difficulty → format → ready ──────────────────────────
  // One decision per screen so a first-timer is never staring at topic +
  // difficulty + duration + 3 toggles + history all at once. Props/handlers
  // are unchanged — this only re-paces WHEN each control is shown.
  const STEP_LABELS = ["Difficulty", "Format", "Ready"] as const;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const goNext = useCallback(() => setStep(s => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s)), []);
  const goBack = useCallback(() => setStep(s => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s)), []);

  // ── Training plan ────────────────────────────────────────────────────────
  // The countdown program to the competition. Applying it sets every relevant
  // control to this week's recommended drill and jumps straight to "Ready".
  const plan = getTodayPlan();
  const applyTodayPlan = useCallback(() => {
    const r = plan.current?.recommended;
    if (!r) return;
    onSetDifficulty(r.difficulty);   // also re-rolls the topic to this difficulty
    onSetDuration(r.duration);
    onSetPrepTime(r.prepTime);
    onSetChallenge(r.challengeMode);
    onSetCurveball(r.curveballEnabled);
    setStep(3);
  }, [plan, onSetDifficulty, onSetDuration, onSetPrepTime, onSetChallenge, onSetCurveball]);

  // Enter advances through the steps, then launches on the final one.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || showTutorial) return;
      if (step < 3) goNext();
      else handleBegin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, showTutorial, goNext, handleBegin]);

  const recordSub = !hasUser ? "SIGN IN" : recordEnabled ? "SAVING" : "OFF";
  const toggleSummary = [
    curveballEnabled && "Curveball",
    challengeMode && "Challenge",
    recordEnabled && "Recording",
  ].filter(Boolean).join(" · ") || "No add-ons";

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

      {/* Single, centered column — every step fits a phone without a sidebar. */}
      <div className="max-w-2xl mx-auto min-w-0">

        {/* ── Step indicator (tap a past step to go back) ── */}
        <div className="flex items-center gap-2.5 mb-6 md:mb-10">
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const done = step > n;
            const active = step === n;
            return (
              <button
                key={label}
                type="button"
                onClick={() => n < step && setStep(n)}
                disabled={n >= step}
                className={cn("flex-1 text-left space-y-2 group", n < step && "cursor-pointer")}
              >
                <div className={cn(
                  "h-1.5 rounded-full transition-colors duration-300",
                  active || done ? "bg-primary" : "bg-border/40"
                )} />
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 transition-colors",
                  active ? "text-primary" : done ? "opacity-60 group-hover:opacity-90" : "opacity-40"
                )}>
                  {done ? <Check className="h-2.5 w-2.5" /> : <span className="tabular-nums">{n}</span>}
                  <span className="truncate">{label}</span>
                </p>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ════════ STEP 1 — DIFFICULTY ════════ */}
          {step === 1 && (
            <motion.div
              key="step-difficulty"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5 md:space-y-7"
            >
              {/* ── Today's training plan — the countdown to competition day ── */}
              {plan.current && (
                <div className="rounded-[1.75rem] border border-primary/25 bg-gradient-to-br from-primary/8 to-transparent p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {plan.isCompetitionDay ? "Competition day" : `Week ${plan.weekIndex} of ${plan.totalWeeks}`}
                    </p>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] tabular-nums opacity-50">
                      {plan.isCompetitionDay ? "today" : `${plan.daysUntil} day${plan.daysUntil === 1 ? "" : "s"} left`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-base font-black">{plan.current.phase}</p>
                    <p className="text-xs opacity-60 font-medium leading-relaxed">{plan.current.focus}</p>
                  </div>

                  <div className="flex items-start gap-2 rounded-xl bg-muted/10 border border-border/30 p-3">
                    <Target className="h-3.5 w-3.5 text-primary/70 shrink-0 mt-0.5" />
                    <p className="text-[11px] opacity-50 leading-relaxed">{plan.current.tip}</p>
                  </div>

                  <button
                    onClick={applyTodayPlan}
                    className="w-full h-12 rounded-[1.25rem] bg-primary text-white flex items-center justify-center gap-2 shadow-glow group"
                  >
                    <span className="text-xs font-black uppercase tracking-[0.3em]">Set up today's drill</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="speak-serif text-3xl md:text-4xl tracking-tighter leading-tight">
                  {plan.current ? <>Or pick your <span className="text-primary italic">own.</span></> : <>How hard do you <span className="text-primary italic">want it?</span></>}
                </h2>
                <p className="text-sm opacity-60 font-medium">Pick a challenge level — you can shuffle the topic later.</p>
              </div>

              {/* Difficulty cards */}
              <div className="grid grid-cols-2 gap-3">
                {DIFFICULTIES.map(d => {
                  const style = DIFF_STYLE[d.color];
                  const selected = difficulty === d.level;
                  return (
                    <button
                      key={d.level}
                      onClick={() => onSetDifficulty(d.level)}
                      className={cn(
                        "relative p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 text-left group overflow-hidden",
                        selected ? style.selected : "border-border/40 bg-muted/3 hover:border-border/80"
                      )}
                    >
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3].map(n => (
                          <div key={n} className={cn(
                            "h-1.5 w-4 rounded-full transition-all duration-300",
                            n <= d.dots
                              ? selected ? style.dotActive : "bg-foreground/20"
                              : "bg-foreground/6"
                          )} />
                        ))}
                      </div>
                      <p className={cn(
                        "text-xs font-black uppercase tracking-[0.3em] transition-colors",
                        selected ? style.textActive : "text-foreground/40"
                      )}>
                        {d.level}
                      </p>
                      <p className="text-[9px] font-medium opacity-30 mt-0.5">{d.label}</p>
                    </button>
                  );
                })}
              </div>

              {/* Slim stats strip for returning users */}
              {stats.totalSessions > 0 && (
                <div className="flex items-center gap-2.5 flex-wrap">
                  {[
                    { label: "SESSIONS", value: stats.totalSessions, color: "text-foreground" },
                    { label: "AVG", value: `${stats.avgScore}`, color: stats.avgScore >= 70 ? "text-emerald-400" : stats.avgScore >= 50 ? "text-amber-400" : "text-red-400" },
                    { label: "BEST", value: `${stats.bestScore}`, color: "text-amber-400" },
                    { label: "STREAK", value: `${stats.streak}d`, color: stats.streak > 0 ? "text-orange-400" : "text-foreground" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-muted/5 border-border/40">
                      <span className={cn("text-sm font-black tabular-nums", s.color)}>{s.value}</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">{s.label}</span>
                    </div>
                  ))}
                  {bestFw && worstFw && bestFw !== worstFw && (
                    <>
                      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-emerald-500/5 border-emerald-500/20">
                        <span className="text-sm font-black text-emerald-400">↑</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400/70">{bestFw.split(" · ")[0]}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-amber-500/5 border-amber-500/20">
                        <span className="text-sm font-black text-amber-400">↓</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400/70">{worstFw.split(" · ")[0]}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ════════ STEP 2 — FORMAT ════════ */}
          {step === 2 && (
            <motion.div
              key="step-format"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5 md:space-y-7"
            >
              <div className="space-y-2">
                <h2 className="speak-serif text-3xl md:text-4xl tracking-tighter leading-tight">
                  Set your <span className="text-primary italic">format.</span>
                </h2>
                <p className="text-sm opacity-60 font-medium">How long you speak, and the optional twists.</p>
              </div>

              {/* Competition 3+3 preset — one tap sets a 3-min prep + 3-min speech,
                  matching the real contest format. Tapping again is a no-op; pick
                  any manual prep/duration below to leave the preset. */}
              <button
                onClick={setCompetition}
                className={cn(
                  "w-full rounded-[1.75rem] border-2 p-5 text-left transition-all duration-300 group",
                  isCompetition
                    ? "border-primary/60 bg-primary/8 shadow-[0_0_24px_rgba(139,92,246,0.12)]"
                    : "border-dashed border-border/50 bg-muted/3 hover:border-primary/40"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-[0.35em] flex items-center gap-2",
                      isCompetition ? "text-primary" : "opacity-50"
                    )}>
                      <Zap className="h-3.5 w-3.5" /> Competition 3 + 3
                    </p>
                    <p className="text-[10px] font-medium opacity-30 mt-1">
                      3-minute prep, then a 3-minute speech — the real contest format.
                    </p>
                  </div>
                  {isCompetition && (
                    <span className="shrink-0 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </button>

              {/* Prep length */}
              <div className="rounded-[1.75rem] border border-border/40 bg-muted/3 p-5 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">PREP TIME</p>
                <div className="grid grid-cols-4 gap-2">
                  {PREP_CHOICES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => onSetPrepTime(p.value)}
                      className={cn(
                        "py-3 rounded-xl text-xs font-black tracking-widest border transition-all duration-200",
                        prepTime === p.value
                          ? "bg-primary text-white border-primary shadow-glow"
                          : "border-border/40 opacity-40 hover:opacity-80"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="rounded-[1.75rem] border border-border/40 bg-muted/3 p-5 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">SPEAK FOR</p>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => onSetDuration(d)}
                      className={cn(
                        "py-3 rounded-xl text-xs font-black tracking-widest border transition-all duration-200",
                        duration === d
                          ? "bg-primary text-white border-primary shadow-glow"
                          : "border-border/40 opacity-40 hover:opacity-80"
                      )}
                    >
                      {d >= 60 ? `${d / 60}m` : `${d}s`}
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
                    sub: curveballEnabled ? "TWIST AT 55%" : "A surprise prompt mid-speech",
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
                    sub: challengeMode ? "HINTS LOCKED" : "Hide the framework hints",
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
                    sub: recordSub === "SIGN IN" ? "Sign in to save & get AI feedback" : recordEnabled ? "Saving for AI feedback" : "Off",
                    active: recordEnabled,
                    activeColor: "text-primary border-primary/30 bg-primary/8",
                    toggle: onSetRecord,
                    value: recordEnabled,
                    disabled: !hasUser,
                  },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "h-8 w-8 shrink-0 rounded-full flex items-center justify-center border transition-all",
                        item.active ? item.activeColor : "text-foreground/20 border-border/30"
                      )}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.35em]">{item.label}</p>
                        <p className="text-[10px] font-medium opacity-30 truncate">{item.sub}</p>
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
            </motion.div>
          )}

          {/* ════════ STEP 3 — READY ════════ */}
          {step === 3 && (
            <motion.div
              key="step-ready"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="speak-serif text-3xl md:text-4xl tracking-tighter leading-tight">
                  You're <span className="text-primary italic">up.</span>
                </h2>
                <p className="text-sm opacity-60 font-medium">Here's your prompt — shuffle if it doesn't spark.</p>
              </div>

              {/* Topic card — the hero, revealed at the end */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative rounded-[2.5rem] overflow-hidden border border-border/60 shadow-[0_2px_40px_rgba(0,0,0,0.3)]"
                >
                  <div className={cn(
                    "absolute inset-0 opacity-20 pointer-events-none transition-all duration-700",
                    DIFF_STYLE[diff.color].glow
                  )} />
                  <div className="relative z-10 p-7 md:p-10 space-y-6 bg-muted/5">
                    <div className="absolute top-14 left-7 md:left-10 speak-serif text-[7rem] leading-none text-foreground/5 select-none pointer-events-none">
                      "
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-[0.25em] md:tracking-[0.4em] px-3 py-1.5 rounded-full border shrink-0",
                          DIFF_STYLE[diff.color].badge
                        )}>
                          {topic.difficulty}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] opacity-25 min-w-0 truncate">
                          {topic.category}
                        </span>
                        {isTopicSeen && (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest opacity-25 shrink-0">
                            <Eye className="h-2.5 w-2.5" />
                            done
                          </span>
                        )}
                      </div>
                      <button
                        onClick={onShuffle}
                        aria-label="Shuffle topic"
                        className="group h-10 w-10 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all shrink-0"
                      >
                        <Shuffle className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-500" />
                      </button>
                    </div>
                    <h2 className="speak-serif text-2xl md:text-4xl leading-[1.1] tracking-tighter">
                      {topic.text}
                    </h2>
                    {framework && (
                      <div className="pt-6 border-t border-border/30 flex items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-25">FRAMEWORK</p>
                          <p className="text-sm font-black text-primary italic truncate">{framework.name}</p>
                        </div>
                        <p className="text-[10px] font-medium opacity-25 text-right max-w-[200px] leading-relaxed hidden md:block">
                          {framework.expanded}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Config recap chips */}
              <div className="flex items-center justify-center gap-2 flex-wrap text-[10px] font-black uppercase tracking-widest">
                <span className="px-3 py-1.5 rounded-full border border-border/50 bg-muted/5">{difficulty}</span>
                {isCompetition ? (
                  <span className="px-3 py-1.5 rounded-full border border-primary/40 bg-primary/8 text-primary flex items-center gap-1.5">
                    <Zap className="h-3 w-3" /> Competition 3 + 3
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full border border-border/50 bg-muted/5">
                    {prepTime > 0 ? `${Math.round(prepTime / 60 * 10) / 10}m prep · ` : ""}
                    {duration >= 60 ? `${duration / 60}m` : `${duration}s`} speak
                  </span>
                )}
                <span className="px-3 py-1.5 rounded-full border border-border/50 bg-muted/5 opacity-60">{toggleSummary}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer nav: Back · Next / Take the Stage ── */}
        <div className="flex items-center gap-3 mt-6 md:mt-10">
          {step > 1 && (
            <button
              onClick={goBack}
              className="shrink-0 h-14 px-5 rounded-[1.5rem] border border-border/50 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] opacity-50 hover:opacity-100 transition-opacity"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}

          {step < 3 ? (
            <motion.button
              onClick={goNext}
              whileTap={{ scale: 0.98 }}
              className="flex-1 h-14 rounded-[1.5rem] bg-primary text-white flex items-center justify-center gap-3 shadow-glow group"
            >
              <span className="text-sm font-black uppercase tracking-[0.3em]">Next</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleBegin}
              whileTap={{ scale: 0.98 }}
              className="relative flex-1 h-14 rounded-[1.5rem] bg-primary text-white overflow-hidden group"
              style={{ boxShadow: "0 0 40px rgba(var(--primary-rgb, 139,92,246), 0.35)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="relative flex items-center justify-center gap-3">
                <span className="text-sm font-black uppercase tracking-[0.3em]">Take the Stage</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          )}
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-[9px] font-medium opacity-15 uppercase tracking-[0.4em] mt-4">
          or press <kbd className="font-mono bg-foreground/10 px-1.5 py-0.5 rounded text-[9px]">Enter</kbd>
        </p>
      </div>
    </>
  );
};
