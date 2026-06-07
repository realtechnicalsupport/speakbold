import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Compass, Mic, MicOff, Sparkles, Play, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecorderPanel } from "@/components/RecorderPanel";
import { transcribeAudio, judgePathwayDrill } from "@/services/geminiService";
import { TIERS, type TierId } from "@/hooks/usePathway";
import { toast } from "@/hooks/use-toast";

const PLACEMENT_PROMPT = "Tell me about a challenge you faced recently and how you handled it.";
const PLACEMENT_SECONDS = 60;

/** Band a 0–100 speaking score into an entry tier. */
const tierForScore = (score: number): TierId =>
  score >= 72 ? "orator" : score >= 55 ? "intermediate" : "beginner";

type Phase = "offer" | "recording" | "analyzing" | "result";

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
        fallback("We couldn't capture your audio, so we'll start you from the beginning. You can jump ahead anytime.");
      }
    }, 1500);
  };

  const fallback = (feedback: string) => {
    setResult({ tier: "beginner", feedback });
    setPhase("result");
  };

  const analyze = async (blob: Blob) => {
    setPhase("analyzing");
    if (blob.size < 100) {
      fallback("We couldn't capture any audio, so we'll start you from the beginning. You can jump ahead anytime.");
      return;
    }
    const timeout = setTimeout(() => {
      if (phaseRef.current === "analyzing") fallback("That took too long to analyze — we'll start you from the beginning for now.");
    }, 25000);
    try {
      const transcript = await transcribeAudio(blob);
      if (!transcript || transcript.trim().length < 5) {
        clearTimeout(timeout);
        fallback("We couldn't hear you clearly, so we'll start you from the beginning. You can jump ahead anytime.");
        return;
      }
      const judged = await judgePathwayDrill(
        userName, transcript,
        "Placement Assessment",
        "Speak clearly and persuasively about a real experience.",
        // Neutral grading for placement — tier banding below depends on it, so
        // it must NOT use the lenient Beginner calibration.
        PLACEMENT_PROMPT, 60, "intermediate"
      );
      clearTimeout(timeout);
      setResult({ tier: tierForScore(judged.score), feedback: judged.feedback });
      setPhase("result");
    } catch {
      clearTimeout(timeout);
      fallback("We hit a snag analyzing that — we'll start you from the beginning for now.");
    }
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = (seconds / PLACEMENT_SECONDS) * 100;
  const tierMeta = result ? TIERS.find(t => t.id === result.tier) ?? null : null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] glass overflow-y-auto overflow-x-hidden scrollbar-hide text-foreground flex flex-col"
    >
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="px-4 md:container max-w-2xl mx-auto py-10 md:py-24 relative z-10 flex-1 flex flex-col justify-center">
        {/* PHASE: OFFER */}
        {phase === "offer" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8">
            <div className="flex items-center justify-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-primary">
              <Compass className="h-4 w-4" />
              Find your level
            </div>
            <h1 className="speak-serif text-4xl md:text-6xl tracking-tighter leading-[0.95]">
              Where should we <span className="text-primary italic">start you?</span>
            </h1>
            <p className="text-base md:text-lg opacity-60 max-w-lg mx-auto leading-relaxed">
              Take a quick 60-second speaking test and we'll drop you at the right tier — Beginner, Intermediate, or Orator. Or just start from the beginning.
            </p>
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
          <div className="space-y-6 md:space-y-8">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold">
              <div className={cn(
                "flex items-center gap-1.5 py-1 px-2.5 rounded-full border",
                micError ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"
              )}>
                {micError ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3 animate-pulse" />}
                {micError ? "Mic error" : "Mic on"}
              </div>
            </div>
            <div className="bg-muted/10 border border-primary/20 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10 text-center">
              <p className="text-xs font-semibold text-primary mb-3 lg:mb-5">Your prompt</p>
              <p className="speak-serif text-xl lg:text-3xl italic tracking-tight leading-tight">"{PLACEMENT_PROMPT}"</p>
            </div>
            <div className="bg-muted/5 border border-border/60 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-8 space-y-5">
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary shadow-glow" animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="text-center">
                <div className="speak-serif text-6xl lg:text-8xl font-bold italic tabular-nums">{mins}:{String(secs).padStart(2, "0")}</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-semibold text-red-500">Recording</span>
                </div>
              </div>
              <button
                onClick={handleStop}
                className="button-pill w-full py-4 lg:py-5 border border-primary/30 text-primary flex items-center justify-center gap-3"
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-semibold">Finish & analyze</span>
              </button>
            </div>
          </div>
        )}

        {/* PHASE: ANALYZING */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-20 space-y-8">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-20 w-20 border-t-4 border-primary rounded-full" />
            <div className="text-center space-y-3">
              <p className="speak-serif text-3xl italic">Finding your level...</p>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-primary/50 animate-pulse">SIZING UP YOUR SPEAKING</p>
            </div>
          </div>
        )}

        {/* PHASE: RESULT */}
        {phase === "result" && result && tierMeta && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8">
            <div className="flex items-center justify-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-primary">
              <Compass className="h-4 w-4" />
              Your starting tier
            </div>
            <h1 className="speak-serif text-5xl md:text-7xl tracking-tighter leading-[0.9] italic">
              {tierMeta.name}.
            </h1>
            <p className="text-base md:text-lg opacity-60 max-w-lg mx-auto leading-relaxed">{result.feedback}</p>
            <p className="text-sm opacity-40 max-w-md mx-auto italic">{tierMeta.tagline} {tierMeta.description}</p>
            <div className="flex flex-col gap-3 max-w-sm mx-auto pt-2">
              <button
                onClick={() => onPlace(result.tier)}
                className="button-pill w-full py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-100 transition-transform"
              >
                <span className="text-sm font-black uppercase tracking-[0.2em]">Start at {tierMeta.name}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              {result.tier !== "beginner" && (
                <button
                  onClick={() => onPlace("beginner")}
                  className="text-xs font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity py-3 flex items-center justify-center gap-2"
                >
                  Start from the beginning instead
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
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
