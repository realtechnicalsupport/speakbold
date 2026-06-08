import { useEffect, useRef, useState, useCallback } from "react";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { RecordingsList } from "@/components/RecordingsList";
import { Switch } from "@/components/ui/switch";
import {
  Play,
  Pause,
  RotateCcw,
  Mic,
  Clock,
  Target,
  Sparkles,
  Shuffle,
  Zap,
  ArrowRight,
  ArrowLeft,
  Microscope,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { useSyncedInterviewQuestions } from "@/hooks/useSyncedInterviewQuestions";
import { setTimerActive, setTimerSeconds } from "@/lib/timerState";
import { setRecordingActive } from "@/lib/recordingState";
import { RecordingFeedbackModal } from "@/components/RecordingFeedback";
import { LiveSpeechHUD } from "@/components/LiveSpeechHUD";
import { useLiveSpeechMetrics } from "@/hooks/useLiveSpeechMetrics";
import { motion, AnimatePresence } from "framer-motion";

type Difficulty = "Warm-up" | "Standard" | "Pressure";

interface Question {
  id: string;
  q: string;
  type: string;
  guidance: string;
  example: string;
  targetSeconds: number;
  difficulty: Difficulty;
  keyPoints: string[];
  is_ai?: boolean;
}

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: "q1",
    q: "Tell me about yourself.",
    type: "Tell me about yourself",
    guidance: "Use Present, Past, Future. One line on what you do now, two on the experience that built you, one on why this role is the natural next step.",
    example: "I'm a product designer focused on fintech...",
    targetSeconds: 75,
    difficulty: "Warm-up",
    keyPoints: ["Present context", "Past experience", "Future alignment"],
  },
  {
    id: "q-warm-2",
    q: "Why are you interested in this role?",
    type: "Motivation",
    guidance: "Connect a genuine interest to something specific about the company or role. Avoid generic praise — name the thing that actually pulled you in.",
    example: "I've followed your work on X, and the chance to...",
    targetSeconds: 60,
    difficulty: "Warm-up",
    keyPoints: ["Specific hook", "Genuine motivation", "Mutual fit"],
  },
  {
    id: "q2",
    q: "Tell me about a time you failed.",
    type: "Behavioural",
    guidance: "STAR: Situation, Task, Action, Result. Pick a real failure with a clean lesson.",
    example: "Led a launch with a team of five...",
    targetSeconds: 90,
    difficulty: "Standard",
    keyPoints: ["Situation", "Task", "Action", "Result"],
  },
  {
    id: "q-std-2",
    q: "Describe a conflict with a coworker and how you resolved it.",
    type: "Behavioural",
    guidance: "STAR. Stay neutral about the other person — focus on what YOU did to de-escalate and reach a working outcome.",
    example: "A teammate and I disagreed on the architecture...",
    targetSeconds: 90,
    difficulty: "Standard",
    keyPoints: ["Neutral framing", "Your action", "Resolution", "Lesson"],
  },
  {
    id: "q-pres-1",
    q: "Why should we hire you over other candidates?",
    type: "Pressure",
    guidance: "Be confident, not arrogant. Name two or three concrete strengths and tie each to the role's actual needs. End on what you'd deliver.",
    example: "Three things set me apart for this role...",
    targetSeconds: 75,
    difficulty: "Pressure",
    keyPoints: ["Concrete strengths", "Tied to the role", "What you'll deliver"],
  },
  {
    id: "q-pres-2",
    q: "Tell me about a time you disagreed with your manager.",
    type: "Pressure",
    guidance: "STAR. Show you can push back respectfully with evidence, then commit to the decision. Avoid making your manager the villain.",
    example: "I thought we were prioritising the wrong feature...",
    targetSeconds: 90,
    difficulty: "Pressure",
    keyPoints: ["Respectful pushback", "Evidence-based", "Outcome", "Disagree & commit"],
  },
];

const STAR = [
  { letter: "S", word: "SITUATION", line: "Set the scene in one sentence." },
  { letter: "T", word: "TASK", line: "What were you responsible for?" },
  { letter: "A", word: "ACTION", line: "What did YOU specifically do?" },
  { letter: "R", word: "RESULT", line: "Outcome & Lesson learned." },
];

const TIERS: { id: Difficulty; dots: number; desc: string }[] = [
  { id: "Warm-up", dots: 1, desc: "Ease into it" },
  { id: "Standard", dots: 2, desc: "Core behavioural" },
  { id: "Pressure", dots: 3, desc: "High-stakes" },
];

const STEP_LABELS = ["Difficulty", "Question", "Ready"] as const;

const Interviews = () => {
  const [active, setActive] = useState(0);
  const [tier, setTier] = useState<Difficulty>("Warm-up");
  const [revealed, setRevealed] = useState(false);
  const [recordEnabled, setRecordEnabled] = useState(false);
  const [autoFeedbackId, setAutoFeedbackId] = useState<string | null>(null);
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());

  // Incremental setup → active. Same timer/recorder engine as before, only the
  // configuration is now paced across steps.
  const [phase, setPhase] = useState<"setup" | "active">("setup");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const { questions: syncedAIQuestions } = useSyncedInterviewQuestions();

  // Timer state
  const [duration, setDuration] = useState(75);
  const [seconds, setSeconds] = useState(75);
  const [running, setRunning] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  useEffect(() => {
    setTimerActive(running || pausedAt !== null);
    setTimerSeconds(seconds, duration);
    return () => { setTimerActive(false); setTimerSeconds(0, 0); };
  }, [running, pausedAt, seconds, duration]);

  const idRef = useRef<number | null>(null);
  const hasStartedRef = useRef<boolean>(false);
  const wasRunningRef = useRef<boolean>(false);

  const recorderStartRef = useRef<() => void>();
  const recorderPauseRef = useRef<() => void>();
  const recorderResumeRef = useRef<() => void>();
  const recorderStopRef = useRef<() => void>();

  const { user } = useAuth();
  const { upload: uploadRecording, refresh: refreshRecordings } = useRecordings("interview");
  const { markPracticed } = useSyncedStreak();

  const questions: Question[] = [...DEFAULT_QUESTIONS, ...(syncedAIQuestions as Question[])];
  const current = questions[active] || questions[0];
  const questionsInTier = questions.filter(q => q.difficulty === tier);

  // Rotate to the next built-in question within the current tier — no AI.
  const cycleQuestion = () => {
    if (questionsInTier.length <= 1) return;
    const curPos = questionsInTier.findIndex(q => questions.indexOf(q) === active);
    const nextPos = (curPos + 1) % questionsInTier.length;
    setActive(questions.indexOf(questionsInTier[nextPos]));
  };

  useEffect(() => {
    if (current) {
      setDuration(current.targetSeconds);
      setSeconds(current.targetSeconds);
      setRunning(false);
      setPausedAt(null);
      setRevealed(false);
      hasStartedRef.current = false;
      wasRunningRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, current?.targetSeconds]);

  useEffect(() => {
    if (!running && !pausedAt) {
      if (idRef.current) window.clearInterval(idRef.current);
      return;
    }
    if (running && !pausedAt) {
      idRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s <= 0) {
            setRunning(false);
            setPausedAt(null);
            hasStartedRef.current = false;
            setCompletedQuestions(prev => new Set([...prev, current.id]));
            if (recordEnabled) refreshRecordings();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (!running && pausedAt) {
      if (idRef.current) window.clearInterval(idRef.current);
    }
    return () => { if (idRef.current) window.clearInterval(idRef.current); };
  }, [running, pausedAt, current, recordEnabled, refreshRecordings]);

  useEffect(() => {
    if (!recordEnabled) {
      recorderStopRef.current?.();
      return;
    }
    if (running && !pausedAt && !wasRunningRef.current) {
      recorderStartRef.current?.();
      wasRunningRef.current = true;
    } else if (running && !pausedAt && wasRunningRef.current) {
      recorderResumeRef.current?.();
    } else if ((!running || pausedAt) && wasRunningRef.current) {
      if (pausedAt) {
        recorderPauseRef.current?.();
      } else {
        setTimeout(() => {
          recorderStopRef.current?.();
          wasRunningRef.current = false;
        }, 50);
      }
    }
  }, [recordEnabled, running, pausedAt]);

  useEffect(() => {
    const isActuallyRecording = recordEnabled && running && !pausedAt;
    setRecordingActive(isActuallyRecording);
    return () => setRecordingActive(false);
  }, [recordEnabled, running, pausedAt]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = duration > 0 ? (seconds / duration) * 100 : 0;

  // Live captions + WPM/filler while answering.
  const live = useLiveSpeechMetrics(running && !pausedAt, duration - seconds);

  const goNext = useCallback(() => setStep(s => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s)), []);
  const goBack = useCallback(() => setStep(s => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s)), []);

  // Pick a difficulty tier → auto-select its first question.
  const selectTier = (t: Difficulty) => {
    setTier(t);
    const idx = questions.findIndex(q => q.difficulty === t);
    if (idx >= 0) setActive(idx);
  };

  const startQuestion = useCallback(() => {
    if (seconds === 0) setSeconds(duration);
    live.reset();
    setPausedAt(null);
    setRunning(true);
    hasStartedRef.current = true;
    setPhase("active");
  }, [seconds, duration, live]);

  const backToSetup = useCallback(() => {
    recorderStopRef.current?.();
    setRunning(false);
    setPausedAt(null);
    wasRunningRef.current = false;
    hasStartedRef.current = false;
    setSeconds(duration);
    setRevealed(false);
    setPhase("setup");
    setStep(1);
  }, [duration]);

  return (
    <TrackShell
      eyebrow="INTERVIEWS"
      title={<>Master the <span className="text-primary italic">High-Stakes</span> Q&A.</>}
      intro="Practice answering real interview questions out loud, using the STAR method, with the clock running."
      hideHeader={phase === "active"}
      compact={phase === "setup"}
    >
      {/* Background Decorative Drifting Glow */}
      <div className="absolute top-[20%] right-[5%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/5 rounded-full blur-[140px] animate-float opacity-30 pointer-events-none" />

      {/* ════════════════ SETUP — stepped wizard ════════════════ */}
      {phase === "setup" && (
        <div className="max-w-2xl mx-auto min-w-0 relative z-10">
          {/* Step indicator */}
          <div className="flex items-center gap-2.5 mb-6 md:mb-10">
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const done = step > n;
              const activeStep = step === n;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => n < step && setStep(n)}
                  disabled={n >= step}
                  className={cn("flex-1 text-left space-y-2 group", n < step && "cursor-pointer")}
                >
                  <div className={cn("h-1.5 rounded-full transition-colors duration-300", activeStep || done ? "bg-primary" : "bg-border/40")} />
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 transition-colors",
                    activeStep ? "text-primary" : done ? "opacity-60 group-hover:opacity-90" : "opacity-40"
                  )}>
                    {done ? <Check className="h-2.5 w-2.5" /> : <span className="tabular-nums">{n}</span>}
                    <span className="truncate">{label}</span>
                  </p>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* ──── STEP 1 — DIFFICULTY ──── */}
            {step === 1 && (
              <motion.div
                key="iv-difficulty"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 md:space-y-7"
              >
                <div className="space-y-2">
                  <h2 className="speak-serif text-3xl md:text-4xl tracking-tighter leading-tight">
                    How much <span className="text-primary italic">pressure?</span>
                  </h2>
                  <p className="text-sm opacity-60 font-medium">Pick a difficulty — we'll line up matching questions.</p>
                </div>

                <div className="space-y-3">
                  {TIERS.map(t => {
                    const selected = tier === t.id;
                    const count = questions.filter(q => q.difficulty === t.id).length;
                    return (
                      <button
                        key={t.id}
                        onClick={() => selectTier(t.id)}
                        className={cn(
                          "w-full text-left flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 transition-all duration-300",
                          selected ? "border-primary/50 bg-primary/[0.05] shadow-glow shadow-primary/5" : "border-border/40 bg-muted/3 hover:border-border/80"
                        )}
                      >
                        <div className="flex gap-1 shrink-0">
                          {[1, 2, 3].map(n => (
                            <div key={n} className={cn(
                              "h-1.5 w-5 rounded-full transition-all",
                              n <= t.dots ? (selected ? "bg-primary" : "bg-foreground/20") : "bg-foreground/6"
                            )} />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-black uppercase tracking-[0.25em]", selected ? "text-primary" : "opacity-60")}>{t.id}</p>
                          <p className="text-[10px] font-medium opacity-30 mt-0.5">{t.desc} · {count} question{count === 1 ? "" : "s"}</p>
                        </div>
                        <div className={cn(
                          "h-5 w-5 shrink-0 rounded-full border-2 transition-all flex items-center justify-center",
                          selected ? "border-primary bg-primary" : "border-border/60"
                        )}>
                          {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ──── STEP 2 — QUESTION ──── */}
            {step === 2 && (
              <motion.div
                key="iv-question"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 md:space-y-7"
              >
                <div className="space-y-2">
                  <h2 className="speak-serif text-3xl md:text-4xl tracking-tighter leading-tight">
                    Choose a <span className="text-primary italic">question.</span>
                  </h2>
                  <p className="text-sm opacity-60 font-medium">{tier} questions — pick one to rehearse.</p>
                </div>

                <div className="space-y-3">
                  {questionsInTier.map((q) => {
                    const idx = questions.indexOf(q);
                    const selected = active === idx;
                    const isCompleted = completedQuestions.has(q.id);
                    return (
                      <button
                        key={q.id}
                        onClick={() => setActive(idx)}
                        className={cn(
                          "w-full text-left flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 transition-all duration-300",
                          selected ? "border-primary/50 bg-primary/[0.05] shadow-glow shadow-primary/5" : "border-border/40 bg-muted/3 hover:border-border/80"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 shrink-0 rounded-full flex items-center justify-center border-2 transition-all",
                          isCompleted ? "bg-primary/10 border-primary text-primary" : selected ? "border-primary/50 text-primary" : "border-border/60 text-foreground/30"
                        )}>
                          {isCompleted ? <Check className="h-5 w-5" /> : <Target className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("speak-serif text-base md:text-lg leading-snug transition-colors", selected ? "text-primary" : "text-foreground")}>
                            "{q.q}"
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {q.targetSeconds}s
                            </span>
                            {q.is_ai && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="h-2 w-2" /> AI
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {questionsInTier.length === 0 && (
                    <p className="text-sm opacity-40 italic text-center py-6">No questions in this tier yet.</p>
                  )}
                </div>

                {/* Cycle to the next question in this tier — no AI, just rotate. */}
                {questionsInTier.length > 1 && (
                  <button
                    onClick={cycleQuestion}
                    className="w-full py-3.5 rounded-2xl border border-dashed border-primary/30 text-primary text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
                  >
                    <Shuffle className="h-4 w-4" />
                    Next question
                  </button>
                )}

                {/* Record toggle */}
                <div className="rounded-[1.75rem] border border-border/40 bg-muted/3 p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "h-8 w-8 shrink-0 rounded-full flex items-center justify-center border transition-all",
                      recordEnabled ? "text-primary border-primary/30 bg-primary/8" : "text-foreground/20 border-border/30"
                    )}>
                      <Mic className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.35em]">RECORD</p>
                      <p className="text-[10px] font-medium opacity-30 truncate">
                        {!user ? "Sign in to save & get AI feedback" : recordEnabled ? "Saving for AI feedback" : "Off"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={recordEnabled} onCheckedChange={setRecordEnabled} disabled={!user} />
                </div>
              </motion.div>
            )}

            {/* ──── STEP 3 — READY ──── */}
            {step === 3 && (
              <motion.div
                key="iv-ready"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 md:space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="speak-serif text-3xl md:text-4xl tracking-tighter leading-tight">
                    Ready.
                  </h2>
                  <p className="text-sm opacity-60 font-medium">Read the question, structure with STAR, then the clock runs.</p>
                </div>

                <div className="rounded-[2rem] border border-primary/20 bg-muted/5 p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                    <Target className="h-3.5 w-3.5" />
                    {current.difficulty} · {current.targetSeconds}s
                  </div>
                  <h3 className="speak-serif text-2xl md:text-3xl leading-tight">"{current.q}"</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {STAR.map(s => (
                      <div key={s.letter} className="p-4 rounded-2xl bg-muted/5 border border-border/60 space-y-1">
                        <p className="text-lg font-black text-primary italic">{s.letter}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{s.word}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recap chips */}
                <div className="flex items-center justify-center gap-2 flex-wrap text-[10px] font-black uppercase tracking-widest">
                  <span className="px-3 py-1.5 rounded-full border border-border/50 bg-muted/5">{current.difficulty}</span>
                  <span className="px-3 py-1.5 rounded-full border border-border/50 bg-muted/5">{current.targetSeconds}s</span>
                  <span className="px-3 py-1.5 rounded-full border border-border/50 bg-muted/5 opacity-60">{recordEnabled ? "Recording" : "No recording"}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer nav */}
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
                onClick={startQuestion}
                whileTap={{ scale: 0.98 }}
                className="relative flex-1 h-14 rounded-[1.5rem] bg-primary text-white overflow-hidden group"
                style={{ boxShadow: "0 0 40px rgba(var(--primary-rgb, 139,92,246), 0.35)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative flex items-center justify-center gap-3">
                  <Play className="h-4 w-4 fill-current" />
                  <span className="text-sm font-black uppercase tracking-[0.3em]">Start</span>
                </div>
              </motion.button>
            )}
          </div>

          {/* Past recordings */}
          <div className="mt-12 md:mt-16">
            <RecordingsList />
          </div>
        </div>
      )}

      {/* ════════════════ ACTIVE — focused question + timer ════════════════ */}
      {phase === "active" && (
        <div className="max-w-2xl mx-auto min-w-0 relative z-10 space-y-6 md:space-y-8">
          <button
            onClick={backToSetup}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border/60 bg-muted/10 text-xs font-black uppercase tracking-[0.2em] text-foreground/70 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to setup
          </button>

          {/* Question */}
          <div className="p-6 md:p-10 rounded-[2rem] bg-muted/10 border border-primary/20 space-y-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">{current.difficulty} QUESTION</p>
            <h2 className="speak-serif text-2xl md:text-4xl leading-tight">"{current.q}"</h2>
          </div>

          {/* Timer */}
          <div className="bg-muted/5 border border-border/60 rounded-[2.5rem] p-6 md:p-10 space-y-8 relative overflow-hidden shadow-soft">
            <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full">
              <motion.div className="h-full bg-primary shadow-glow" initial={{ width: "100%" }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
            </div>

            <div className="text-center space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">TIME LEFT</p>
              <div className="speak-serif text-6xl md:text-8xl font-bold tracking-tighter italic tabular-nums">
                {mins}<span className="animate-pulse">:</span>{String(secs).padStart(2, "0")}
              </div>
              {recordEnabled && (
                <div className="flex items-center justify-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", running && !pausedAt ? "bg-red-500 animate-ping" : "bg-muted-foreground/40")} />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{running && !pausedAt ? "Recording" : "Paused"}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {!running ? (
                <button
                  onClick={() => { if (seconds === 0) setSeconds(duration); setRunning(true); if (pausedAt) setPausedAt(null); hasStartedRef.current = true; }}
                  className="button-pill w-full py-5 bg-primary text-white flex items-center justify-center gap-3 shadow-glow"
                >
                  <Play className="h-5 w-5 fill-current" />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">{hasStartedRef.current ? "Resume" : "Start"}</span>
                </button>
              ) : (
                <button
                  onClick={() => { setRunning(false); setPausedAt(Date.now()); }}
                  className="button-pill w-full py-5 border border-primary/30 text-primary flex items-center justify-center gap-3 hover:bg-primary/5 transition-all"
                >
                  <Pause className="h-5 w-5 fill-current" />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">Pause</span>
                </button>
              )}
              <button
                onClick={() => { recorderStopRef.current?.(); live.reset(); setSeconds(duration); setRunning(false); setPausedAt(null); wasRunningRef.current = false; hasStartedRef.current = false; }}
                className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-opacity"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Live HUD — captions + WPM + fillers */}
          <LiveSpeechHUD metrics={live} active={running && !pausedAt} />

          {/* Reveal guidance */}
          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.div
                key="guidance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[2rem] bg-muted/5 border border-border/60 p-6 md:p-8 space-y-5"
              >
                <p className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Zap className="h-3 w-3" /> STAR method
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {STAR.map(s => (
                    <div key={s.letter} className="p-4 rounded-2xl bg-muted/5 border border-border/60 space-y-1">
                      <p className="text-lg font-black text-primary italic">{s.letter}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{s.word}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <p className="text-sm font-medium opacity-60 leading-relaxed italic">"{current.guidance}"</p>
                  <ul className="space-y-1.5">
                    {current.keyPoints.map((p, i) => (
                      <li key={i} className="flex gap-3 text-xs font-bold uppercase tracking-widest opacity-40">
                        <span className="text-primary">✱</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setRevealed(true)}
                className="w-full py-6 border-2 border-dashed border-border/60 rounded-[2rem] text-xs font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-4"
              >
                <Microscope className="h-4 w-4" />
                Show me how to answer
              </button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Recorder — mounted whenever recording is enabled, across both phases */}
      {recordEnabled && (
        <div className="opacity-0 pointer-events-none absolute">
          <RecorderPanel
            externalRunning={running}
            recorderStartRef={(fn) => { recorderStartRef.current = fn; }}
            recorderPauseRef={(fn) => { recorderPauseRef.current = fn; }}
            recorderResumeRef={(fn) => { recorderResumeRef.current = fn; }}
            recorderStopRef={(fn) => { recorderStopRef.current = fn; }}
            onRecorded={async ({ blob, durationMs }) => {
              markPracticed();
              if (user) {
                const result = await uploadRecording(blob, {
                  promptText: `Interview: ${current.q}`,
                  difficulty: current.difficulty,
                  durationMs,
                  targetSeconds: duration,
                });
                if (result?.id) setAutoFeedbackId(result.id);
              }
            }}
          />
        </div>
      )}

      {autoFeedbackId && (
        <RecordingFeedbackModal
          recordingId={autoFeedbackId}
          defaultOpen={true}
          onClose={() => setAutoFeedbackId(null)}
        />
      )}
    </TrackShell>
  );
};

export default Interviews;
