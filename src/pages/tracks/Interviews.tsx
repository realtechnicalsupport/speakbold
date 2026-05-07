import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { RecordingsList } from "@/components/RecordingsList";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Shuffle, 
  Lightbulb, 
  EyeOff,
  Eye,
  Mic,
  CheckCircle2,
  Clock,
  Target,
  Trophy,
  Sparkles,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Zap,
  ArrowRight,
  Microscope,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { useSyncedInterviewQuestions } from "@/hooks/useSyncedInterviewQuestions";
import { toast } from "@/hooks/use-toast";
import { generateInterviewQuestions } from "@/services/geminiService";
import { setTimerActive } from "@/lib/timerState";
import { setRecordingActive } from "@/lib/recordingState";
import { RecordingFeedbackModal } from "@/components/RecordingFeedback";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  id: string;
  q: string;
  type: string;
  guidance: string;
  example: string;
  targetSeconds: number;
  difficulty: "Warm-up" | "Standard" | "Pressure";
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
    id: "q2",
    q: "Tell me about a time you failed.",
    type: "Behavioural",
    guidance: "STAR: Situation, Task, Action, Result. Pick a real failure with a clean lesson.",
    example: "Led a launch with a team of five...",
    targetSeconds: 90,
    difficulty: "Standard",
    keyPoints: ["Situation", "Task", "Action", "Result"],
  }
];

const STAR = [
  { letter: "S", word: "SITUATION", line: "Set the scene in one sentence." },
  { letter: "T", word: "TASK", line: "What were you responsible for?" },
  { letter: "A", word: "ACTION", line: "What did YOU specifically do?" },
  { letter: "R", word: "RESULT", line: "Outcome & Lesson learned." },
];

const Interviews = () => {
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"browse" | "practice">("practice");
  const [revealed, setRevealed] = useState(false);
  const [recordEnabled, setRecordEnabled] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());

  // AI generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiCategory, setAiCategory] = useState("Behavioural");

  const { questions: syncedAIQuestions, addQuestions: saveAIQuestions } = useSyncedInterviewQuestions();
  
  // Timer state
  const [duration, setDuration] = useState(75);
  const [seconds, setSeconds] = useState(75);
  const [running, setRunning] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  
  useEffect(() => {
    setTimerActive(running || pausedAt !== null);
    return () => setTimerActive(false);
  }, [running, pausedAt]);

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
  
  const questions = [...DEFAULT_QUESTIONS, ...syncedAIQuestions];
  const current = questions[active] || questions[0];

  const generateAIQuestions = async () => {
    setIsGenerating(true);
    try {
      const newQuestions = await generateInterviewQuestions(aiCategory, "standard", 2);
      const formatted = newQuestions.map(q => ({
        q: q.question,
        type: "AI Generated",
        guidance: q.followUp || "Use the STAR method.",
        example: "Craft a compelling answer based on your history.",
        targetSeconds: 90,
        difficulty: "Standard" as const,
        keyPoints: q.keyPoints,
        is_ai: true,
      }));
      if (user) await saveAIQuestions(formatted);
      toast({ title: "Questions Synthesized", description: "New AI questions added." });
    } catch (error) {
      toast({ title: "Synthesis failed", variant: "destructive" });
    } finally { setIsGenerating(false); }
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

  return (
    <TrackShell
      eyebrow="MODULE 03 — INTERVIEWS"
      title={<>Master the <span className="text-primary italic">High-Stakes</span> Q&A.</>}
      intro="Technical competence is assumed. Your delivery is what differentiates you. Practice the STAR method under pressure."
      hideHeader={running || pausedAt !== null}
    >
      {/* Background Decorative Drifting Glow */}
      <div className="absolute top-[20%] right-[5%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/5 rounded-full blur-[140px] animate-float opacity-30 pointer-events-none" />

      <div className="grid lg:grid-cols-[1fr_400px] gap-6 lg:gap-12 relative z-10">
        <div className="space-y-6 md:space-y-10 min-w-0">
          {/* Mode toggle */}
          <div className="flex bg-muted/5 p-2 rounded-[2rem] border border-border/60 max-w-md">
            <button
              onClick={() => setMode("practice")}
              className={cn(
                "flex-1 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
                mode === "practice" ? "bg-primary text-white shadow-glow" : "opacity-40 hover:opacity-100"
              )}
            >
              ACTIVE PRACTICE
            </button>
            <button
              onClick={() => setMode("browse")}
              className={cn(
                "flex-1 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
                mode === "browse" ? "bg-primary text-white shadow-glow" : "opacity-40 hover:opacity-100"
              )}
            >
              BROWSE REPO
            </button>
          </div>

          <AnimatePresence mode="wait">
            {mode === "practice" ? (
              <motion.div 
                key="practice-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-12"
              >
                {/* Active Question Card */}
                <motion.div 
                  layout
                  className="bg-muted/10 border border-primary/20 rounded-2xl md:rounded-[4rem] p-6 md:p-16 shadow-soft relative overflow-hidden group">
                   <div className="grain pointer-events-none" />
                   <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
                      <Briefcase className="h-48 w-48 text-primary" />
                   </div>

                   <div className="space-y-12 relative z-10">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] text-primary opacity-60">
                            <Target className="h-4 w-4" />
                            {current.difficulty.toUpperCase()} PROTOCOL
                         </div>
                         <button 
                          onClick={() => setActive((active + 1) % questions.length)}
                          className="h-12 w-12 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted/20 transition-all group/shuffle"
                         >
                           <Shuffle className="h-4 w-4 opacity-40 group-hover/shuffle:opacity-100 group-hover/shuffle:rotate-180 transition-all duration-700" />
                         </button>
                      </div>

                      <h2 className="speak-serif text-4xl md:text-6xl leading-[1.1] tracking-tighter">
                         "{current.q}"
                      </h2>

                      <AnimatePresence>
                        {revealed ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid md:grid-cols-2 gap-12 pt-12 border-t border-border/60"
                          >
                             <div className="space-y-6">
                                <p className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-3">
                                   <Zap className="h-3 w-3" />
                                   STRATEGIC STAR
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                   {STAR.map((s, i) => (
                                     <div key={i} className="p-6 rounded-[2rem] bg-muted/5 border border-border/60 space-y-2">
                                        <p className="text-xl font-black text-primary italic">{s.letter}</p>
                                        <p className="text-[11px] font-black uppercase tracking-widest opacity-40">{s.word}</p>
                                     </div>
                                   ))}
                                </div>
                             </div>
                             <div className="space-y-6">
                                <p className="text-xs font-black uppercase tracking-widest opacity-40">GUIDANCE VECTORS</p>
                                <div className="p-8 rounded-[2rem] bg-muted/5 border border-border/60 space-y-4">
                                   <p className="text-sm font-medium opacity-60 leading-relaxed italic">"{current.guidance}"</p>
                                   <ul className="space-y-2">
                                      {current.keyPoints.map((p, i) => (
                                        <li key={i} className="flex gap-3 text-xs font-bold uppercase tracking-widest opacity-40">
                                           <span className="text-primary">✱</span> {p}
                                        </li>
                                      ))}
                                   </ul>
                                </div>
                             </div>
                          </motion.div>
                        ) : (
                          <button 
                            onClick={() => setRevealed(true)}
                            className="w-full py-8 border-2 border-dashed border-border/60 rounded-[3rem] text-xs font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-4"
                          >
                             <Microscope className="h-4 w-4" />
                             REVEAL STRATEGIC GUIDANCE
                          </button>
                        )}
                      </AnimatePresence>
                   </div>
                </motion.div>

                {/* AI Generator Panel */}
                <div className="p-5 md:p-10 rounded-2xl md:rounded-[3rem] bg-muted/5 border border-border/60 relative overflow-hidden group">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-12 relative z-10 min-w-0">
                      <div className="space-y-4 min-w-0">
                         <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-primary">
                            <Sparkles className="h-4 w-4" />
                            AI INTERVIEW ENGINE
                         </div>
                         <div className="flex flex-wrap gap-2 md:gap-4">
                            {["Behavioural", "Situational", "Leadership"].map(cat => (
                              <button 
                                key={cat}
                                onClick={() => setAiCategory(cat)}
                                className={cn(
                                  "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all",
                                  aiCategory === cat ? "bg-primary text-white border-primary shadow-glow" : "border-border/60 opacity-40 hover:opacity-100"
                                )}
                              >
                                {cat}
                              </button>
                            ))}
                         </div>
                      </div>
                      <button
                        onClick={generateAIQuestions}
                        disabled={isGenerating}
                        className="button-pill py-3 px-6 md:py-5 md:px-10 bg-primary text-white shadow-glow group/btn w-full md:w-auto"
                      >
                        {isGenerating ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em]">
                             SYNTHESIZE QUESTIONS
                             <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </span>
                        )}
                      </button>
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="browse-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid gap-6"
              >
                 {questions.map((q, i) => (
                   <button
                    key={q.id}
                    onClick={() => { setActive(i); setMode("practice"); }}
                    className={cn(
                      "p-6 md:p-10 rounded-2xl md:rounded-[3rem] border transition-all duration-500 text-left flex items-center justify-between gap-4 group overflow-hidden",
                      active === i ? "bg-primary/[0.03] border-primary shadow-glow" : "bg-muted/5 border-border/60 hover:border-primary/30"
                    )}
                   >
                      <div className="space-y-2 md:space-y-4 min-w-0">
                         <div className="flex items-center gap-4 text-[11px] md:text-xs font-black uppercase tracking-[0.3em] opacity-40">
                            {String(i + 1).padStart(2, "0")} • {q.type}
                         </div>
                         <h3 className="speak-serif text-lg md:text-3xl group-hover:text-primary transition-colors truncate">"{q.q}"</h3>
                      </div>
                      <ChevronRight className="h-6 w-6 md:h-8 md:w-8 shrink-0 opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
                   </button>
                 ))}
              </motion.div>
            )}
          </AnimatePresence>
          <RecordingsList />
        </div>

        {/* Sidebar Controls */}
        <aside className="space-y-8 relative z-10">
          <div className="sticky top-32 space-y-8">
            {/* Timer Panel */}
            <div className="bg-muted/5 border border-border/60 rounded-2xl md:rounded-[3rem] p-6 md:p-10 space-y-6 md:space-y-10 relative overflow-hidden shadow-soft">
              <div className="grain pointer-events-none" />
              <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full">
                 <motion.div 
                   className="h-full bg-primary shadow-glow" 
                   initial={{ width: "100%" }}
                   animate={{ width: `${pct}%` }}
                   transition={{ duration: 0.5 }}
                 />
              </div>

              <div className="text-center space-y-4">
                <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">INTERVIEW CLOCK</p>
                <div className="speak-serif text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter italic tabular-nums">
                  {mins}<span className="animate-pulse">:</span>{String(secs).padStart(2, "0")}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <AnimatePresence mode="wait">
                  {!running ? (
                    <button
                      onClick={() => {
                        if (seconds === 0) setSeconds(duration);
                        setRunning(true);
                        if (pausedAt) setPausedAt(null);
                        hasStartedRef.current = true;
                      }}
                      className="button-pill w-full py-6 bg-primary text-white flex items-center justify-center gap-4 shadow-glow group"
                    >
                      <Play className="h-5 w-5 fill-current" />
                      <span className="text-sm font-black uppercase tracking-[0.2em]">{hasStartedRef.current ? "RESUME" : "START"}</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => { setRunning(false); setPausedAt(Date.now()); }}
                      className="button-pill w-full py-6 border border-primary/30 text-primary flex items-center justify-center gap-4 hover:bg-primary/5 transition-all"
                    >
                      <Pause className="h-5 w-5 fill-current" />
                      <span className="text-sm font-black uppercase tracking-[0.2em]">PAUSE SESSION</span>
                    </button>
                  )}
                </AnimatePresence>
                <button 
                  onClick={() => { setSeconds(duration); setRunning(false); setPausedAt(null); hasStartedRef.current = false; }}
                  className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-opacity"
                >
                  <RotateCcw className="h-3 w-3" />
                  RESTART CLOCK
                </button>
              </div>

              {/* Recording Toggle */}
              <div className="pt-6 border-t border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border transition-all duration-500",
                    recordEnabled ? "bg-primary/10 border-primary text-primary animate-pulse" : "bg-muted border-border/60 opacity-20"
                  )}>
                    <Mic className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest">RECORDING</p>
                    <p className="text-[11px] font-bold opacity-30 uppercase tracking-widest">{recordEnabled ? "ACTIVE" : "OFF"}</p>
                  </div>
                </div>
                <Switch 
                  checked={recordEnabled} 
                  onCheckedChange={setRecordEnabled} 
                  disabled={!user}
                />
              </div>
            </div>

            {/* Recorder Hidden Panel */}
            {recordEnabled && (
              <div className="opacity-0 pointer-events-none absolute">
                <RecorderPanel
                  externalRunning={running}
                  recorderStartRef={(fn) => { recorderStartRef.current = fn; }}
                  recorderPauseRef={(fn) => { recorderPauseRef.current = fn; }}
                  recorderResumeRef={(fn) => { recorderResumeRef.current = fn; }}
                  recorderStopRef={(fn) => { recorderStopRef.current = fn; }}
                  onRecorded={async ({ blob }) => {
                    markPracticed();
                    if (user) {
                      await uploadRecording(blob, {
                        promptText: `Interview: ${current.q}`,
                        difficulty: current.difficulty,
                        type: "drill"
                      });
                    }
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.5em] opacity-20 justify-center">
               <ShieldCheck className="h-3 w-3" />
               ENCRYPTED STREAM
            </div>
          </div>
        </aside>
      </div>
    </TrackShell>
  );
};

export default Interviews;
