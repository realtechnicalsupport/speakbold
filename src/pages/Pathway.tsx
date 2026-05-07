import { useState, useRef, useEffect, useCallback } from "react";
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
  Check, Lock, Trophy, Play, Pause, RotateCcw, Mic,
  ArrowLeft, ShieldCheck, Zap, Target, Sparkles, Globe,
  Wind, Zap as Flash, Award, Layers
} from "lucide-react";
import { RecordingFeedbackModal } from "@/components/RecordingFeedback";

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
  lesson, status, index, themeColor, onClick, attemptsLeft, selection
}: {
  lesson: PathwayLesson; status: NodeStatus; index: number; themeColor: string; onClick: () => void; attemptsLeft: number; selection: string | null;
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

      {/* START tooltip for available node */}
      {status === "available" && (
        <div className="absolute -top-10 z-20">
          <motion.div 
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full shadow-glow shadow-primary/20 relative border border-white/20"
          >
            {attemptsLeft > 0 ? "CURRENT DRILL" : "MAX ATTEMPTS REACHED"}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45 border-b border-r border-white/10" />
          </motion.div>
        </div>
      )}

      {/* Button node */}
      <button
        onClick={() => status !== "locked" && onClick()}
        disabled={status === "locked" || (status === "available" && attemptsLeft === 0)}
        className={cn(
          "relative shrink-0 flex items-center justify-center rounded-[2rem] transition-all duration-500 shadow-xl overflow-hidden group",
          isTest ? "h-24 w-24 md:h-32 md:w-32" : "h-20 w-20 md:h-24 md:w-24",
          status === "completed"
            ? "border-b-[10px] border-black/20 hover:brightness-110 active:border-b-0 active:translate-y-[10px]"
            : status === "available"
            ? attemptsLeft > 0 
              ? "border-b-[10px] border-black/20 hover:brightness-110 active:border-b-0 active:translate-y-[10px] ring-8 ring-primary/10"
              : "bg-muted text-muted-foreground border-b-[10px] border-black/5 opacity-50 grayscale cursor-not-allowed"
            : "bg-muted/40 text-muted-foreground border-b-[10px] border-black/5 cursor-not-allowed grayscale"
        )}
        style={{ 
          backgroundColor: (status !== "locked" && (status === "completed" || (status === "available" && attemptsLeft > 0))) ? themeColor : undefined,
          color: (status !== "locked" && (status === "completed" || (status === "available" && attemptsLeft > 0))) ? "white" : undefined
        }}
      >
        <div className="grain pointer-events-none opacity-50" />
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        
        {status === "completed" ? (
          <Check className={cn("stroke-[4] relative z-10", isTest ? "h-10 w-10" : "h-8 w-8")} />
        ) : (status === "locked" || (status === "available" && attemptsLeft === 0)) ? (
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
            <Zap className={cn("h-3 w-3", attemptsLeft > 0 ? "text-primary animate-pulse" : "text-muted")} />
            <span className={cn("text-[10px] font-black uppercase tracking-widest", attemptsLeft > 0 ? "text-primary" : "opacity-30")}>
              {attemptsLeft} ATTEMPTS REMAINING
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ── Lesson Drill Modal ──────────────────────────────────── */
const LessonDrill = ({
  lesson, onComplete, onClose, onTestScore, attemptsLeft, onRecordAttempt
}: {
  lesson: PathwayLesson; onComplete: () => void; onClose: () => void; onTestScore?: (score: number) => void; attemptsLeft: number; onRecordAttempt: () => void;
}) => {
  const { user } = useAuth();
  const { upload, refresh } = useRecordings("pathway");
  const { markPracticed } = useSyncedStreak();
  const [seconds, setSeconds] = useState(lesson.durationSeconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [recordEnabled, setRecordEnabled] = useState(true);
  const idRef = useRef<number | null>(null);
  const recorderStartRef = useRef<() => void>();
  const recorderStopRef = useRef<() => void>();
  const recorderPauseRef = useRef<() => void>();
  const recorderResumeRef = useRef<() => void>();
  const wasRecording = useRef(false);
  const [lastRecordingId, setLastRecordingId] = useState<string | null>(null);

  useEffect(() => {
    if (!running) { if (idRef.current) clearInterval(idRef.current); return; }
    idRef.current = window.setInterval(() => {
      setSeconds(s => {
        if (s <= 0) {
          setRunning(false);
          setFinished(true);
          if (recordEnabled) { recorderStopRef.current?.(); wasRecording.current = false; refresh(); }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (idRef.current) clearInterval(idRef.current); };
  }, [running, recordEnabled, refresh]);

  useEffect(() => {
    if (!recordEnabled) return;
    if (running && !wasRecording.current) { 
      recorderStartRef.current?.(); 
      wasRecording.current = true; 
      onRecordAttempt();
    }
    else if (!running && wasRecording.current && finished) {
      setTimeout(() => { recorderStopRef.current?.(); wasRecording.current = false; }, 50);
    }
  }, [running, recordEnabled, finished, onRecordAttempt]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = lesson.durationSeconds > 0 ? (seconds / lesson.durationSeconds) * 100 : 0;
  const isTest = lesson.type === "test";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background/98 backdrop-blur-3xl overflow-y-auto"
    >
      <div className="grain pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px] animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="px-4 md:container max-w-4xl mx-auto py-8 md:py-24 relative z-10">
        {/* Close */}
        <button onClick={onClose} className="mb-12 flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 hover:text-primary transition-all group">
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-2 transition-transform" /> 
          STOP DRILL
        </button>

        {/* Header */}
        <div className="space-y-6 mb-12 md:mb-20">
          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] text-primary">
            {isTest ? <Trophy className="h-5 w-5" /> : <Target className="h-5 w-5" />}
            {isTest ? "FINAL ASSESSMENT" : "PRACTICE DRILL"}
          </div>
          <h1 className="speak-serif text-4xl md:text-8xl tracking-tighter leading-[0.9]">
            {lesson.title}
          </h1>
          <p className="text-lg md:text-2xl font-medium opacity-40 max-w-2xl leading-relaxed italic">
            "{lesson.objective}"
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_350px] gap-12 items-start">
          <div className="space-y-12">
            {/* Instructions */}
            {!finished && (
              <div className="bg-muted/5 border border-border/60 rounded-[3rem] p-8 md:p-12 space-y-10 relative overflow-hidden">
                <div className="grain pointer-events-none" />
                <div className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-black uppercase tracking-[0.5em] opacity-30">EXECUTION STEPS</p>
                </div>
                <ol className="space-y-6">
                  {lesson.instructions.map((inst, i) => (
                    <li key={i} className="flex gap-6 group">
                      <span className="text-primary speak-serif text-2xl italic opacity-30 group-hover:opacity-100 transition-opacity">0{i + 1}</span>
                      <span className="text-base md:text-lg font-medium opacity-60 leading-relaxed">{inst}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Prompt Card */}
            <div className="bg-muted/10 border border-primary/20 rounded-[3rem] p-10 md:p-16 relative overflow-hidden shadow-soft">
              <div className="grain pointer-events-none" />
              <div className="absolute top-0 right-0 p-12 opacity-5">
                 <ShieldCheck className="h-24 w-24 text-primary" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.5em] text-primary mb-8">INITIALIZED PROMPT</p>
              <p className="speak-serif text-2xl md:text-4xl italic tracking-tight leading-tight">
                "{lesson.prompt}"
              </p>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="space-y-8 sticky top-24">
            {/* Timer + Controls */}
            <div className="bg-muted/5 border border-border/60 rounded-[3rem] p-10 space-y-10 relative overflow-hidden shadow-soft">
              <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full">
                <motion.div className="h-full bg-primary shadow-glow" animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
              </div>
              
              <div className="text-center space-y-4">
                <p className="text-xs font-black uppercase tracking-[0.5em] opacity-30">T-MINUS</p>
                <div className="speak-serif text-7xl font-bold tracking-tighter italic tabular-nums leading-none">
                  {mins}<span className="animate-pulse">:</span>{String(secs).padStart(2, "0")}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {!finished ? (
                  !running ? (
                    <button
                      disabled={attemptsLeft === 0 && seconds === lesson.durationSeconds}
                      onClick={() => { if (seconds === 0) setSeconds(lesson.durationSeconds); setRunning(true); }}
                      className="button-pill w-full py-6 bg-primary text-white flex items-center justify-center gap-4 shadow-glow group disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                      <Play className="h-5 w-5 fill-current" />
                      <span className="text-sm font-black uppercase tracking-[0.2em]">
                        {attemptsLeft > 0 ? (seconds < lesson.durationSeconds ? "RESUME DRILL" : "INITIALIZE") : "LOCKED"}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setRunning(false)}
                      className="button-pill w-full py-6 border border-primary/30 text-primary flex items-center justify-center gap-4 hover:bg-primary/5 transition-all"
                    >
                      <Pause className="h-5 w-5 fill-current" />
                      <span className="text-sm font-black uppercase tracking-[0.2em]">PAUSE DRILL</span>
                    </button>
                  )
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-6">
                      <div className="h-20 w-20 rounded-[1.5rem] bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto animate-float">
                        <Sparkles className="h-10 w-10 text-primary" />
                      </div>
                      <div className="space-y-2">
                         <p className="speak-serif text-3xl italic">Drill Complete</p>
                         <p className="text-xs font-medium opacity-40 uppercase tracking-widest">AI Feedback Ready</p>
                      </div>
                      
                      {lastRecordingId ? (
                        <div className="space-y-4">
                           <RecordingFeedbackModal 
                             recordingId={lastRecordingId}
                             onScoreCalculated={(score) => {
                               if (score >= (lesson.passScore || 70)) {
                                 onComplete();
                                 toast({ title: "Drill Passed!", description: `You scored ${score}. Well done!` });
                               } else {
                                 toast({ title: "Not Quite Yet", description: `You scored ${score}. You need ${lesson.passScore || 70} to pass. Try again!`, variant: "destructive" });
                               }
                             }}
                             trigger={
                               <button className="button-pill w-full py-6 bg-primary text-white shadow-glow">
                                  <span className="text-sm font-black uppercase tracking-[0.2em]">SEE AI FEEDBACK</span>
                               </button>
                             }
                           />
                           {lesson.type !== "test" && (
                             <button onClick={() => { onComplete(); onClose(); }} className="button-pill w-full py-5 border border-primary/20 text-primary/60 hover:text-primary transition-all">
                                <span className="text-[10px] font-black uppercase tracking-widest">SKIP & FINISH</span>
                             </button>
                           )}
                        </div>
                      ) : (
                        <p className="text-xs opacity-40 italic">Preparing recording data...</p>
                      )}
                    </div>
                    
                    <button onClick={() => { setSeconds(lesson.durationSeconds); setFinished(false); }} className="flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-opacity w-full py-2">
                      <RotateCcw className="h-4 w-4" /> RESTART SEQUENCE
                    </button>
                  </div>
                )}
              </div>

              {/* Status footer */}
              <div className="pt-8 border-t border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center border transition-all duration-500", running ? "bg-primary/10 border-primary text-primary animate-pulse" : "bg-muted border-border/60 opacity-20")}>
                    <Mic className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-40">SYSTEM</p>
                     <p className="text-xs font-bold">{running ? "RECORDING" : "STANDBY"}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-40">ATTEMPTS LEFT</p>
                   <p className={cn("text-xs font-bold", attemptsLeft === 0 ? "text-red-500" : "text-primary")}>{attemptsLeft}</p>
                </div>
              </div>
            </div>

            {/* Self Review Card */}
            {finished && !isTest && lesson.selfReview.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/5 border border-primary/20 rounded-[3rem] p-10 space-y-8">
                <p className="text-xs font-black uppercase tracking-[0.5em] text-primary">SELF REVIEW</p>
                <div className="space-y-6">
                  {lesson.selfReview.map((q, i) => (
                    <div key={i} className="flex items-start gap-4 text-sm font-medium opacity-60 leading-relaxed">
                      <span className="text-primary mt-1">✱</span> {q}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Hidden recorder */}
        {recordEnabled && (
          <div className="opacity-0 pointer-events-none absolute">
            <RecorderPanel
              externalRunning={running}
              recorderStartRef={fn => { recorderStartRef.current = fn; }}
              recorderPauseRef={fn => { recorderPauseRef.current = fn; }}
              recorderResumeRef={fn => { recorderResumeRef.current = fn; }}
              recorderStopRef={fn => { recorderStopRef.current = fn; }}
              onRecorded={async ({ blob }) => {
                markPracticed();
                if (user) {
                  const { data } = await upload(blob, { promptText: `Pathway: ${lesson.title}`, difficulty: "Medium", type: "drill" });
                  if (data?.id) setLastRecordingId(data.id);
                }
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ── Main Pathway Page ───────────────────────────────────── */
const Pathway = () => {
  const {
    units, loading, selection, getNodeStatus, getAttemptsLeft, recordAttempt,
    completeLesson, recordTestScore, progressPercent, completedCount, totalLessons
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
        <div className="grain pointer-events-none" />
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
                const sel = localStorage.getItem("speakbold_pathway_selection");
                if (sel === "vocal") return <>Vocal <span className="text-primary italic">Mastery</span>.</>;
                if (sel === "interviews") return <>Interview <span className="text-primary italic">Success</span>.</>;
                if (sel === "impromptu") return <>Quick <span className="text-primary italic">Thinking</span>.</>;
                return <>Learning <span className="text-primary italic">Path</span>.</>;
              })()}
            </h1>
            <p className="text-xl md:text-3xl font-medium opacity-40 max-w-2xl leading-tight italic">
              {(() => {
                const sel = localStorage.getItem("speakbold_pathway_selection");
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
                  const attemptsLeft = getAttemptsLeft(lesson.id);
                  return (
                    <PathwayNode
                      key={lesson.id}
                      lesson={lesson}
                      status={status}
                      index={li}
                      themeColor={unit.color}
                      attemptsLeft={attemptsLeft}
                      selection={selection}
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
            attemptsLeft={getAttemptsLeft(activeDrill.id)}
            onRecordAttempt={() => recordAttempt(activeDrill.id)}
            onClose={() => setActiveDrill(null)}
            onComplete={() => {
              completeLesson(activeDrill.id);
              if (activeDrill.type === "test") {
                recordTestScore(activeDrill.id, 100);
                toast({ title: "Milestone Passed!", description: `${activeDrill.title} complete. Next unit unlocked.` });
              } else {
                toast({ title: "Lesson Complete!", description: `${activeDrill.title} marked as done.` });
              }
            }}
            onTestScore={(score) => {
              recordTestScore(activeDrill.id, score);
              if (score >= (activeDrill.passScore ?? 70)) {
                toast({ title: "Milestone Passed!", description: `Score: ${score}. Next unit unlocked!` });
              } else {
                toast({ title: "Not quite yet", description: `Score: ${score}. You need ${activeDrill.passScore ?? 70} to pass.`, variant: "destructive" });
              }
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
};

export default Pathway;
