import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePathway, type PathwayLesson, type NodeStatus } from "@/hooks/usePathway";
import { SiteHeader } from "@/components/SiteHeader";
import { RecorderPanel } from "@/components/RecorderPanel";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Check, Lock, Trophy, Play, Pause, RotateCcw, Mic, MicOff,
  ArrowLeft, ShieldCheck, Zap, Target, Sparkles, Globe,
  Wind, Award, Layers, Brain, ChevronRight, X
} from "lucide-react";
import { transcribeAudio, judgePathwayDrill } from "@/services/geminiService";

/* ── Background Floating Elements ───────────────────────── */
const FloatingElement = ({ delay = 0, color = "primary" }: { delay?: number, color?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0.1, 0.3, 0.1],
      scale: [1, 1.2, 1],
      y: [0, -20, 0],
      rotate: [0, 10, 0]
    }}
    transition={{ 
      duration: 8, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut" 
    }}
    className={cn(
      "absolute h-32 w-32 rounded-full blur-[60px] pointer-events-none",
      color === "primary" ? "bg-primary/10" : "bg-accent/10"
    )}
  />
);

const getOffset = (index: number) => {
  const cycle = index % 8;
  switch (cycle) {
    case 0: return 0;
    case 1: return -40;
    case 2: return -70;
    case 3: return -40;
    case 4: return 0;
    case 5: return 40;
    case 6: return 70;
    case 7: return 40;
    default: return 0;
  }
};

/* ── Node on the pathway map ─────────────────────────────── */
const PathwayNode = ({
  lesson, status, index, themeColor, onClick
}: {
  lesson: PathwayLesson; status: NodeStatus; index: number; themeColor: string; onClick: () => void;
}) => {
  const isTest = lesson.type === "test";
  const offset = getOffset(index);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (index % 5) * 0.1, type: "spring", stiffness: 100 }}
      className="relative flex flex-col items-center justify-center w-full z-10 py-10"
      style={{ transform: `translateX(${offset}px)` }}
    >
      {/* Glow Effect for active node */}
      {status === "available" && (
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute h-32 w-32 rounded-full blur-2xl z-0"
          style={{ backgroundColor: themeColor }}
        />
      )}

      {/* CURRENT label for available node */}
      {status === "available" && (
        <div className="absolute -top-10 z-20">
          <motion.div 
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full shadow-glow shadow-primary/20 relative border border-white/20"
          >
            CURRENT DRILL
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45 border-b border-r border-white/10" />
          </motion.div>
        </div>
      )}

      {/* Button node */}
      <button
        onClick={() => status !== "locked" && onClick()}
        disabled={status === "locked"}
        className={cn(
          "relative shrink-0 flex items-center justify-center rounded-[2rem] transition-all duration-500 shadow-xl overflow-hidden group",
          isTest ? "h-24 w-24 md:h-32 md:w-32" : "h-20 w-20 md:h-24 md:w-24",
          status === "completed"
            ? "border-b-[10px] border-black/20 hover:brightness-110 active:border-b-0 active:translate-y-[10px]"
            : status === "available"
            ? "border-b-[10px] border-black/20 hover:brightness-110 active:border-b-0 active:translate-y-[10px] ring-8 ring-primary/10"
            : "glass-card text-muted-foreground border-b-[10px] border-black/5 cursor-not-allowed grayscale"
        )}
        style={{ 
          backgroundColor: (status !== "locked") ? themeColor : undefined,
          color: (status !== "locked") ? "white" : undefined
        }}
      >
        <div className="grain pointer-events-none opacity-50" />
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        
        {status === "completed" ? (
          <Check className={cn("stroke-[4] relative z-10", isTest ? "h-10 w-10" : "h-8 w-8")} />
        ) : status === "locked" ? (
          <Lock className={cn("stroke-[3] relative z-10", isTest ? "h-10 w-10" : "h-8 w-8")} />
        ) : isTest ? (
          <Trophy className="h-10 w-10 stroke-[3] relative z-10" />
        ) : (
          <Play className="h-8 w-8 stroke-[3] fill-current relative z-10" />
        )}
      </button>

      {/* Label below */}
      <div className={cn(
        "mt-6 text-center transition-all duration-500",
        status === "locked" ? "opacity-20" : "opacity-100"
      )}>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1">
          {isTest ? "MILESTONE" : `DRILL ${index + 1}`}
        </p>
        <h3 className="speak-serif text-lg md:text-xl tracking-tight leading-tight max-w-[150px]">
          {lesson.title}
        </h3>
        <p className="text-[11px] font-medium opacity-40 italic mt-1 line-clamp-1">
          {lesson.subtitle}
        </p>
        {status === "available" && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <Brain className="h-3 w-3 text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              AI AUDIT ON
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ── Lesson Drill Modal ──────────────────────────────────── */
const LessonDrill = ({
  lesson, onComplete, onClose
}: {
  lesson: PathwayLesson; onComplete: () => void; onClose: () => void;
}) => {
  const { user } = useAuth();
  const { upload } = useRecordings("pathway");
  const { markPracticed } = useSyncedStreak();
  const [phase, setPhase] = useState<"idle" | "recording" | "analyzing" | "results">("idle");
  const [seconds, setSeconds] = useState(lesson.durationSeconds);
  const [running, setRunning] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [aiResult, setAiResult] = useState<{ score: number; feedback: string; strengths: string; coaching: string; exampleSpeech: string; passed: boolean } | null>(null);
  const idRef = useRef<number | null>(null);
  const recorderStartRef = useRef<() => void>(() => {});
  const recorderStopRef = useRef<() => void>(() => {});
  const wasRecording = useRef(false);
  const isTest = lesson.type === "test";
  const passScore = lesson.passScore || 70;
  const userName = user?.email?.split("@")[0] || "Student";
  const [micError, setMicError] = useState(false);

  // DEV CHEAT: window.passDrill()
  useEffect(() => {
    (window as any).passDrill = () => {
      console.log("[DEV] Manually passing drill...");
      onComplete();
      setAiResult({
        score: 100,
        feedback: "Manual pass triggered via console.",
        strengths: "Speed, Authority",
        coaching: "None needed for manual pass.",
        exampleSpeech: "N/A",
        passed: true
      });
      setPhase("results");
    };
    return () => { delete (window as any).passDrill; };
  }, [onComplete]);

  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const checkMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        setMicError(false);
      } catch (err) {
        console.warn("[Pathway] Mic access denied or unavailable:", err);
        setMicError(true);
      }
    };
    checkMic();
  }, []); // Run on mount when the modal opens

  useEffect(() => {
    if (!running) { if (idRef.current) clearInterval(idRef.current); return; }
    idRef.current = window.setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(idRef.current!);
          setRunning(false);
          recorderStopRef.current?.();
          wasRecording.current = false;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (idRef.current) clearInterval(idRef.current); };
  }, [running]);

  const handleStart = () => {
    console.log("[Pathway] Starting drill. Mic error status:", micError);
    if (micError) {
      toast({ 
        title: "Microphone Required", 
        description: "Please enable your microphone in your browser settings to perform this drill.", 
        variant: "destructive" 
      });
      return;
    }
    setSeconds(lesson.durationSeconds);
    setPhase("recording");
    setRunning(true);
    recorderStartRef.current?.();
    wasRecording.current = true;
  };

  const handleStop = () => {
    console.log("[Pathway] Finishing drill. Running state:", running);
    setRunning(false);
    recorderStopRef.current?.();
    wasRecording.current = false;
    
    // We delay the phase shift to 'analyzing' until we actually get the blob
    // if the recorder is active. Otherwise we stay in recording/error UI.
    setTimeout(() => {
      if (phaseRef.current === "recording") {
        console.warn("[Pathway] No recording detected after 1.5s of stop. Failing gracefully.");
        setAiResult({ 
          score: 0, 
          feedback: "We couldn't capture any audio from your microphone. This usually happens if permissions are denied or the hardware is disconnected.", 
          strengths: "N/A", 
          coaching: "Check your browser's microphone permissions and ensure your device is plugged in.", 
          exampleSpeech: "", 
          passed: false 
        });
        setPhase("results");
      }
    }, 1500);
  };

  const analyzeRecording = async (blob: Blob) => {
    console.log("[Pathway] Analyzing recording. Blob size:", blob.size);
    setAudioBlob(blob);
    setPhase("analyzing");
    
    if (blob.size < 100) {
      console.warn("[Pathway] Blob too small to be valid audio.");
      setAiResult({ 
        score: 0, 
        feedback: "The recording was empty or failed. Please check your microphone permissions.", 
        strengths: "N/A", 
        coaching: "Check if your mic is muted or if another app is using it.", 
        exampleSpeech: "", 
        passed: false 
      });
      setPhase("results");
      return;
    }

    const timeout = setTimeout(() => {
      if (phaseRef.current === "analyzing") {
        console.warn("[Pathway] AI Analysis timed out after 25s.");
        setAiResult({ 
          score: 0, 
          feedback: "Analysis timed out. Please check your connection and try again.", 
          strengths: "N/A", 
          coaching: "The AI took too long to respond. This can happen with very short or silent recordings.", 
          exampleSpeech: "", 
          passed: false 
        });
        setPhase("results");
      }
    }, 25000);

    try {
      console.log("[Pathway] Calling transcribeAudio...");
      const transcript = await transcribeAudio(blob);
      console.log("[Pathway] Transcript received. Length:", transcript?.length || 0);
      
      if (!transcript || transcript.trim().length < 5) {
        setAiResult({ 
          score: 0, 
          feedback: "We couldn't hear anything clearly. It seems like the recording was empty or contained no speech.", 
          strengths: "N/A", 
          coaching: "Ensure your microphone is active and you speak clearly into it for the duration of the drill.", 
          exampleSpeech: "", 
          passed: false 
        });
        clearTimeout(timeout);
        setPhase("results");
        return;
      }

      const result = await judgePathwayDrill(userName, transcript, lesson.title, lesson.objective, lesson.prompt, passScore);
      clearTimeout(timeout);
      setAiResult(result);
      setPhase("results");
      
      if (result.passed) {
        onComplete();
        toast({ title: isTest ? "Milestone Cleared! 🏆" : "Drill Passed! ✓", description: `Score: ${result.score}. ${isTest ? "Next unit unlocked!" : "Keep it up!"}` });
      }
    } catch (err) {
      console.error("[Pathway] Analysis error:", err);
      clearTimeout(timeout);
      setAiResult({ 
        score: 0, 
        feedback: "AI analysis failed or was interrupted. Your attempt was recorded but couldn't be scored.", 
        strengths: "Completed the drill", 
        coaching: "Try again. Ensure you have a stable connection.", 
        exampleSpeech: "", 
        passed: false 
      });
      setPhase("results");
      if (!isTest) onComplete();
    }
  };

  const pct = lesson.durationSeconds > 0 ? (seconds / lesson.durationSeconds) * 100 : 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] glass overflow-y-auto overflow-x-hidden scrollbar-hide text-foreground flex flex-col"
    >
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="px-4 md:container max-w-4xl mx-auto py-8 md:py-24 relative z-10">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 hover:text-primary transition-all group">
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-2 transition-transform" /> 
              {phase === "results" ? "BACK TO PATH" : "STOP DRILL"}
            </button>
            {(running || micError) && (
              <>
                <div className="h-4 w-px bg-border" />
                <div className={cn(
                  "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] py-1 px-3 rounded-full border transition-all",
                  micError ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"
                )}>
                  {micError ? <MicOff className="h-3 w-3" /> : <Mic className={cn("h-3 w-3", running && "animate-pulse")} />}
                  {micError ? "MIC ERROR" : "MIC ACTIVE"}
                </div>
              </>
            )}
          </div>

        {/* Header */}
        <div className="space-y-4 mb-12">
          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] text-primary">
            {isTest ? <Trophy className="h-5 w-5" /> : <Target className="h-5 w-5" />}
            {isTest ? "FINAL ASSESSMENT" : "PRACTICE DRILL"}
          </div>
          <h1 className="speak-serif text-4xl md:text-7xl tracking-tighter leading-[0.9]">{lesson.title}</h1>
          <p className="text-lg md:text-xl font-medium opacity-40 max-w-2xl leading-relaxed italic">"{lesson.objective}"</p>
        </div>

        {/* PHASE: IDLE */}
        {phase === "idle" && (
          <div className="grid lg:grid-cols-[1fr_320px] gap-10 items-start">
            <div className="space-y-8">
              <div className="bg-muted/5 border border-border/60 rounded-[2.5rem] p-8 space-y-8">
                <p className="text-xs font-black uppercase tracking-[0.5em] opacity-30">EXECUTION STEPS</p>
                <ol className="space-y-5">
                  {lesson.instructions.map((inst, i) => (
                    <li key={i} className="flex gap-5 group">
                      <span className="text-primary speak-serif text-2xl italic opacity-30 group-hover:opacity-100 transition-opacity">0{i + 1}</span>
                      <span className="text-base font-medium opacity-60 leading-relaxed">{inst}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-muted/10 border border-primary/20 rounded-[2.5rem] p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5"><ShieldCheck className="h-24 w-24 text-primary" /></div>
                <p className="text-xs font-black uppercase tracking-[0.5em] text-primary mb-6">YOUR PROMPT</p>
                <p className="speak-serif text-2xl md:text-3xl italic tracking-tight leading-tight">"{lesson.prompt}"</p>
              </div>
            </div>
            <div className="sticky top-24 space-y-6">
              <div className="bg-muted/5 border border-border/60 rounded-[2.5rem] p-8 text-center space-y-6">
                <div className="speak-serif text-7xl font-bold italic tabular-nums">{mins}:{String(secs).padStart(2, "0")}</div>
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Brain className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">AI Audit Enabled</span>
                </div>
                <button onClick={handleStart} className="button-pill w-full py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3 group">
                  <Play className="h-5 w-5 fill-current" />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">BEGIN DRILL</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE: RECORDING */}
        {phase === "recording" && (
          <div className="max-w-lg mx-auto space-y-8">
            <div className="bg-muted/10 border border-primary/20 rounded-[2.5rem] p-10">
              <p className="text-xs font-black uppercase tracking-[0.5em] text-primary mb-6">YOUR PROMPT</p>
              <p className="speak-serif text-2xl md:text-3xl italic tracking-tight leading-tight">"{lesson.prompt}"</p>
            </div>
            <div className="bg-muted/5 border border-border/60 rounded-[2.5rem] p-8 space-y-6">
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary shadow-glow" animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="text-center">
                <div className="speak-serif text-8xl font-bold italic tabular-nums">{mins}:{String(secs).padStart(2, "0")}</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-widest text-red-500">RECORDING</span>
                </div>
              </div>
              <button onClick={handleStop} className="button-pill w-full py-5 border border-primary/30 text-primary flex items-center justify-center gap-3">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-black uppercase tracking-[0.2em]">FINISH & ANALYZE</span>
              </button>
            </div>
          </div>
        )}

        {/* PHASE: ANALYZING */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-24 space-y-8">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-20 w-20 border-t-4 border-primary rounded-full" />
            <div className="text-center space-y-3">
              <p className="speak-serif text-3xl italic">Analyzing performance...</p>
              <p className="text-xs font-black uppercase tracking-[0.5em] text-primary/50 animate-pulse">AI COACH IS REVIEWING YOUR DRILL</p>
            </div>
          </div>
        )}

        {/* PHASE: RESULTS */}
        {phase === "results" && aiResult && (
          <div className="space-y-8 max-w-2xl mx-auto">
            {/* Score Circle */}
            <div className="flex flex-col items-center gap-4 py-8">
              <div className={cn("h-36 w-36 rounded-full border-4 flex flex-col items-center justify-center shadow-glow", aiResult.passed ? "border-primary bg-primary/10" : "border-muted-foreground/30 bg-muted/10")}>
                <span className="speak-serif text-5xl font-bold italic">{aiResult.score}</span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">/ 100</span>
              </div>
              <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", aiResult.passed ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/20 border-border text-muted-foreground")}>
                {aiResult.passed ? (isTest ? "MILESTONE CLEARED ✓" : "DRILL PASSED ✓") : (isTest ? "NOT QUITE — TRY AGAIN" : "DRILL COMPLETE")}
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-muted/5 border border-border/60 rounded-[2rem] p-8 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Sparkles className="h-3 w-3" /> COACH'S VERDICT</p>
              <p className="text-base leading-relaxed opacity-70 italic">"{aiResult.feedback}"</p>
            </div>

            {/* Strengths */}
            {aiResult.strengths && aiResult.strengths !== "N/A" && (
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Award className="h-3 w-3" /> YOUR STRENGTHS</p>
                <div className="flex flex-wrap gap-2">
                  {aiResult.strengths.split(',').map((s, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest">{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Coaching Tip */}
            <div className="bg-muted/10 border border-border rounded-[2rem] p-6 flex gap-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5"><Brain className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">COACH'S TIP</p>
                <p className="text-sm opacity-70 leading-relaxed">{aiResult.coaching}</p>
              </div>
            </div>

            {/* Expert Example */}
            {aiResult.exampleSpeech && (
              <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-8 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Mic className="h-3 w-3" /> HOW AN EXPERT WOULD SAY IT</p>
                <p className="text-sm leading-relaxed opacity-80 italic">{aiResult.exampleSpeech}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {aiResult.passed ? (
                <button onClick={onClose} className="button-pill flex-1 py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3">
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">CONTINUE PATH</span>
                </button>
              ) : (
                <>
                  <button onClick={() => { setPhase("idle"); setAiResult(null); setSeconds(lesson.durationSeconds); }} className="button-pill flex-1 py-5 border border-primary/30 text-primary flex items-center justify-center gap-3 hover:bg-primary/5 transition-all">
                    <RotateCcw className="h-4 w-4" />
                    <span className="text-sm font-black uppercase tracking-[0.2em]">RETRY DRILL</span>
                  </button>
                  <button onClick={() => { onComplete(); onClose(); }} className="button-pill flex-1 py-5 bg-muted/20 border border-border/60 flex items-center justify-center gap-3 opacity-60 hover:opacity-100 transition-all">
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-sm font-black uppercase tracking-[0.2em]">SKIP & CONTINUE</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Hidden Recorder */}
        <div className="opacity-0 pointer-events-none absolute">
          <RecorderPanel
            externalRunning={running}
            recorderStartRef={fn => { recorderStartRef.current = fn; }}
            recorderStopRef={fn => { recorderStopRef.current = fn; }}
            recorderPauseRef={() => {}}
            recorderResumeRef={() => {}}
            onRecorded={async ({ blob }) => {
              markPracticed();
              if (user) {
                upload(blob, { promptText: `Pathway: ${lesson.title}`, difficulty: "Medium", type: "drill" });
              }
              await analyzeRecording(blob);
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

/* ── Main Pathway Page ───────────────────────────────────── */
const Pathway = () => {
  const {
    units, loading, selection, getNodeStatus,
    completeLesson, progressPercent, completedCount, totalLessons
  } = usePathway();
  const [activeDrill, setActiveDrill] = useState<PathwayLesson | null>(null);
  // Dynamic Theme Colors
  const themeColors: Record<string, string> = {
    vocal: "#3B82F6",
    interviews: "#10B981",
    impromptu: "#F43F5E",
    default: "#F97316"
  };

  const primaryColor = themeColors[selection || "default"] || themeColors.default;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-8">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="h-16 w-16 border-t-4 border-primary rounded-full"
        />
        <p className="text-xs font-black uppercase tracking-[0.6em] text-primary animate-pulse">Initializing Path...</p>
      </div>
    );
  }


  return (
    <main className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <FloatingElement delay={0} color="primary" />
        <FloatingElement delay={2} color="accent" />
        <FloatingElement delay={4} color="primary" />
        <FloatingElement delay={6} color="accent" />
        <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-primary/3 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/3 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      <SiteHeader />

      {/* Hero */}
      <section id="pathway-hero" className="px-4 md:container pt-32 md:pt-56 pb-20 relative z-10">
        <div className="grid lg:grid-cols-[1fr_400px] gap-12 items-end">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <Link to="/" className="inline-flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-primary opacity-30 hover:opacity-100 transition-all group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-2 transition-transform" /> BACK TO HOME
            </Link>
            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] text-primary">
              <Globe className="h-3 w-3" />
              UN SDG 4 · QUALITY EDUCATION
            </div>
            <h1 className="speak-serif text-5xl md:text-8xl lg:text-9xl tracking-tighter leading-[0.8] mb-4">
              {(() => {
                const hasCustom = units.some(u => u.name === "Personalized Focus");
                if (hasCustom) return <>Your <span className="text-primary italic">Personalized</span> Path.</>;
                
                const sel = selection || localStorage.getItem(`speakbold_pathway_selection_${user?.id}`) || localStorage.getItem("speakbold_pathway_selection");
                if (sel === "vocal") return <>Vocal <span className="text-primary italic">Mastery</span>.</>;
                if (sel === "interviews") return <>Interview <span className="text-primary italic">Success</span>.</>;
                if (sel === "impromptu") return <>Quick <span className="text-primary italic">Thinking</span>.</>;
                return <>Learning <span className="text-primary italic">Path</span>.</>;
              })()}
            </h1>
            <p className="text-xl md:text-3xl font-medium opacity-40 max-w-2xl leading-tight italic">
              {(() => {
                const hasCustom = units.some(u => u.name === "Personalized Focus");
                if (hasCustom) return "We've built this sequence specifically to tackle your selected weaknesses first.";

                const sel = selection || localStorage.getItem(`speakbold_pathway_selection_${user?.id}`) || localStorage.getItem("speakbold_pathway_selection");
                if (sel === "vocal") return "Eliminate filler words and build a commanding, confident tone.";
                if (sel === "interviews") return "Master the STAR method and answer tough questions with ease.";
                if (sel === "impromptu") return "Never freeze. Learn to structure your thoughts instantly on the spot.";
                return "Improve your speaking skills with focused drills and helpful AI feedback.";
              })()}
            </p>
          </motion.div>

          {/* Progress bar */}
          <div className="space-y-6 bg-muted/5 border border-border/60 p-10 rounded-[3rem] backdrop-blur-sm shadow-soft">
            <div className="flex justify-between items-end">
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">TOTAL PROGRESS</p>
                  <div className="speak-serif text-5xl font-bold italic text-primary leading-none">{progressPercent}%</div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">LESSONS DONE</p>
                  <p className="text-lg font-bold">{completedCount} / {totalLessons}</p>
               </div>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/60 relative">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${progressPercent}%` }} 
                transition={{ duration: 1.5, ease: "circOut" }} 
                className="h-full bg-primary shadow-glow shadow-primary/40 rounded-full relative" 
              >
                 <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Pathway Map */}
      <section id="pathway-units" className="px-4 md:container pb-64 relative z-10">
        {units.map((unit, ui) => {
          const unitCompleted = unit.lessons.every(l => getNodeStatus(l.id) === "completed");
          const unitLocked = unit.lessons.every(l => getNodeStatus(l.id) === "locked");

          return (
            <div key={unit.id} className="mb-32 md:mb-48 relative">
              {/* Unit Header */}
              <div className="sticky top-24 z-20 mb-20 pointer-events-none">
                 <motion.div
                  initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }}
                  className={cn(
                    "inline-block p-8 md:p-12 rounded-[3.5rem] border backdrop-blur-md shadow-2xl relative overflow-hidden pointer-events-auto",
                    unitCompleted ? "bg-primary/5 border-primary/30" : unitLocked ? "bg-muted/10 border-border/30 opacity-40 grayscale" : "bg-muted/5 border-border/60"
                  )}
                >
                  <div className="grain pointer-events-none opacity-20" />
                  <div className="flex items-center gap-10 relative z-10">
                    <div 
                      className="h-20 w-20 md:h-24 md:w-24 rounded-[2rem] flex items-center justify-center shrink-0 shadow-lg"
                      style={{ backgroundColor: unit.color }}
                    >
                       <span className="speak-serif text-3xl md:text-4xl text-white font-bold italic">{ui + 1}</span>
                    </div>
                    <div className="space-y-3 min-w-0 pr-8">
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">UNIT {ui + 1}</p>
                      <h2 className="speak-serif text-3xl md:text-5xl tracking-tighter leading-none">{unit.name}</h2>
                      <p className="text-sm md:text-lg font-medium opacity-40 italic">"{unit.tagline}"</p>
                    </div>
                    {unitCompleted && (
                      <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-glow shadow-primary/20 animate-float">
                        <Check className="h-6 w-6 md:h-8 md:w-8 text-white stroke-[4]" />
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Nodes Area */}
              <div className="relative flex flex-col items-center py-20">
                {/* Visual Connection Path (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`grad-${unit.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={unit.color} stopOpacity="0.1" />
                      <stop offset="50%" stopColor={unit.color} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={unit.color} stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  
                  <line 
                    x1="50%" y1="0%" x2="50%" y2="100%" 
                    stroke={`url(#grad-${unit.id})`} 
                    strokeWidth="12" 
                    strokeDasharray="1, 30" 
                    strokeLinecap="round" 
                  />
                  
                  {!unitLocked && (
                    <motion.line 
                      x1="50%" y1="0%" x2="50%" y2="100%" 
                      stroke={unit.color} 
                      strokeWidth="2" 
                      strokeDasharray="10, 20" 
                      initial={{ strokeDashoffset: 1000 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="opacity-30"
                    />
                  )}
                </svg>

                {unit.lessons.map((lesson, li) => {
                  const status = getNodeStatus(lesson.id);
                  return (
                    <PathwayNode
                      key={lesson.id}
                      lesson={lesson}
                      status={status}
                      index={li}
                      themeColor={unit.color}
                      onClick={() => setActiveDrill(lesson)}
                    />
                  );
                })}
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-border/60 to-transparent my-10" />
            </div>
          );
        })}

        {progressPercent === 100 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 space-y-10"
          >
             <div className="h-48 w-48 rounded-[4rem] bg-primary flex items-center justify-center shadow-glow shadow-primary/40 animate-float">
                <Trophy className="h-24 w-24 text-white" />
             </div>
             <div className="text-center space-y-4">
                <h2 className="speak-serif text-5xl md:text-7xl italic tracking-tighter">Path Finished.</h2>
                <p className="text-xs font-black uppercase tracking-[0.6em] text-primary">COURSE COMPLETED</p>
             </div>
             <Link to="/leaderboard" className="button-pill px-16 py-6 bg-white text-primary border-white shadow-2xl">
                <span className="text-sm font-black uppercase tracking-[0.3em]">VIEW LEADERBOARD</span>
             </Link>
          </motion.div>
        )}
      </section>

      <AnimatePresence>
        {activeDrill && (
          <LessonDrill
            lesson={activeDrill}
            onClose={() => setActiveDrill(null)}
            onComplete={() => { completeLesson(activeDrill.id); }}
          />
        )}
      </AnimatePresence>
    </main>
  );
};

export default Pathway;
