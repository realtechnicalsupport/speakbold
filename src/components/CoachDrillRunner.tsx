import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, Loader2, RotateCcw, Target, Check, AudioWaveform, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { RecorderPanel } from "@/components/RecorderPanel";
import { ModelSpeech } from "@/components/ModelSpeech";
import { transcribeAudio, judgeCoachDrill } from "@/services/geminiService";
import { logSkillEvent } from "@/lib/skillEvents";
import { coachToDims } from "@/lib/skillScoring";
import { cn } from "@/lib/utils";
import type { AdaptiveDrill } from "@/lib/skillProfile";

// Filler list mirrors FILLER_WORDS in useImpromptuSession (inlined to keep this
// component light).
const FILLER_WORDS = ["um", "uh", "like", "you know", "so", "basically", "right", "actually", "literally", "kind of", "sort of"];
const countFillers = (text: string): number => {
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce(
    (n, w) => n + (lower.match(new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "g"))?.length ?? 0),
    0
  );
};

type Phase = "intro" | "recording" | "analyzing" | "results" | "error";
type Result = { score: number; verdict: string; fixes: string[]; exampleSpeech: string };

const scoreColor = (s: number) => (s >= 80 ? "#34d399" : s >= 65 ? "#60a5fa" : s >= 50 ? "#fbbf24" : "#f87171");

// In-place practice runner for a coach-generated drill: record → transcribe →
// dimension-aware AI judge → log a skill_event back into the radar.
export const CoachDrillRunner = ({ drill, onClose }: { drill: AdaptiveDrill; onClose: () => void }) => {
  const { user } = useAuth();
  const { upload } = useRecordings("impromptu");
  const { markPracticed } = useSyncedStreak();

  const [phase, setPhase] = useState<Phase>("intro");
  const [seconds, setSeconds] = useState(drill.durationSeconds);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const recStart = useRef<() => void>();
  const recStop = useRef<() => void>();
  const timerRef = useRef<number | undefined>(undefined);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const analyze = useCallback(
    async (blob: Blob, durationMs: number) => {
      setPhase("analyzing");
      markPracticed();
      if (user) {
        try {
          await upload(blob, {
            promptText: `Coach: ${drill.title}`,
            difficulty: "Medium",
            durationMs,
            targetSeconds: drill.durationSeconds,
          });
        } catch { /* non-blocking */ }
      }
      try {
        if (blob.size < 100) { setPhase("error"); return; }
        const transcript = (await transcribeAudio(blob)).trim();
        if (transcript.length < 8) { setPhase("error"); return; }

        const totalWords = transcript.split(/\s+/).filter(Boolean).length;
        const secs = durationMs > 0 ? durationMs / 1000 : drill.durationSeconds;
        const wpm = secs > 3 ? Math.round((totalWords / secs) * 60) : 0;
        const fillerCount = countFillers(transcript);

        const judged = await judgeCoachDrill(drill.targetLabel, drill.prompt, transcript, {
          wpm, fillerCount, totalWords, durationSeconds: drill.durationSeconds,
        });
        setResult(judged);
        setPhase("results");

        logSkillEvent({
          userId: user?.id,
          source: "coach",
          scores: coachToDims({ score: judged.score, targetDimension: drill.targetDimension, wpm, fillerCount, totalWords }),
          overall: judged.score,
          meta: { targetDimension: drill.targetDimension, title: drill.title },
        });
      } catch (err) {
        console.error("[CoachDrillRunner] analyze error", err);
        setPhase("error");
      }
    },
    [user, drill, markPracticed, upload]
  );

  const start = () => {
    setSeconds(drill.durationSeconds);
    setResult(null);
    setPhase("recording");
    setRunning(true);
    recStart.current?.();
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(timerRef.current);
          window.setTimeout(stop, 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const stop = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRunning(false);
    recStop.current?.();
    // If no audio surfaces shortly, surface an error rather than hang.
    window.setTimeout(() => {
      if (phaseRef.current === "recording") setPhase("error");
    }, 2000);
  };

  const reset = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRunning(false);
    setResult(null);
    setSeconds(drill.durationSeconds);
    setPhase("intro");
  };

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const ringPct = (seconds / Math.max(1, drill.durationSeconds)) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-background/85 backdrop-blur-xl"
        onClick={phase === "recording" ? undefined : onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg glass-card rounded-3xl md:rounded-[2.5rem] p-6 md:p-9 overflow-hidden"
        >
          {phase !== "recording" && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 h-9 w-9 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-muted/30 transition-all z-10"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Eyebrow */}
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-5">
            <Target className="h-3.5 w-3.5" />
            Coach drill · {drill.targetLabel}
          </div>

          {/* ── INTRO ── */}
          {phase === "intro" && (
            <div className="space-y-7">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Your prompt</p>
                <h2 className="speak-serif text-2xl md:text-3xl leading-tight tracking-tight">{drill.prompt}</h2>
                {drill.rationale && <p className="text-sm opacity-50 italic leading-relaxed">{drill.rationale}</p>}
              </div>
              <p className="text-xs opacity-40">
                Speak for {drill.durationSeconds}s. We'll score your <span className="text-primary font-semibold">{drill.targetLabel.toLowerCase()}</span> and feed it into your skill radar.
              </p>
              <button
                onClick={start}
                className="group w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-primary text-white shadow-glow hover:scale-[1.02] active:scale-95 transition-transform"
              >
                <Mic className="h-4 w-4" />
                <span className="text-sm font-black uppercase tracking-wide">Start drill</span>
              </button>
            </div>
          )}

          {/* ── RECORDING ── */}
          {phase === "recording" && (
            <div className="space-y-7">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Speaking on</p>
                <h2 className="speak-serif text-lg md:text-2xl leading-tight tracking-tight opacity-80">{drill.prompt}</h2>
              </div>
              <div className="flex items-center justify-center gap-6">
                <div className="relative h-28 w-28">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <motion.circle
                      cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 44}
                      animate={{ strokeDashoffset: (2 * Math.PI * 44) * (1 - ringPct / 100) }}
                      transition={{ duration: 0.5, ease: "linear" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="speak-serif text-3xl font-bold tabular-nums italic">{seconds}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">sec left</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Recording</span>
                </div>
              </div>
              <button
                onClick={stop}
                className="w-full px-6 py-3.5 rounded-full border border-primary/40 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
              >
                I'm done — score me
              </button>
            </div>
          )}

          {/* ── ANALYZING ── */}
          {phase === "analyzing" && (
            <div className="py-14 flex flex-col items-center gap-5">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm font-medium opacity-50">Scoring your {drill.targetLabel.toLowerCase()}…</p>
            </div>
          )}

          {/* ── RESULTS ── */}
          {phase === "results" && result && (
            <div className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="relative h-24 w-24 shrink-0 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
                    <motion.circle
                      cx="50" cy="50" r="42" fill="none" stroke={scoreColor(result.score)} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                      animate={{ strokeDashoffset: (2 * Math.PI * 42) * (1 - result.score / 100) }}
                      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                  <span className="speak-serif text-3xl font-bold italic tabular-nums" style={{ color: scoreColor(result.score) }}>
                    {result.score}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1">{drill.targetLabel}</p>
                  <p className="speak-serif text-base italic leading-snug opacity-80">{result.verdict}</p>
                </div>
              </div>

              {result.fixes.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Fix next time</p>
                  {result.fixes.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="opacity-70 leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.exampleSpeech && (
                <ModelSpeech text={result.exampleSpeech} label="How it could sound" compact />
              )}

              <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-500">
                <Check className="h-4 w-4" /> Added to your skill radar.
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={reset}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-primary text-white shadow-glow text-xs font-black uppercase tracking-wide hover:scale-[1.02] transition-transform"
                >
                  <RotateCcw className="h-4 w-4" /> Drill again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3.5 rounded-full border border-border/60 text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {phase === "error" && (
            <div className="space-y-5 text-center py-4">
              <AudioWaveform className="h-10 w-10 mx-auto text-primary opacity-40" />
              <h2 className="speak-serif text-2xl italic">We didn't catch that.</h2>
              <p className="text-sm opacity-50">Check your mic and give it another go.</p>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow"
              >
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
            </div>
          )}

          {/* Hidden recorder */}
          <div className="opacity-0 pointer-events-none absolute" aria-hidden="true">
            <RecorderPanel
              externalRunning={running}
              recorderStartRef={(fn) => { recStart.current = fn; }}
              recorderStopRef={(fn) => { recStop.current = fn; }}
              recorderPauseRef={() => {}}
              recorderResumeRef={() => {}}
              onRecorded={({ blob, durationMs }) => analyze(blob, durationMs)}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
