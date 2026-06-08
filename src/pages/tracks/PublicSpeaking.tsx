import { useEffect, useRef, useState, useCallback } from "react";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { RecordingsList } from "@/components/RecordingsList";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  Play,
  Pause,
  RotateCcw,
  Mic,
  Trophy,
  Clock,
  Zap,
  Shuffle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { RecordingFeedbackModal } from "@/components/RecordingFeedback";
import { LiveSpeechHUD } from "@/components/LiveSpeechHUD";
import { useLiveSpeechMetrics } from "@/hooks/useLiveSpeechMetrics";
import { setTimerActive, setTimerSeconds } from "@/lib/timerState";
import { setRecordingActive } from "@/lib/recordingState";
import { motion, AnimatePresence } from "framer-motion";

type Context = "small" | "large" | "stage" | "virtual";

const CONTEXTS: { id: Context; label: string; desc: string }[] = [
  { id: "small", label: "SMALL GROUP", desc: "Meeting or team" },
  { id: "large", label: "BOARDROOM", desc: "Conference room" },
  { id: "stage", label: "BIG STAGE", desc: "Large audience" },
  { id: "virtual", label: "VIRTUAL", desc: "Video call / screen" },
];

interface Drill {
  id: string;
  title: string;
  duration: number;
  objective: string;
  instructions: string[];
  prompt: string;
  selfReviewQuestions: string[];
  contexts: Record<Context, string>;
  isAI?: boolean;
}

const DEFAULT_DRILLS: Drill[] = [
  {
    id: "hook",
    title: "The 10-Second Hook",
    duration: 30,
    objective: "Capture attention in the first 10 seconds with a sharp question, vivid image, or surprising number.",
    instructions: [
      "Think of a topic you know well (your job, a hobby, a belief)",
      "Write three different opening lines: a question, an image, a stat",
      "Deliver each one with conviction - pause after each",
      "Record yourself and identify which one lands strongest",
    ],
    prompt: "Deliver a 10-second opening hook for a talk about [your topic]. Try: a question, an image, OR a surprising stat.",
    selfReviewQuestions: [
      "Did the first line earn attention?",
      "Was there a pause after the hook?",
      "Did my voice convey confidence?",
    ],
    contexts: {
      small: "Open with a direct question to the room. Make eye contact with one person as you start - it pulls the whole room in.",
      large: "Start with a number or image that travels. Your opening needs to carry to the back row.",
      stage: "Big opener - a stat, a bold claim, a pause before you say anything. Let them wonder.",
      virtual: "Smile before you start. Then go straight into the hook. You have 5 seconds before they check email.",
    },
  },
  {
    id: "psp",
    title: "Point - Story - Point",
    duration: 90,
    objective: "Master the cleanest structure on earth. State your point, tell one specific story that proves it, restate the point with new force.",
    instructions: [
      "Pick a belief you hold strongly",
      "State your point in one sentence",
      "Tell ONE specific story (30-45 seconds) that proves it",
      "Restate the point - sharper now that we've heard the story",
    ],
    prompt: "Use Point-Story-Point to argue for a belief you hold. Example: 'Small habits beat big plans.'",
    selfReviewQuestions: [
      "Was the point clear before the story?",
      "Was the story specific (not generic)?",
      "Did the restated point feel stronger?",
    ],
    contexts: {
      small: "One person can challenge you mid-story. Be ready to defend your point.",
      large: "The story carries everything. Make it vivid - they can't ask questions, so the story must do the work.",
      stage: "Your story needs a callback to the opening. The audience should feel the loop close.",
      virtual: "Keep the story shorter (20 seconds). They can't see your body, so your voice must carry it.",
    },
  },
  {
    id: "pause",
    title: "The Power Pause",
    duration: 60,
    objective: "Learn to use silence as a tool. A pause after your headline tells the room: this matters.",
    instructions: [
      "Prepare a 60-second story with a key headline in the middle",
      "Deliver the story normally until you reach the headline",
      "After the headline, pause for a full 2 seconds (count in your head)",
      "Then deliver the next line with authority",
    ],
    prompt: "Tell a short story. Insert a 2-second pause after the most important line. Feel the weight.",
    selfReviewQuestions: [
      "Did I hold the pause long enough?",
      "Did the pause feel intentional, not nervous?",
      "Did the line after land with more weight?",
    ],
    contexts: {
      small: "0.5 seconds feels like a beat. 1 second reads as intention. 2 seconds feels like you forgot your line.",
      large: "1.5-2 seconds is right. Let it land, then deliver the next line with authority.",
      stage: "2-3 seconds on the key headline. The silence should feel uncomfortable - that's when you own it.",
      virtual: "Pauses over 1 second risk losing people. Keep them tight. If you pause, move your eyes to camera.",
    },
  },
  {
    id: "pace",
    title: "Pace and Pitch Variation",
    duration: 60,
    objective: "Monotone kills meaning. Vary your speed: slow on the heavy lines, faster on the build. End lower than you start.",
    instructions: [
      "Take any paragraph or story you know",
      "Mark 3 sections: build (faster), headline (slow), close (slow + low pitch)",
      "Deliver it once flat (monotone) - record it",
      "Deliver it again with deliberate variation - record it",
      "Compare the two recordings",
    ],
    prompt: "Deliver a 60-second story. Vary your pace: fast on the build, slow on the headline, low pitch on the close.",
    selfReviewQuestions: [
      "Did my speed actually vary?",
      "Did I slow down on key moments?",
      "Did my pitch drop on the close?",
    ],
    contexts: {
      small: "You can be quieter. Your energy carries in a small room - watch their faces for feedback.",
      large: "Project slower. The back row needs clear enunciation. Drop your pitch on the close.",
      stage: "Every word needs to land in the last row. Speak from the diaphragm, not the throat.",
      virtual: "Slightly faster pacing. Close to the camera. Lift your energy - it flattens on screen.",
    },
  },
  {
    id: "close",
    title: "The Quotable Close",
    duration: 45,
    objective: "A talk lives or dies on its last line. Make it short, vivid, and quotable.",
    instructions: [
      "Think of a talk topic or message you want to deliver",
      "Write three possible closing lines (under 15 words each)",
      "Say each one out loud with conviction",
      "Keep the one your body wants to say - the one that feels true",
    ],
    prompt: "Deliver three different closing lines for a talk. Make them short, vivid, and quotable. Example: 'Don't practice until you get it right. Practice until you can't get it wrong.'",
    selfReviewQuestions: [
      "Was the close under 15 words?",
      "Did it feel quotable / memorable?",
      "Did I hold the last line for a beat?",
    ],
    contexts: {
      small: "End with a question or call to action. In small groups, you can invite response.",
      large: "The close is your only job - make it memorable. No 'any questions' - give them a line to take with them.",
      stage: "Hold the last line for 3 seconds. Let the room sit in it. Then walk off - don't thank them.",
      virtual: "End with a clear next step. 'Let's talk after' doesn't land online - give them a specific action.",
    },
  },
  {
    id: "energy",
    title: "Energy Levels",
    duration: 60,
    objective: "Learn to adjust your energy level to match your context and audience size.",
    instructions: [
      "Pick a 30-second story or pitch",
      "Deliver it at energy level 3/10 (quiet, intimate)",
      "Deliver it at energy level 7/10 (confident, projecting)",
      "Deliver it at energy level 10/10 (commanding a large room)",
      "Record all three and notice what changes",
    ],
    prompt: "Deliver the same 30-second message at three energy levels: intimate (3/10), confident (7/10), commanding (10/10).",
    selfReviewQuestions: [
      "Did my energy actually change?",
      "Which level felt most natural?",
      "Which level matches my target context?",
    ],
    contexts: {
      small: "Energy 3-5. Conversational. Lean in. Make eye contact with individuals.",
      large: "Energy 6-7. Project without shouting. Gesture bigger. Own the front of the room.",
      stage: "Energy 8-10. Full commitment. Move with intention. Your energy must reach the back row.",
      virtual: "Energy 5-6. Slightly elevated but contained. Close to camera. Eyes on lens.",
    },
  },
];

const STEP_LABELS = ["Drill", "Setup", "Ready"] as const;

const PublicSpeaking = () => {
  const drills = DEFAULT_DRILLS;
  const [activeDrill, setActiveDrill] = useState(0);
  const [context, setContext] = useState<Context>("large");
  const [completedDrills, setCompletedDrills] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("speakbold:speaking-completed");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [recordEnabled, setRecordEnabled] = useState(false);
  const [autoFeedbackId, setAutoFeedbackId] = useState<string | null>(null);

  // Incremental setup → active practice. Same engine as before; we just gate the
  // config behind steps so the user isn't hit with drills + context + record +
  // timer all at once.
  const [phase, setPhase] = useState<"setup" | "active">("setup");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Timer state
  const [duration, setDuration] = useState(DEFAULT_DRILLS[0].duration);
  const [seconds, setSeconds] = useState(DEFAULT_DRILLS[0].duration);
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

  // Recorder refs
  const recorderStartRef = useRef<() => void>();
  const recorderPauseRef = useRef<() => void>();
  const recorderResumeRef = useRef<() => void>();
  const recorderStopRef = useRef<() => void>();

  const { user } = useAuth();
  const { upload: uploadRecording, refresh: refreshRecordings } = useRecordings("impromptu");
  const { markPracticed } = useSyncedStreak();

  const current = drills[activeDrill >= 0 ? activeDrill : 0];

  // Rotate to the next built-in drill — no AI, just cycle the curated set.
  const cycleDrill = useCallback(() => {
    setActiveDrill((i) => (i + 1) % drills.length);
  }, [drills.length]);

  // Save completed drills
  useEffect(() => {
    localStorage.setItem("speakbold:speaking-completed", JSON.stringify([...completedDrills]));
  }, [completedDrills]);

  // Update duration when drill changes
  useEffect(() => {
    setDuration(current.duration);
    setSeconds(current.duration);
    setRunning(false);
    setPausedAt(null);
    hasStartedRef.current = false;
    wasRunningRef.current = false;
  }, [activeDrill, current.duration]);

  // Timer logic
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
            setCompletedDrills(prev => new Set([...prev, current.id]));
            if (recordEnabled) refreshRecordings();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (!running && pausedAt) {
      if (idRef.current) window.clearInterval(idRef.current);
    }

    return () => {
      if (idRef.current) window.clearInterval(idRef.current);
    };
  }, [running, pausedAt, current.id, recordEnabled, refreshRecordings]);

  // Recording control
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

  // Notify global recording state for microphone border
  useEffect(() => {
    const isActuallyRecording = recordEnabled && running && !pausedAt;
    setRecordingActive(isActuallyRecording);
    return () => setRecordingActive(false);
  }, [recordEnabled, running, pausedAt]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = duration > 0 ? (seconds / duration) * 100 : 0;
  const completedCount = completedDrills.size;

  // Live captions + WPM/filler while the drill runs.
  const live = useLiveSpeechMetrics(running && !pausedAt, duration - seconds);

  const goNext = useCallback(() => setStep(s => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s)), []);
  const goBack = useCallback(() => setStep(s => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s)), []);

  // Launch: setup → active, and start the clock.
  const startDrill = useCallback(() => {
    if (seconds === 0) setSeconds(duration);
    live.reset();
    setPausedAt(null);
    setRunning(true);
    hasStartedRef.current = true;
    setPhase("active");
  }, [seconds, duration, live]);

  // Return to setup, stopping any in-flight timer/recording.
  const backToSetup = useCallback(() => {
    recorderStopRef.current?.();
    setRunning(false);
    setPausedAt(null);
    wasRunningRef.current = false;
    hasStartedRef.current = false;
    setSeconds(duration);
    setPhase("setup");
    setStep(1);
  }, [duration]);

  return (
    <TrackShell
      eyebrow="PUBLIC SPEAKING"
      title={
        <>
          Train the skills that make talks <span className="text-primary italic">land.</span>
        </>
      }
      intro="Short, focused drills on hooks, structure, pauses, and pace. Each one is timed — record yourself, review, and improve."
      hideHeader={phase === "active"}
      compact={phase === "setup"}
    >
      {/* Background Decorative Drifting Glow */}
      <div className="absolute top-[20%] right-[10%] w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-primary/5 rounded-full blur-[120px] animate-float opacity-30 pointer-events-none" />

      {/* ════════════════ SETUP — stepped wizard ════════════════ */}
      {phase === "setup" && (
        <div className="max-w-2xl mx-auto min-w-0 relative z-10">
          {/* Step indicator */}
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
                  <div className={cn("h-1.5 rounded-full transition-colors duration-300", active || done ? "bg-primary" : "bg-border/40")} />
                  <p className={cn(
                    "text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-1.5 transition-colors",
                    active ? "text-primary" : done ? "opacity-50 group-hover:opacity-90" : "opacity-25"
                  )}>
                    {done ? <Check className="h-2.5 w-2.5" /> : <span className="tabular-nums">{n}</span>}
                    <span className="truncate">{label}</span>
                  </p>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* ──── STEP 1 — DRILL ──── */}
            {step === 1 && (
              <motion.div
                key="ps-drill"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 md:space-y-7"
              >
                <div className="space-y-2">
                  <h2 className="speak-serif text-3xl md:text-4xl tracking-tighter leading-tight">
                    Pick a <span className="text-primary italic">drill.</span>
                  </h2>
                  <p className="text-sm opacity-40 font-medium">
                    {completedCount} of {drills.length} mastered — choose a skill to sharpen.
                  </p>
                </div>

                <div className="space-y-3">
                  {drills.map((drill, i) => {
                    const selected = activeDrill === i;
                    const isCompleted = completedDrills.has(drill.id);
                    return (
                      <button
                        key={drill.id}
                        onClick={() => setActiveDrill(i)}
                        className={cn(
                          "w-full text-left flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 transition-all duration-300",
                          selected ? "border-primary/50 bg-primary/[0.05] shadow-glow shadow-primary/5" : "border-border/40 bg-muted/3 hover:border-border/80"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-sans-bold text-sm border-2 italic transition-all",
                          isCompleted ? "bg-primary/10 border-primary text-primary" : selected ? "border-primary/50 text-primary" : "bg-muted border-border/60 text-foreground/40"
                        )}>
                          {isCompleted ? <Check className="h-5 w-5" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("speak-serif text-lg md:text-xl truncate transition-colors", selected ? "text-primary" : "text-foreground")}>
                            {drill.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {drill.duration}s
                            </span>
                          </div>
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

                {/* Cycle to a different prompt — no AI, just rotate the curated drills. */}
                <button
                  onClick={cycleDrill}
                  className="w-full py-3.5 rounded-2xl border border-dashed border-primary/30 text-primary text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
                >
                  <Shuffle className="h-4 w-4" />
                  Next prompt
                </button>
              </motion.div>
            )}

            {/* ──── STEP 2 — SETUP ──── */}
            {step === 2 && (
              <motion.div
                key="ps-setup"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 md:space-y-7"
              >
                <div className="space-y-2">
                  <h2 className="speak-serif text-3xl md:text-4xl tracking-tighter leading-tight">
                    Set the <span className="text-primary italic">scene.</span>
                  </h2>
                  <p className="text-sm opacity-40 font-medium">Where you're speaking — and whether to record for AI feedback.</p>
                </div>

                {/* Context */}
                <div className="rounded-[1.75rem] border border-border/40 bg-muted/3 p-5 space-y-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">CONTEXT</p>
                  <div className="grid grid-cols-2 gap-3">
                    {CONTEXTS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setContext(c.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 text-left transition-all",
                          context === c.id ? "border-primary/50 bg-primary/[0.05]" : "border-border/40 hover:border-border/80"
                        )}
                      >
                        <p className={cn("text-xs font-black uppercase tracking-[0.2em]", context === c.id ? "text-primary" : "opacity-50")}>{c.label}</p>
                        <p className="text-[10px] font-medium opacity-30 mt-0.5">{c.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

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
                key="ps-ready"
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
                  <p className="text-sm opacity-40 font-medium">Your drill, your prompt — then the clock runs.</p>
                </div>

                <div className="rounded-[2rem] border border-primary/20 bg-muted/5 p-6 md:p-8 space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">{current.duration}S DRILL</p>
                    <h3 className="speak-serif text-2xl md:text-3xl">{current.title}</h3>
                  </div>
                  <p className="text-sm font-medium opacity-60 leading-relaxed italic border-l border-primary/30 pl-5">
                    "{current.objective}"
                  </p>
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">YOUR PROMPT</p>
                    <p className="speak-serif text-lg md:text-xl italic leading-relaxed">"{current.prompt}"</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary" />
                      {CONTEXTS.find(c => c.id === context)?.label} GUIDANCE
                    </p>
                    <p className="text-sm font-medium opacity-60 leading-relaxed">{current.contexts[context]}</p>
                  </div>
                </div>

                {/* Recap chips */}
                <div className="flex items-center justify-center gap-2 flex-wrap text-[10px] font-black uppercase tracking-widest">
                  <span className="px-3 py-1.5 rounded-full border border-border/50 bg-muted/5">{current.duration}s</span>
                  <span className="px-3 py-1.5 rounded-full border border-border/50 bg-muted/5">{CONTEXTS.find(c => c.id === context)?.label}</span>
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
                onClick={startDrill}
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

          {/* Past recordings — supplementary, below the wizard */}
          <div className="mt-12 md:mt-16">
            <RecordingsList />
          </div>
        </div>
      )}

      {/* ════════════════ ACTIVE — focused drill + timer ════════════════ */}
      {phase === "active" && (
        <div className="max-w-2xl mx-auto min-w-0 relative z-10 space-y-6 md:space-y-8">
          <button
            onClick={backToSetup}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border/60 bg-muted/10 text-xs font-black uppercase tracking-[0.2em] text-foreground/70 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to setup
          </button>

          {/* Prompt */}
          <div className="p-6 md:p-10 rounded-[2rem] bg-primary/5 border border-primary/20 space-y-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">{current.title}</p>
            <p className="speak-serif text-xl md:text-3xl italic leading-relaxed">"{current.prompt}"</p>
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

          {/* Context guidance */}
          <div className="p-6 rounded-2xl bg-muted/5 border border-border/60 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
              <Zap className="h-3 w-3 text-primary" />
              {CONTEXTS.find(c => c.id === context)?.label} GUIDANCE
            </p>
            <p className="text-sm font-medium opacity-60 leading-relaxed">{current.contexts[context]}</p>
          </div>

          {/* Completion badge */}
          <AnimatePresence>
            {seconds === 0 && !autoFeedbackId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 rounded-[2.5rem] bg-primary/10 border border-primary/30 flex flex-col items-center text-center gap-4"
              >
                <Trophy className="h-8 w-8 text-primary animate-bounce" />
                <p className="text-xs font-black uppercase tracking-widest opacity-60">
                  {recordEnabled ? "Uploading your recording…" : "Drill complete — enable recording for AI feedback"}
                </p>
                <button onClick={backToSetup} className="text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:opacity-70 transition-opacity">
                  Practice another →
                </button>
              </motion.div>
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
                  promptText: `Speaking Drill: ${current.title}`,
                  difficulty: "Medium",
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

export default PublicSpeaking;
