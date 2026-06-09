import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Compass, Mic, MicOff, Sparkles, Play, ChevronRight, ArrowRight, ScanFace, MessageSquare, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecorderPanel } from "@/components/RecorderPanel";
import { transcribeAudio, judgePathwayDrill } from "@/services/geminiService";
import { TIERS, type TierId } from "@/hooks/usePathway";
import { toast } from "@/hooks/use-toast";
import { setTimerActive } from "@/lib/timerState";

// A warm, personal first prompt. The new user just picked a goal, so they
// already have something to say — easy to talk about for 60s (no "perform under
// pressure" freeze) while still giving the AI enough natural speech to band a
// tier. This doubles as the gentle "first drill" before the curriculum.
const PLACEMENT_PROMPT = "What brings you to SpeakBold — and what do you most want to get better at?";
const PLACEMENT_SECONDS = 60;

// Surfaced on the post-result reveal — the "here's what else you can do" beat,
// fired at peak curiosity right after the AI-feedback aha. Body Language leads:
// it's the strongest feature and the most under-discovered.
const REVEAL_FEATURES = [
  {
    icon: ScanFace,
    name: "Body Language Studio",
    blurb: "Turn on your camera and get read like a coach is in the room — posture, gestures, eye contact, and presence, all scored live.",
  },
  {
    icon: MessageSquare,
    name: "Your AI coach, on tap",
    blurb: "Not sure what to say or how to fix a habit? Ask your coach anything, anytime — it remembers how you've been doing.",
  },
  {
    icon: Swords,
    name: "The Arena",
    blurb: "When you're ready, go head-to-head in live speaking battles and climb the leaderboard.",
  },
];

/** Band a 0–100 speaking score into an entry tier. */
const tierForScore = (score: number): TierId =>
  score >= 72 ? "orator" : score >= 55 ? "intermediate" : "beginner";

type Phase = "offer" | "recording" | "analyzing" | "result" | "reveal";

export const PlacementTest = ({ userName, onPlace, onSkip, autoStart = false }: {
  userName: string;
  onPlace: (tier: TierId) => void;
  onSkip: () => void;
  // When the caller (the Pathway placement gate) has ALREADY made the "take the
  // test" pitch, skip the redundant in-modal offer screen and drop the user
  // straight into recording — no second tap to actually begin.
  autoStart?: boolean;
}) => {
  const [phase, setPhase] = useState<Phase>("offer");
  const [seconds, setSeconds] = useState(PLACEMENT_SECONDS);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ tier: TierId; feedback: string } | null>(null);
  // Tier the user committed to on the result screen — carried into the reveal so
  // its CTA can drop them at the right place.
  const [chosenTier, setChosenTier] = useState<TierId | null>(null);
  const [micError, setMicError] = useState(false);
  const [micChecked, setMicChecked] = useState(false);

  const idRef = useRef<number | null>(null);
  const recorderStartRef = useRef<() => void>(() => {});
  const recorderStopRef = useRef<() => void>(() => {});
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(s => { setMicError(false); s.getTracks().forEach(t => t.stop()); })
      .catch(() => setMicError(true))
      .finally(() => setMicChecked(true));
  }, []);

  // Auto-start once the mic check resolves, so the countdown never runs behind a
  // permission dialog. If the mic was denied, handleStart() toasts and leaves us
  // on the offer screen as a graceful fallback (with its skip option).
  useEffect(() => {
    if (autoStart && micChecked && !autoStartedRef.current && phaseRef.current === "offer") {
      autoStartedRef.current = true;
      handleStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, micChecked]);

  // Hide the mobile nav + arm the unload guard while recording the placement.
  useEffect(() => {
    setTimerActive(running);
    return () => setTimerActive(false);
  }, [running]);

  useEffect(() => {
    if (!running) { if (idRef.current) clearInterval(idRef.current); return; }
    idRef.current = window.setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(idRef.current!);
          setRunning(false);
          recorderStopRef.current?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (idRef.current) clearInterval(idRef.current); };
  }, [running]);

  const handleStart = () => {
    if (micError) {
      toast({ title: "Microphone required", description: "Enable your mic to take the placement test.", variant: "destructive" });
      return;
    }
    setSeconds(PLACEMENT_SECONDS);
    setPhase("recording");
    setRunning(true);
    recorderStartRef.current?.();
  };

  const handleStop = () => {
    setRunning(false);
    recorderStopRef.current?.();
    // Safety net: if the recorder never delivers a blob (denied mic, empty
    // capture, hardware glitch) analyze() is never called and the screen would
    // hang on "recording" forever. Fall back to a beginner placement so the
    // user always moves forward.
    setTimeout(() => {
      if (phaseRef.current === "recording") {
        fallback("We couldn't capture your audio — we'll start you from the beginning. You can jump ahead anytime.");
      }
    }, 1500);
  };

  const fallback = (feedback: string) => {
    setResult({ tier: "beginner", feedback });
    setPhase("result");
  };

  // Result → reveal: remember the tier they committed to, then show the
  // "here's what else you can do" beat before handing off to the pathway.
  const goReveal = (tier: TierId) => {
    setChosenTier(tier);
    setPhase("reveal");
  };

  const analyze = async (blob: Blob) => {
    setPhase("analyzing");
    if (blob.size < 100) {
      fallback("We couldn't capture any audio — we'll start you from the beginning. You can jump ahead anytime.");
      return;
    }
    const timeout = setTimeout(() => {
      if (phaseRef.current === "analyzing") fallback("We couldn't get a clear read on that one — we'll start you from the beginning. You can jump ahead anytime.");
    }, 25000);
    try {
      const transcript = await transcribeAudio(blob);
      if (!transcript || transcript.trim().length < 5) {
        clearTimeout(timeout);
        fallback("We couldn't hear you clearly — we'll start you from the beginning. You can jump ahead anytime.");
        return;
      }
      const judged = await judgePathwayDrill(
        userName, transcript,
        "Placement Assessment",
        "Speak naturally and clearly about your goals and what you want to improve.",
        // Neutral grading for placement — tier banding below depends on it, so
        // it must NOT use the lenient Beginner calibration.
        PLACEMENT_PROMPT, 60, "intermediate"
      );
      clearTimeout(timeout);
      setResult({ tier: tierForScore(judged.score), feedback: judged.feedback });
      setPhase("result");
    } catch {
      clearTimeout(timeout);
      fallback("We couldn't analyze that recording — we'll start you from the beginning. You can jump ahead anytime.");
    }
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = (seconds / PLACEMENT_SECONDS) * 100;
  const tierMeta = result ? TIERS.find(t => t.id === result.tier) ?? null : null;
  const chosenTierMeta = chosenTier ? TIERS.find(t => t.id === chosenTier) ?? null : null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-2xl overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col"
    >
      <div className="px-4 md:container max-w-2xl mx-auto py-16 md:py-28 relative z-10 flex-1 flex flex-col justify-center">

        {/* PHASE: OFFER */}
        {phase === "offer" && !autoStart && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8">
            <div className="inline-flex h-16 w-16 md:h-20 md:w-20 rounded-[1.5rem] md:rounded-[2rem] bg-primary/10 border border-primary/20 text-primary items-center justify-center mx-auto">
              <Compass className="h-8 w-8 md:h-10 md:w-10" />
            </div>
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-[0.5em] text-primary">Find your level</p>
              <h1 className="speak-serif text-4xl md:text-6xl tracking-tighter leading-[0.95]">
                Where should we <span className="text-primary italic">start you?</span>
              </h1>
              <p className="text-base md:text-lg opacity-60 max-w-lg mx-auto leading-relaxed">
                Take a quick 60-second speaking test and we'll drop you at the right tier — Beginner, Intermediate, or Orator. Or just start from the beginning.
              </p>
            </div>
            <div className="flex flex-col gap-3 max-w-sm mx-auto pt-2">
              <button
                onClick={handleStart}
                className="button-pill w-full py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-100 transition-transform"
              >
                <Play className="h-4 w-4 fill-current" />
                <span className="text-sm font-black uppercase tracking-[0.2em]">Take the 60s placement</span>
              </button>
              <button
                onClick={onSkip}
                className="text-xs font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity py-3"
              >
                Skip — start from the beginning
              </button>
            </div>
          </motion.div>
        )}

        {/* PHASE: RECORDING */}
        {phase === "recording" && (
          <div className="space-y-5 md:space-y-6">
            <div className="flex items-center justify-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 py-1.5 px-3 rounded-full border text-xs font-semibold",
                micError
                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                  : "bg-green-500/10 border-green-500/20 text-green-500"
              )}>
                {micError ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3 animate-pulse" />}
                {micError ? "Mic error" : "Mic on"}
              </div>
            </div>

            {/* Prompt card */}
            <div className="glass-card border border-primary/20 rounded-[2.5rem] p-6 lg:p-10 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-3 lg:mb-5">Your prompt</p>
              <p className="speak-serif text-xl lg:text-3xl italic tracking-tight leading-tight">"{PLACEMENT_PROMPT}"</p>
            </div>

            {/* Timer card */}
            <div className="glass-card border border-border/60 rounded-[2.5rem] p-6 lg:p-8 space-y-5">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full shadow-glow"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="text-center">
                <div className="speak-serif text-6xl lg:text-8xl font-bold italic tabular-nums">
                  {mins}:{String(secs).padStart(2, "0")}
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full bg-destructive animate-ping" />
                  <span className="text-xs font-semibold text-destructive">Recording</span>
                </div>
              </div>
              <button
                onClick={handleStop}
                className="button-pill w-full py-4 lg:py-5 border border-primary/30 text-primary flex items-center justify-center gap-3"
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">Finish &amp; analyze</span>
              </button>
            </div>
          </div>
        )}

        {/* PHASE: ANALYZING */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-20 space-y-8">
            <div className="h-24 w-24 rounded-[2rem] glass-card border border-primary/20 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="h-10 w-10 border-t-2 border-primary rounded-full"
              />
            </div>
            <div className="text-center space-y-3">
              <p className="speak-serif text-3xl italic">Finding your level...</p>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-primary/60 animate-pulse">Sizing up your speaking</p>
            </div>
          </div>
        )}

        {/* PHASE: RESULT */}
        {phase === "result" && result && tierMeta && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8">
            <div className="inline-flex h-16 w-16 md:h-20 md:w-20 rounded-[1.5rem] md:rounded-[2rem] bg-primary/10 border border-primary/20 text-primary items-center justify-center mx-auto">
              <Compass className="h-8 w-8 md:h-10 md:w-10" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.5em] text-primary">Your starting tier</p>
              <h1 className="speak-serif text-5xl md:text-7xl tracking-tighter leading-[0.9] italic">
                {tierMeta.name}.
              </h1>
            </div>
            <div className="glass-card border border-border/60 rounded-[2rem] p-6 md:p-8 text-left space-y-3">
              <p className="text-sm leading-relaxed opacity-70">{result.feedback}</p>
              <p className="text-xs opacity-40 italic">{tierMeta.tagline} {tierMeta.description}</p>
            </div>
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <button
                onClick={() => goReveal(result.tier)}
                className="button-pill w-full py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-100 transition-transform"
              >
                <span className="text-sm font-black uppercase tracking-[0.2em]">Start at {tierMeta.name}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              {result.tier !== "beginner" && (
                <button
                  onClick={() => goReveal("beginner")}
                  className="text-xs font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity py-3 flex items-center justify-center gap-2"
                >
                  Start from the beginning instead
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* PHASE: REVEAL — "here's what else you can do", at peak curiosity */}
        {phase === "reveal" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 py-6">
            <div className="text-center space-y-4">
              <div className="inline-flex h-14 w-14 rounded-[1.2rem] bg-primary/10 border border-primary/20 text-primary items-center justify-center mx-auto">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.5em] text-primary">You're all set</p>
              <h1 className="speak-serif text-4xl md:text-6xl tracking-tighter leading-[0.95]">
                That feedback? It's <span className="text-primary italic">everywhere.</span>
              </h1>
              <p className="text-base md:text-lg opacity-60 max-w-lg mx-auto leading-relaxed">
                You just felt the AI read your speaking in seconds. Here's what else is waiting inside SpeakBold.
              </p>
            </div>

            <div className="space-y-3 max-w-lg mx-auto">
              {REVEAL_FEATURES.map((f, i) => (
                <motion.div
                  key={f.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.12 }}
                  className="glass-card border border-border/60 rounded-[2rem] p-5 flex items-start gap-4"
                >
                  <div className="h-12 w-12 rounded-[1.2rem] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="speak-serif text-lg md:text-xl italic tracking-tight">{f.name}</h3>
                    <p className="text-sm opacity-55 leading-relaxed">{f.blurb}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="max-w-sm mx-auto pt-2">
              <button
                onClick={() => chosenTier && onPlace(chosenTier)}
                className="button-pill w-full py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-100 transition-transform"
              >
                <span className="text-sm font-black uppercase tracking-[0.2em]">
                  {chosenTierMeta ? `Enter your pathway — ${chosenTierMeta.name}` : "Enter your pathway"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Hidden recorder */}
      <div className="opacity-0 pointer-events-none absolute">
        <RecorderPanel
          externalRunning={running}
          recorderStartRef={fn => { recorderStartRef.current = fn; }}
          recorderStopRef={fn => { recorderStopRef.current = fn; }}
          recorderPauseRef={() => {}}
          recorderResumeRef={() => {}}
          onRecorded={async ({ blob }) => { await analyze(blob); }}
        />
      </div>
    </motion.div>
  );
};
