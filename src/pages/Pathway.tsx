import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { usePathway, TIERS, ALL_LESSONS, getLessonTier, type PathwayLesson, type NodeStatus, type PathwayChapter, type PathwayTier, type TierId } from "@/hooks/usePathway";
import { PlacementTest } from "@/components/PlacementTest";
import { PlacementGate } from "@/components/PlacementGate";
import { SiteHeader } from "@/components/SiteHeader";
import { RecorderPanel } from "@/components/RecorderPanel";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Check, Lock, Trophy, Play, Pause, RotateCcw, Mic, MicOff,
  ArrowLeft, ShieldCheck, Target, Sparkles, Compass,
  Award, Brain, ChevronDown, ChevronRight, ArrowRight, Flame, Clock, Swords, Volume2
} from "lucide-react";
import { transcribeAudio, judgePathwayDrill, speakWithDeepgramTTS } from "@/services/geminiService";
import { DebateBattle } from "@/components/DebateBattle";
import { useArena, AI_PERSONAS } from "@/hooks/useArena";
import { STARTING_ELO } from "@/hooks/arenaUtils";
import { ChapterCelebration } from "@/components/ChapterCelebration";

/** Build an AI opponent for an Orator debate drill from its personaSkill. */
const makeDebateOpponent = (personaSkill?: string): any => {
  const persona = AI_PERSONAS.find(p => p.skill === personaSkill) ?? AI_PERSONAS[1];
  return {
    id: "ai",
    name: `${persona.name} (AI)`,
    avatar: persona.avatar,
    rank: { name: "Adaptive", tier: "AI" },
    elo: 0,
    score: null,
    persona,
  };
};

/* ── Helpers ────────────────────────────────────────────── */
const formatSeconds = (s: number) => s < 60 ? `${s} sec` : `${Math.round(s / 60 * 10) / 10} min`;

/* ── Score sparkline ─────────────────────────────────────── */
const Sparkline = ({ scores }: { scores: number[] }) => {
  const pts = scores.slice(-6);
  if (pts.length < 2) return null;
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const span = (hi - lo) || 10;
  const W = 52, H = 14;
  const path = pts.map((s, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - 1 - ((s - lo) / span) * (H - 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const delta = pts[pts.length - 1] - pts[0];
  const stroke = delta > 4 ? "#22c55e" : delta < -4 ? "#f87171" : "hsl(var(--primary))";
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="opacity-60">
        <polyline points={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[9px] font-black tabular-nums opacity-50">{pts[pts.length - 1]}</span>
    </div>
  );
};

const zigzagOffset = (i: number) => {
  // Gentle left-center-right-center pattern; small enough to read cleanly on mobile
  const cycle = i % 4;
  return cycle === 0 ? -30 : cycle === 1 ? 0 : cycle === 2 ? 30 : 0;
};

/* ── Drill Node (chunky Duolingo-style button) ──────────── */
const DrillNode = ({
  lesson, status, index, chapterColor, isCurrent, scoreHistory, onClick
}: {
  lesson: PathwayLesson;
  status: NodeStatus;
  index: number;
  chapterColor: string;
  isCurrent: boolean;
  scoreHistory: number[];
  onClick: () => void;
}) => {
  const isTest = lesson.type === "test";
  const isBattle = lesson.type === "debate" || lesson.type === "duel";
  const isTestedOut = status === "tested-out";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 110 }}
      className="relative flex flex-col items-center w-full py-6"
      style={{ transform: `translateX(${zigzagOffset(index)}px)` }}
    >
      {/* Glow halo for active */}
      {isCurrent && (
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-0 h-32 w-32 rounded-full blur-2xl z-0"
          style={{ backgroundColor: chapterColor }}
        />
      )}

      {/* Floating "START HERE" label */}
      {isCurrent && (
        <div className="absolute -top-7 z-20">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="bg-primary text-white text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full shadow-glow shadow-primary/30 relative border border-white/20 whitespace-nowrap"
          >
            START HERE
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rotate-45 border-b border-r border-white/10" />
          </motion.div>
        </div>
      )}

      <button
        id={isCurrent ? "tutorial-current-node" : undefined}
        onClick={() => status !== "locked" && onClick()}
        disabled={status === "locked"}
        className={cn(
          "relative shrink-0 flex items-center justify-center rounded-[1.75rem] transition-all duration-300 overflow-hidden group z-10",
          isTest ? "h-24 w-24 md:h-28 md:w-28" : "h-20 w-20 md:h-24 md:w-24",
          status === "locked"
            ? "bg-muted/20 text-muted-foreground border-b-[8px] border-black/5 cursor-not-allowed"
            : "border-b-[8px] border-black/25 shadow-xl hover:brightness-110 active:border-b-0 active:translate-y-[8px]",
          isTestedOut && "opacity-50",
          isCurrent && "ring-4 ring-primary/30"
        )}
        style={{
          backgroundColor: status !== "locked" ? chapterColor : undefined,
          color: status !== "locked" ? "white" : undefined,
        }}
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        {status === "completed" || isTestedOut ? (
          <Check className={cn("stroke-[4] relative z-10", isTest ? "h-10 w-10" : "h-8 w-8")} />
        ) : status === "locked" ? (
          <Lock className={cn("stroke-[3] relative z-10", isTest ? "h-8 w-8" : "h-6 w-6")} />
        ) : isBattle ? (
          <Swords className="h-9 w-9 stroke-[3] relative z-10" />
        ) : isTest ? (
          <Trophy className="h-10 w-10 stroke-[3] relative z-10" />
        ) : (
          <Play className="h-8 w-8 stroke-[3] fill-current relative z-10" />
        )}
      </button>

      {/* Label below */}
      <div className={cn(
        "mt-4 text-center max-w-[260px]",
        status === "locked" ? "opacity-30" : "opacity-100"
      )}>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-1">
          {isTestedOut ? "TESTED PAST" : isBattle ? "BATTLE" : isTest ? "MILESTONE" : `DRILL ${index + 1}`}
        </p>
        <h3 className="speak-serif text-base md:text-lg tracking-tight leading-tight">
          {lesson.title}
        </h3>
        <div className="flex items-center justify-center gap-2 mt-1.5 text-[10px] font-medium opacity-50">
          <Clock className="h-3 w-3" />
          {formatSeconds(lesson.durationSeconds)}
        </div>
        {status === "completed" && scoreHistory.length >= 2 && (
          <div className="flex justify-center">
            <Sparkline scores={scoreHistory} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ── Chapter Card (current/completed = expanded with nodes) ─ */
const ChapterCard = ({
  chapter, index, isCurrent, isComplete, isLocked, currentDrillId, getNodeStatus, getScoreHistory, onNodeClick
}: {
  chapter: PathwayChapter;
  index: number;
  isCurrent: boolean;
  isComplete: boolean;
  isLocked: boolean;
  currentDrillId: string | null;
  getNodeStatus: (id: string) => NodeStatus;
  getScoreHistory: (id: string) => number[];
  onNodeClick: (lesson: PathwayLesson) => void;
}) => {
  const [collapsed, setCollapsed] = useState(isComplete);

  const completed = chapter.lessons.filter(l => {
    const s = getNodeStatus(l.id);
    return s === "completed" || s === "tested-out";
  }).length;
  const total = chapter.lessons.length;
  const pct = Math.round((completed / total) * 100);
  const totalSeconds = chapter.lessons.reduce((s, l) => s + l.durationSeconds, 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Header card */}
      <div
        className={cn(
          "p-6 md:p-10 rounded-[2.5rem] border relative overflow-hidden shadow-soft transition-all",
          isLocked
            ? "bg-muted/5 border-border/40 opacity-60"
            : isComplete
            ? "bg-primary/5 border-primary/30 cursor-pointer select-none hover:border-primary/50"
            : "bg-muted/5 border-border/60"
        )}
        onClick={isComplete ? () => setCollapsed(c => !c) : undefined}
      >
        {!isLocked && (
          <div
            className="absolute -top-32 -right-32 h-64 w-64 rounded-full blur-[100px] animate-float opacity-30"
            style={{ backgroundColor: chapter.color }}
          />
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          {/* Number badge */}
          <div
            className={cn(
              "h-16 w-16 md:h-20 md:w-20 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg",
              isLocked ? "bg-muted/30" : ""
            )}
            style={{ backgroundColor: !isLocked ? chapter.color : undefined }}
          >
            {isLocked ? (
              <Lock className="h-7 w-7 text-muted-foreground" />
            ) : isComplete ? (
              <Check className="h-8 w-8 text-white stroke-[4]" />
            ) : (
              <span className="speak-serif text-3xl text-white font-bold italic">{index + 1}</span>
            )}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                CHAPTER {index + 1} · {chapter.level.toUpperCase()}
              </p>
              {isComplete && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  ✓ DONE
                  <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.25 }}>
                    <ChevronDown className="h-3 w-3" />
                  </motion.div>
                </span>
              )}
            </div>
            <h2 className="speak-serif text-3xl md:text-4xl tracking-tighter leading-none">{chapter.name}</h2>
            <p className="text-sm md:text-base font-medium opacity-50 italic">"{chapter.tagline}"</p>
            <p className="text-xs md:text-sm font-medium opacity-40 leading-relaxed max-w-xl pt-1">
              {chapter.promise}
            </p>
          </div>

          {/* Right side: progress or unlock hint */}
          {isLocked ? (
            <div className="md:w-48 shrink-0 text-right space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">UNLOCKS AFTER</p>
              <p className="speak-serif text-lg italic opacity-70">Chapter {index}</p>
              <p className="text-[10px] font-medium opacity-30">{total} drills · {formatSeconds(totalSeconds)}</p>
            </div>
          ) : (
            <div className="md:w-48 shrink-0 space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">PROGRESS</span>
                <span className="speak-serif text-2xl italic">{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "circOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: chapter.color }}
                />
              </div>
              <p className="text-[10px] font-medium opacity-50 text-right">
                {completed} of {total} drills
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Drill nodes — collapsible for completed chapters */}
      <AnimatePresence initial={false}>
        {!isLocked && (!isComplete || !collapsed) && (
          <motion.div
            key="nodes"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="relative mt-8 pb-8">
              {/* dashed path line behind nodes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none">
                <line
                  x1="50%" y1="0" x2="50%" y2="100%"
                  stroke={chapter.color}
                  strokeOpacity="0.25"
                  strokeWidth="3"
                  strokeDasharray="2 14"
                  strokeLinecap="round"
                />
              </svg>
              <div className="relative z-10 flex flex-col items-center">
                {chapter.lessons.map((lesson, li) => (
                  <DrillNode
                    key={lesson.id}
                    lesson={lesson}
                    status={getNodeStatus(lesson.id)}
                    index={li}
                    chapterColor={chapter.color}
                    isCurrent={lesson.id === currentDrillId}
                    scoreHistory={getScoreHistory(lesson.id)}
                    onClick={() => onNodeClick(lesson)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

/* ── Hero: huge next-drill CTA ──────────────────────────── */
const NextDrillHero = ({
  currentDrill, onJumpIn, completePct, completedCount, totalLessons, streakDays
}: {
  currentDrill: { lesson: PathwayLesson; chapter: PathwayChapter; chapterIndex: number } | null;
  onJumpIn: () => void;
  completePct: number;
  completedCount: number;
  totalLessons: number;
  streakDays: number;
}) => {
  const isStart = completedCount === 0;
  const isDone = !currentDrill;

  return (
    <div id="pathway-hero" className="grid lg:grid-cols-[1fr_1.1fr] gap-6 lg:gap-10 items-stretch">
      {/* Left: friendly framing */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 lg:space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary opacity-60 hover:opacity-100 transition-all group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back home
        </Link>

        <h1 className="speak-serif text-4xl sm:text-5xl md:text-7xl tracking-tighter leading-[0.9]">
          {isStart
            ? <>Let's <span className="text-primary italic">begin.</span></>
            : isDone
            ? <>You did <span className="text-primary italic">it.</span></>
            : <>Keep <span className="text-primary italic">going.</span></>}
        </h1>

        <p className="text-base md:text-xl opacity-70 max-w-md leading-snug">
          {isStart
            ? "Four short chapters. Each drill is under two minutes. Start with hello."
            : isDone
            ? "Every chapter cleared. Replay any drill, or head to the Lab for freeform practice."
            : `${totalLessons - completedCount} drills to go. One at a time — that's how this works.`}
        </p>

        {/* Inline stats */}
        <div id="pathway-progress" className="flex flex-wrap items-center gap-4 lg:gap-5 pt-2">
          <div>
            <p className="text-xs font-semibold opacity-60">Progress</p>
            <p className="speak-serif text-2xl lg:text-3xl italic">{completePct}%</p>
          </div>
          <div className="h-10 w-px bg-border/60" />
          <div>
            <p className="text-xs font-semibold opacity-60">Done</p>
            <p className="speak-serif text-2xl lg:text-3xl italic">{completedCount}/{totalLessons}</p>
          </div>
          <div className="h-10 w-px bg-border/60" />
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">STREAK</p>
              <p className="speak-serif text-3xl italic">{streakDays}d</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right: next-drill card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative p-8 md:p-10 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/30 overflow-hidden shadow-soft flex flex-col justify-between min-h-[300px]"
      >
        {currentDrill && (
          <div
            className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-[100px] animate-float opacity-40"
            style={{ backgroundColor: currentDrill.chapter.color }}
          />
        )}

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-primary">
            <Sparkles className="h-3 w-3" />
            {isStart ? "YOUR FIRST DRILL" : isDone ? "ALL DRILLS COMPLETE" : "YOUR NEXT DRILL"}
          </div>

          {currentDrill ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
                Chapter {currentDrill.chapterIndex + 1} · {currentDrill.chapter.name}
              </p>
              <h2 className="speak-serif text-4xl md:text-5xl italic tracking-tight leading-tight">
                {currentDrill.lesson.title}
              </h2>
              <p className="text-sm md:text-base font-medium opacity-60 leading-relaxed">
                {currentDrill.lesson.subtitle}
              </p>
              <div className="flex items-center gap-4 pt-2 text-[11px] font-black uppercase tracking-[0.25em] opacity-50">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {formatSeconds(currentDrill.lesson.durationSeconds)}
                </span>
                <span>·</span>
                <span>AI-judged</span>
              </div>
            </>
          ) : (
            <>
              <h2 className="speak-serif text-3xl md:text-4xl italic tracking-tight leading-tight">
                Every drill cleared.
              </h2>
              <p className="text-sm font-medium opacity-60 leading-relaxed">
                You can replay any drill below, or head to the Lab for freeform practice.
              </p>
            </>
          )}
        </div>

        <button
          onClick={onJumpIn}
          disabled={!currentDrill}
          className={cn(
            "relative z-10 mt-6 button-pill w-full py-5 flex items-center justify-center gap-3 transition-all duration-300",
            currentDrill
              ? "bg-primary text-white shadow-glow hover:scale-[1.02] active:scale-100"
              : "bg-muted/20 border border-border/60 text-muted-foreground cursor-not-allowed"
          )}
        >
          <Play className="h-4 w-4 fill-current" />
          <span className="text-sm font-black uppercase tracking-[0.25em]">
            {currentDrill ? (isStart ? "START FIRST DRILL" : "JUMP IN") : "ALL DONE"}
          </span>
          {currentDrill && <ArrowRight className="h-4 w-4" />}
        </button>
      </motion.div>
    </div>
  );
};

/* ── Lesson Drill Modal ──────────────────────────────────── */
const LessonDrill = ({
  lesson, onComplete, onClose
}: {
  lesson: PathwayLesson; onComplete: (score?: number) => void; onClose: () => void;
}) => {
  const { user } = useAuth();
  const { upload } = useRecordings("pathway");
  const { markPracticed } = useSyncedStreak();
  const [phase, setPhase] = useState<"idle" | "recording" | "analyzing" | "results">("idle");
  const [seconds, setSeconds] = useState(lesson.durationSeconds);
  const [running, setRunning] = useState(false);
  const [aiResult, setAiResult] = useState<{ score: number; feedback: string; strengths: string; coaching: string; exampleSpeech: string; passed: boolean } | null>(null);
  const idRef = useRef<number | null>(null);
  const recorderStartRef = useRef<() => void>(() => {});
  const recorderStopRef = useRef<() => void>(() => {});
  const wasRecording = useRef(false);
  const audioUrlRef = useRef<string | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const isTest = lesson.type === "test";
  const passScore = lesson.passScore || 70;
  const userName = user?.email?.split("@")[0] || "Student";
  const [micError, setMicError] = useState(false);

  // DEV CHEAT: window.passDrill()
  useEffect(() => {
    (window as any).passDrill = () => {
      onComplete(100);
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

  // Revoke blob URL and stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      playbackAudioRef.current?.pause();
      ttsAudioRef.current?.pause();
    };
  }, []);

  // Fetch TTS coach voice when results appear
  useEffect(() => {
    if (phase !== "results" || !aiResult?.feedback) return;
    let cancelled = false;
    const go = async () => {
      setTtsLoading(true);
      try {
        const text = aiResult.feedback.length > 200
          ? aiResult.feedback.slice(0, aiResult.feedback.lastIndexOf(" ", 200)) + "…"
          : aiResult.feedback;
        const audio = await speakWithDeepgramTTS(text);
        if (cancelled) { audio.pause(); return; }
        audio.onended = () => setTtsPlaying(false);
        ttsAudioRef.current = audio;
      } catch { /* TTS unavailable — button stays hidden */ }
      finally { if (!cancelled) setTtsLoading(false); }
    };
    go();
    return () => { cancelled = true; };
  }, [phase, aiResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlayback = () => {
    if (!audioUrlRef.current) return;
    if (!playbackAudioRef.current) {
      playbackAudioRef.current = new Audio(audioUrlRef.current);
      playbackAudioRef.current.onended = () => setPlaybackPlaying(false);
    }
    if (playbackPlaying) {
      playbackAudioRef.current.pause();
      setPlaybackPlaying(false);
    } else {
      if (ttsAudioRef.current && !ttsAudioRef.current.paused) {
        ttsAudioRef.current.pause();
        setTtsPlaying(false);
      }
      playbackAudioRef.current.play().catch(() => {});
      setPlaybackPlaying(true);
    }
  };

  const toggleTts = () => {
    const audio = ttsAudioRef.current;
    if (!audio) return;
    if (ttsPlaying) {
      audio.pause();
      setTtsPlaying(false);
    } else {
      if (playbackAudioRef.current && !playbackAudioRef.current.paused) {
        playbackAudioRef.current.pause();
        setPlaybackPlaying(false);
      }
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(() => {});
      setTtsPlaying(true);
    }
  };

  const handleRetry = () => {
    playbackAudioRef.current?.pause();
    ttsAudioRef.current?.pause();
    setPlaybackPlaying(false);
    setTtsPlaying(false);
    setTtsLoading(false);
    setPhase("idle");
    setAiResult(null);
    setSeconds(lesson.durationSeconds);
  };

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
  }, []);

  useEffect(() => {
    if (!running) { if (idRef.current) clearInterval(idRef.current); return; }
    idRef.current = window.setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(idRef.current!);
          setRunning(false);
          recorderStopRef.current?.();
          wasRecording.current = false;
          window.dispatchEvent(new CustomEvent("tutorial-action-complete", { detail: { id: "tutorial-finish-analyze" } }));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (idRef.current) clearInterval(idRef.current); };
  }, [running]);

  const handleStart = () => {
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
    setRunning(false);
    recorderStopRef.current?.();
    wasRecording.current = false;

    setTimeout(() => {
      if (phaseRef.current === "recording") {
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
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = URL.createObjectURL(blob);
    playbackAudioRef.current = null; // reset so next play uses fresh URL
    setPhase("analyzing");

    if (blob.size < 100) {
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
      const transcript = await transcribeAudio(blob);

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

      const result = await judgePathwayDrill(userName, transcript, lesson.title, lesson.objective, lesson.prompt, passScore, getLessonTier(lesson));
      clearTimeout(timeout);
      setAiResult(result);
      setPhase("results");

      if (result.passed) {
        onComplete(result.score);
        toast({ title: isTest ? "Milestone Cleared! 🏆" : "Drill Passed! ✓", description: `Score: ${result.score}. ${isTest ? "Next chapter unlocked!" : "Keep it up!"}` });
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
      if (!isTest) onComplete(0);
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

      <div className="px-4 md:container max-w-4xl mx-auto py-6 md:py-24 pb-32 relative z-10">
        <div className="flex items-center gap-3 lg:gap-6">
          <button onClick={onClose} className="flex items-center gap-2 text-sm font-medium opacity-60 hover:opacity-100 hover:text-primary transition-all group">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            {phase === "results" ? "Back" : "Stop"}
          </button>
          {(running || micError) && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-semibold py-1 px-2.5 rounded-full border transition-all",
                micError ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"
              )}>
                {micError ? <MicOff className="h-3 w-3" /> : <Mic className={cn("h-3 w-3", running && "animate-pulse")} />}
                {micError ? "Mic error" : "Mic on"}
              </div>
            </>
          )}
        </div>

        {/* Header */}
        <div className="space-y-3 lg:space-y-4 mb-8 lg:mb-12 mt-6 lg:mt-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            {isTest ? <Trophy className="h-4 w-4" /> : <Target className="h-4 w-4" />}
            {isTest ? "Milestone" : "Drill"}
          </div>
          <h1 className="speak-serif text-3xl sm:text-4xl md:text-7xl tracking-tighter leading-[0.95]">{lesson.title}</h1>
          <p className="text-base md:text-xl opacity-60 max-w-2xl leading-relaxed">{lesson.objective}</p>
        </div>

        {/* PHASE: IDLE */}
        {phase === "idle" && (
          <div id="tutorial-drill-content" className="grid lg:grid-cols-[1fr_320px] gap-6 lg:gap-10 items-start">
            <div className="space-y-6 lg:space-y-8">
              <div className="bg-muted/5 border border-border/60 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-8 space-y-5 lg:space-y-8">
                <p className="text-xs font-semibold opacity-60">How to do it</p>
                <ol className="space-y-4 lg:space-y-5">
                  {lesson.instructions.map((inst, i) => (
                    <li key={i} className="flex gap-4 lg:gap-5 group">
                      <span className="text-primary speak-serif text-xl lg:text-2xl italic opacity-60 group-hover:opacity-100 transition-opacity">0{i + 1}</span>
                      <span className="text-base opacity-80 leading-relaxed">{inst}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-muted/10 border border-primary/20 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10 relative overflow-hidden">
                <div className="hidden lg:block absolute top-0 right-0 p-10 opacity-5"><ShieldCheck className="h-24 w-24 text-primary" /></div>
                <p className="text-xs font-semibold text-primary mb-3 lg:mb-6">Your prompt</p>
                <p className="speak-serif text-xl lg:text-3xl italic tracking-tight leading-tight">"{lesson.prompt}"</p>
              </div>
            </div>
            <div className="sticky top-20 lg:top-24 space-y-6">
              <div className="bg-muted/5 border border-border/60 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-8 text-center space-y-5">
                <div className="speak-serif text-6xl lg:text-7xl font-bold italic tabular-nums">{mins}:{String(secs).padStart(2, "0")}</div>
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Brain className="h-4 w-4" />
                  <span className="text-xs font-semibold">AI feedback on</span>
                </div>
                <button
                  id="tutorial-begin-drill"
                  onClick={handleStart}
                  className="button-pill w-full py-4 lg:py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3 group"
                >
                  <Play className="h-5 w-5 fill-current" />
                  <span className="text-sm font-semibold">Start drill</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE: RECORDING */}
        {phase === "recording" && (
          <div id="tutorial-recording-content" className="max-w-lg mx-auto space-y-6 lg:space-y-8">
            <div className="bg-muted/10 border border-primary/20 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10">
              <p className="text-xs font-semibold text-primary mb-3 lg:mb-6">Your prompt</p>
              <p className="speak-serif text-xl lg:text-3xl italic tracking-tight leading-tight">"{lesson.prompt}"</p>
            </div>
            <div className="bg-muted/5 border border-border/60 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-8 space-y-5">
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary shadow-glow" animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="text-center">
                <div id="tutorial-timer-display" className="speak-serif text-6xl lg:text-8xl font-bold italic tabular-nums">{mins}:{String(secs).padStart(2, "0")}</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-semibold text-red-500">Recording</span>
                </div>
              </div>
              <button
                id="tutorial-finish-analyze"
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
          <div id="tutorial-audit-results" className="space-y-8 max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className={cn("h-36 w-36 md:h-48 md:w-48 rounded-full border-4 flex flex-col items-center justify-center shadow-glow", aiResult.passed ? "border-primary bg-primary/10" : "border-muted-foreground/30 bg-muted/10")}>
                <span className="speak-serif text-5xl md:text-7xl font-bold italic">{aiResult.score}</span>
                <span className="text-xs md:text-sm font-black uppercase tracking-widest opacity-40">/ 100</span>
              </div>
              <div className={cn("px-6 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest border", aiResult.passed ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/20 border-border text-muted-foreground")}>
                {aiResult.passed ? (isTest ? "MILESTONE CLEARED ✓" : "DRILL PASSED ✓") : (isTest ? "NOT QUITE — TRY AGAIN" : "DRILL COMPLETE")}
              </div>
            </div>

            {/* Playback your recording */}
            {audioUrlRef.current && (
              <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-muted/5 border border-border/60">
                <button
                  onClick={togglePlayback}
                  className="h-10 w-10 rounded-full bg-muted/20 border border-border flex items-center justify-center hover:bg-muted/40 transition-colors shrink-0"
                >
                  {playbackPlaying
                    ? <Pause className="h-4 w-4" />
                    : <Play className="h-4 w-4 fill-current" />}
                </button>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">YOUR RECORDING</p>
                  <p className="text-xs font-medium opacity-50">{playbackPlaying ? "Playing…" : "Tap to hear yourself"}</p>
                </div>
              </div>
            )}

            <div className="bg-muted/5 border border-border/60 rounded-[2rem] p-8 md:p-12 space-y-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs md:text-sm font-black uppercase tracking-widest opacity-30 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> COACH'S VERDICT
                </p>
                {(ttsLoading || ttsAudioRef.current) && (
                  <button
                    onClick={toggleTts}
                    disabled={ttsLoading}
                    title={ttsLoading ? "Preparing coach voice…" : ttsPlaying ? "Stop" : "Hear coach"}
                    className={cn(
                      "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                      ttsLoading ? "opacity-30 animate-pulse cursor-wait" : "opacity-50 hover:opacity-100",
                      ttsPlaying && "text-primary opacity-100"
                    )}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {ttsPlaying ? "Stop" : ttsLoading ? "Loading…" : "Hear Coach"}
                  </button>
                )}
              </div>
              <p className="text-lg md:text-2xl leading-relaxed opacity-70 italic font-medium">"{aiResult.feedback}"</p>
            </div>

            {aiResult.strengths && aiResult.strengths !== "N/A" && (
              <div className="space-y-6 px-4">
                <p className="text-xs md:text-sm font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Award className="h-4 w-4" /> YOUR STRENGTHS</p>
                <div className="flex flex-wrap gap-3">
                  {aiResult.strengths.split(',').map((s, i) => (
                    <span key={i} className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs md:text-sm font-bold text-primary uppercase tracking-widest">{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted/10 border border-border rounded-[2rem] p-8 flex gap-6">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5"><Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" /></div>
              <div>
                <p className="text-xs md:text-sm font-black uppercase tracking-widest text-primary mb-2">COACH'S TIP</p>
                <p className="text-base md:text-lg opacity-70 leading-relaxed font-medium">{aiResult.coaching}</p>
              </div>
            </div>

            {aiResult.exampleSpeech && (
              <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-8 md:p-12 space-y-6">
                <p className="text-xs md:text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2"><Mic className="h-4 w-4" /> HOW AN EXPERT WOULD SAY IT</p>
                <p className="text-base md:text-lg leading-relaxed opacity-80 italic font-medium">"{aiResult.exampleSpeech}"</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {aiResult.passed ? (
                <button
                  id="tutorial-close-drill"
                  onClick={onClose}
                  className="button-pill flex-1 py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">CONTINUE PATH</span>
                </button>
              ) : (
                <>
                  <button onClick={handleRetry} className="button-pill flex-1 py-5 border border-primary/30 text-primary flex items-center justify-center gap-3 hover:bg-primary/5 transition-all">
                    <RotateCcw className="h-4 w-4" />
                    <span className="text-sm font-black uppercase tracking-[0.2em]">RETRY DRILL</span>
                  </button>
                  <button
                    id="tutorial-close-drill"
                    onClick={() => { onComplete(aiResult?.score ?? 0); onClose(); }}
                    className="button-pill flex-1 py-5 bg-muted/20 border border-border/60 flex items-center justify-center gap-3 opacity-60 hover:opacity-100 transition-all"
                  >
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

/* ── Tier section header ─────────────────────────────────── */
const TierHeader = ({ tier, done, total, locked }: {
  tier: PathwayTier; done: number; total: number; locked: boolean;
}) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center text-center gap-3 pt-4"
    >
      <div className="flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-primary">
        {locked ? <Lock className="h-3 w-3" /> : complete ? <Check className="h-3 w-3 stroke-[4]" /> : <Sparkles className="h-3 w-3" />}
        {tier.name}
      </div>
      <h2 className="speak-serif text-4xl md:text-6xl tracking-tighter italic leading-none">{tier.tagline}</h2>
      <p className="text-sm md:text-base opacity-50 max-w-lg leading-snug">{tier.description}</p>
      {!locked && (
        <div className="flex items-center gap-3 pt-1 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
          <span>{done}/{total} drills</span>
          <span className="h-1 w-1 rounded-full bg-foreground/30" />
          <span>{pct}%</span>
        </div>
      )}
    </motion.div>
  );
};

/* ── Main Pathway Page ───────────────────────────────────── */
const Pathway = () => {
  const {
    chapters, loading, progress, drillScores, getNodeStatus,
    completeLesson, applyPlacement, debugSetProgress,
    progressPercent, completedCount, totalLessons
  } = usePathway();

  const getScoreHistory = useCallback(
    (id: string) => drillScores[id] ?? [],
    [drillScores]
  );
  const { count: streakDays } = useSyncedStreak();
  const { profile: arenaProfile, completeDuel, handleForfeit } = useArena();
  const { user } = useAuth();
  const [activeDrill, setActiveDrill] = useState<PathwayLesson | null>(null);
  // Tracks whether the full-screen PlacementTest modal is open.
  const [placementTestOpen, setPlacementTestOpen] = useState(false);
  // Has the user resolved placement (taken the test or skipped)? localStorage is
  // an instant cache for this device; profiles.placement_done is the source of
  // truth so the decision follows them across devices. `placementChecked` gates
  // the first render until the server answer is in, so a cross-device skipper
  // never flashes the gate.
  const [placementSkipped, setPlacementSkipped] = useState(false);
  const [placementChecked, setPlacementChecked] = useState(false);
  useEffect(() => {
    if (!user) {
      setPlacementSkipped(false);
      setPlacementChecked(false);
      return;
    }
    const key = `speakbold:placement-skipped:${user.id}`;
    const localDone = localStorage.getItem(key) === "1";
    setPlacementSkipped(localDone); // instant: no flash for returning users on this device
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("placement_done")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const dbDone = !!(data as any)?.placement_done;
      const done = localDone || dbDone;
      setPlacementSkipped(done);
      if (done) localStorage.setItem(key, "1");
      // Repair: skipped locally but the server didn't record it → backfill.
      if (localDone && !dbDone) {
        await supabase.from("profiles").update({ placement_done: true }).eq("id", user.id);
      }
      setPlacementChecked(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const locked = !!activeDrill || placementTestOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeDrill, placementTestOpen]);

  // ── Chapter-complete celebration ────────────────────────────────────────
  // Fires the trophy overlay the instant a chapter flips from in-progress
  // to complete inside THIS session. Two design rules drive the logic below:
  //
  //  1. The seen-set is React STATE (not a ref). Refs don't trigger
  //     re-renders, which previously meant detection could race ahead of
  //     hydration and re-fire celebrations on refresh.
  //  2. The very first time we have a complete picture of the user's
  //     progress (loading=false and seen-set hydrated), we take a SNAPSHOT
  //     of everything already done and mark it seen without celebrating.
  //     That kills the bug where a refresh — or jumping to Orator via
  //     placement (which tested-out an entire stack of chapters in one
  //     setProgress call) — would dump a celebration per chapter.
  //
  // Net effect: a celebration only ever fires when a chapter transitions
  // from incomplete → complete during the current session, by drilling.
  const [celebrated, setCelebrated] = useState<PathwayChapter | null>(null);
  const [celebratedIds, setCelebratedIds] = useState<Set<string>>(new Set());
  const celebratedLoadedRef = useRef(false);
  const initialSnapshotDoneRef = useRef(false);
  const CELEBRATED_LS_KEY = (uid: string) => `speakbold:pathway-celebrated:${uid}`;

  // Hydrate seen-set from localStorage on user change. Also reset the
  // snapshot flag so switching accounts re-snapshots against the new user's
  // progress (their localStorage key + their DB state).
  useEffect(() => {
    if (!user) {
      setCelebratedIds(new Set());
      celebratedLoadedRef.current = false;
      initialSnapshotDoneRef.current = false;
      return;
    }
    try {
      const raw = localStorage.getItem(CELEBRATED_LS_KEY(user.id));
      setCelebratedIds(new Set<string>(raw ? JSON.parse(raw) : []));
    } catch { setCelebratedIds(new Set()); }
    celebratedLoadedRef.current = true;
    initialSnapshotDoneRef.current = false;
  }, [user]);

  // Persist the seen-set on change. Single source of truth for writes — every
  // mutation flows through setCelebratedIds, so this one effect covers both
  // the snapshot path and the in-session celebrate path.
  useEffect(() => {
    if (!user || !celebratedLoadedRef.current) return;
    try {
      localStorage.setItem(CELEBRATED_LS_KEY(user.id), JSON.stringify([...celebratedIds]));
    } catch { /* private mode / quota — silent */ }
  }, [celebratedIds, user]);

  // Snapshot + detection. Runs on every progress change once we're past the
  // initial loading + hydration gate.
  useEffect(() => {
    if (loading || !user || !celebratedLoadedRef.current) return;
    // If a celebration is currently on screen, don't queue another one over
    // the top of it. When the user closes it, `celebrated` flips to null and
    // this effect re-runs naturally via the dep array.
    if (celebrated) return;

    const isDone = (id: string) => {
      const s = getNodeStatus(id);
      return s === "completed" || s === "tested-out";
    };

    // ── Initial snapshot pass ───────────────────────────────────────────
    // Mark every currently-complete chapter as seen without firing. After
    // this pass, only TRANSITIONS within the session will celebrate.
    if (!initialSnapshotDoneRef.current) {
      initialSnapshotDoneRef.current = true;
      setCelebratedIds(prev => {
        const next = new Set(prev);
        for (const ch of chapters) {
          if (ch.lessons.length === 0) continue;
          if (ch.lessons.every(l => isDone(l.id))) next.add(ch.id);
        }
        return next;
      });
      return;
    }

    // ── Post-snapshot: find the first chapter that just transitioned ────
    // Only one at a time. Closing the overlay re-runs this effect and the
    // next unmarked-done chapter (if any) celebrates next.
    for (const ch of chapters) {
      if (celebratedIds.has(ch.id)) continue;
      if (ch.lessons.length === 0) continue;
      if (!ch.lessons.every(l => isDone(l.id))) continue;

      // Tested-out-only chapters get marked seen but DON'T celebrate — they
      // were unlocked via placement, not earned by drilling. This handles
      // the "jumped to Orator" case cleanly: placement flips a stack of
      // chapters to tested-out in one go, all of them get marked here, none
      // fire the overlay.
      const earnedByDrilling = ch.lessons.some(
        l => getNodeStatus(l.id) === "completed"
      );

      setCelebratedIds(prev => new Set(prev).add(ch.id));
      if (earnedByDrilling) setCelebrated(ch);
      break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, loading, user, chapters, celebratedIds, celebrated]);

  // Detect tier unlock — fires "You've unlocked the X tier" copy in the
  // celebration card when this chapter was the last one in its tier.
  const unlockedTierName = useMemo(() => {
    if (!celebrated) return null;
    const tier = TIERS.find(t => t.id === celebrated.tier);
    if (!tier) return null;
    const tierChapters = chapters.filter(c => c.tier === tier.id);
    const isLastInTier = tierChapters[tierChapters.length - 1]?.id === celebrated.id;
    if (!isLastInTier) return null;
    const tierIdx = TIERS.findIndex(t => t.id === tier.id);
    const nextTier = TIERS[tierIdx + 1];
    return nextTier ? nextTier.name : null;
  }, [celebrated, chapters]);

  // Dev console helpers — window.speakbold.*
  useEffect(() => {
    if (!user) return;
    const TIER_ORDER: TierId[] = ["beginner", "intermediate", "orator"];
    (window as any).speakbold = {
      placement: (tier: string) => {
        if (!TIER_ORDER.includes(tier as TierId)) {
          console.warn('[SpeakBold] Invalid tier. Use "beginner", "intermediate", or "orator".');
          return;
        }
        applyPlacement(tier as TierId);
        localStorage.setItem(`speakbold:placement-skipped:${user.id}`, "1");
        supabase.from("profiles").update({ placement_done: true }).eq("id", user.id);
        setPlacementSkipped(true);
        console.log(`[SpeakBold] Placed into: ${tier}`);
      },
      resetPlacement: () => {
        localStorage.removeItem(`speakbold:placement-skipped:${user.id}`);
        supabase.from("profiles").update({ placement_done: false }).eq("id", user.id);
        const fresh: Record<string, NodeStatus> = {};
        ALL_LESSONS.forEach((l, i) => { fresh[l.id] = i === 0 ? "available" : "locked"; });
        debugSetProgress(fresh);
        setPlacementSkipped(false);
        setPlacementChecked(true);
        setPlacementTestOpen(false);
        console.log("[SpeakBold] Progress cleared — placement gate will reappear.");
      },
      showPlacement: () => {
        localStorage.removeItem(`speakbold:placement-skipped:${user.id}`);
        supabase.from("profiles").update({ placement_done: false }).eq("id", user.id);
        setPlacementSkipped(false);
        setPlacementChecked(true);
        setPlacementTestOpen(true);
        console.log("[SpeakBold] Placement test opened.");
      },
      progress: () => {
        console.table(
          ALL_LESSONS.map(l => ({ id: l.id, title: l.title, status: getNodeStatus(l.id) }))
        );
      },
      completeAll: () => {
        const all: Record<string, NodeStatus> = {};
        ALL_LESSONS.forEach(l => { all[l.id] = "completed"; });
        debugSetProgress(all);
        console.log("[SpeakBold] All lessons marked completed.");
      },
      completeUpTo: (tier: string) => {
        if (!TIER_ORDER.includes(tier as TierId)) {
          console.warn('[SpeakBold] Invalid tier. Use "beginner", "intermediate", or "orator".');
          return;
        }
        const tierChapters = chapters.filter(c => c.tier === (tier as TierId));
        const entryId = tierChapters[0]?.lessons[0]?.id;
        const entryIndex = ALL_LESSONS.findIndex(l => l.id === entryId);
        const map: Record<string, NodeStatus> = {};
        ALL_LESSONS.forEach((l, i) => {
          map[l.id] = i < entryIndex ? "completed" : i === entryIndex ? "available" : "locked";
        });
        debugSetProgress(map);
        console.log(`[SpeakBold] Completed all drills before ${tier} tier — entry is now ${entryId}.`);
      },
      help: () => {
        console.log(
          `SpeakBold debug — available commands:\n` +
          `  window.speakbold.placement('beginner'|'intermediate'|'orator')    force-place to a tier\n` +
          `  window.speakbold.resetPlacement()                                  clear all progress + re-show placement\n` +
          `  window.speakbold.showPlacement()                                   open placement overlay now\n` +
          `  window.speakbold.progress()                                        print lesson status table\n` +
          `  window.speakbold.completeAll()                                     mark every lesson completed\n` +
          `  window.speakbold.completeUpTo('beginner'|'intermediate'|'orator')  complete all drills before a tier\n` +
          `  window.passDrill()                                                  (inside a drill) auto-pass it`
        );
      },
    };
    console.log("[SpeakBold] Debug console ready — type window.speakbold.help() for commands.");
    return () => { delete (window as any).speakbold; };
  }, [user, applyPlacement, debugSetProgress, getNodeStatus, chapters]);

  const handlePlace = (tier: TierId) => {
    applyPlacement(tier);
    if (user) {
      localStorage.setItem(`speakbold:placement-skipped:${user.id}`, "1");
      supabase.from("profiles").update({ placement_done: true }).eq("id", user.id);
    }
    setPlacementSkipped(true);
    setPlacementTestOpen(false);
  };

  const handleSkipPlacement = () => {
    if (user) {
      localStorage.setItem(`speakbold:placement-skipped:${user.id}`, "1");
      supabase.from("profiles").update({ placement_done: true }).eq("id", user.id);
    }
    setPlacementSkipped(true);
    setPlacementTestOpen(false);
  };

  // Derive current drill (first available across all chapters)
  const currentDrill = useMemo(() => {
    for (let ci = 0; ci < chapters.length; ci++) {
      const chapter = chapters[ci];
      for (const lesson of chapter.lessons) {
        if (getNodeStatus(lesson.id) === "available") return { lesson, chapter, chapterIndex: ci };
      }
    }
    return null;
  }, [chapters, getNodeStatus]);

  // Path is "finished" when nothing is left to do — every node is completed or
  // tested past. Placed users can finish their tier without grinding all 19.
  const pathComplete = useMemo(
    () => chapters.length > 0 && chapters.every(c =>
      c.lessons.every(l => {
        const s = getNodeStatus(l.id);
        return s === "completed" || s === "tested-out";
      })
    ),
    [chapters, getNodeStatus]
  );

  // A fresh user must resolve placement — take the test or explicitly skip —
  // before the pathway becomes accessible. Anyone who has already been placed
  // or made any progress is past the gate.
  const placedAlready = useMemo(
    () => Object.values(progress).some((s) => s === "completed" || s === "tested-out"),
    [progress],
  );
  const needsPlacement = !!user && !placementSkipped && !placedAlready;
  // Wait for the server placement check before first paint — but only when it
  // could still flip the decision (not locally resolved, not already placed).
  const awaitingPlacementCheck = !!user && !placementChecked && !placementSkipped && !placedAlready;

  if (loading || awaitingPlacementCheck) {
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
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-primary/3 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/3 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      <SiteHeader />

      {needsPlacement ? (
        // Gate: pathway is inaccessible until placement is taken or skipped.
        // While the test modal is open we render nothing here (it covers the
        // screen); cancelling the test returns to the gate, not the pathway.
        placementTestOpen ? null : (
          <PlacementGate
            userName={user?.email?.split("@")[0] || "Speaker"}
            onTakeTest={() => setPlacementTestOpen(true)}
            onSkip={handleSkipPlacement}
          />
        )
      ) : (
        <>
      {/* Hero with Next-Drill CTA */}
      <section className="px-4 md:container pt-20 md:pt-44 pb-8 lg:pb-16 relative z-10">

        <NextDrillHero
          currentDrill={currentDrill}
          onJumpIn={() => currentDrill && setActiveDrill(currentDrill.lesson)}
          completePct={progressPercent}
          completedCount={completedCount}
          totalLessons={totalLessons}
          streakDays={streakDays}
        />
      </section>

      {/* Chapter stack */}
      <section id="pathway-units" className="px-4 md:container max-w-4xl mx-auto pb-32 lg:pb-40 relative z-10 space-y-16 lg:space-y-28">
        {TIERS.map((tier) => {
          const tierChapters = chapters.filter(c => c.tier === tier.id);
          if (!tierChapters.length) return null;

          const tierLessons = tierChapters.flatMap(c => c.lessons);
          const isDone = (id: string) => {
            const s = getNodeStatus(id);
            return s === "completed" || s === "tested-out";
          };
          const tierDone = tierLessons.filter(l => isDone(l.id)).length;
          const tierLocked = tierLessons.every(l => getNodeStatus(l.id) === "locked");

          return (
            <div key={tier.id} className="space-y-12 lg:space-y-20">
              <TierHeader tier={tier} done={tierDone} total={tierLessons.length} locked={tierLocked} />

              {tierChapters.map((chapter) => {
                const ci = chapters.indexOf(chapter);
                const isComplete = chapter.lessons.every(l => isDone(l.id));
                const isLocked = chapter.lessons.every(l => getNodeStatus(l.id) === "locked");
                const isCurrent = !isComplete && !isLocked;

                return (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    index={ci}
                    isCurrent={isCurrent}
                    isComplete={isComplete}
                    isLocked={isLocked}
                    currentDrillId={currentDrill?.lesson.id || null}
                    getNodeStatus={getNodeStatus}
                    getScoreHistory={getScoreHistory}
                    onNodeClick={setActiveDrill}
                  />
                );
              })}
            </div>
          );
        })}

        {pathComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 mt-10 space-y-10"
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
        </>
      )}

      <AnimatePresence>
        {activeDrill && activeDrill.type === "debate" && (
          <DebateBattle
            key={activeDrill.id}
            prompt={activeDrill.prompt}
            userStand={activeDrill.stance ?? "FOR"}
            opponent={makeDebateOpponent(activeDrill.personaSkill)}
            userElo={arenaProfile?.elo ?? STARTING_ELO}
            onClose={() => setActiveDrill(null)}
            onComplete={() => { completeLesson(activeDrill.id); setActiveDrill(null); }}
            completeDuel={completeDuel}
            handleForfeit={handleForfeit}
            // Curriculum mode: forfeit shows "Leave this drill?" with no ELO
            // penalty, and judging skips completeDuel so the match doesn't
            // count toward Arena ELO. Lesson completion is handled by the
            // onComplete callback above.
            mode="pathway"
          />
        )}
        {activeDrill && activeDrill.type !== "debate" && activeDrill.type !== "duel" && (
          <LessonDrill
            lesson={activeDrill}
            onClose={() => setActiveDrill(null)}
            onComplete={(score) => { completeLesson(activeDrill.id, score); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {placementTestOpen && (
          <PlacementTest
            userName={user?.email?.split("@")[0] || "Speaker"}
            onPlace={handlePlace}
            onSkip={() => { setPlacementTestOpen(false); }}
          />
        )}
      </AnimatePresence>

      {/* Chapter-complete celebration overlay — fires once per chapter
          transition (see the effect above for the detection logic). */}
      <ChapterCelebration
        open={!!celebrated}
        chapterName={celebrated?.name ?? ""}
        chapterIndex={celebrated ? chapters.indexOf(celebrated) : 0}
        level={celebrated?.level ?? ""}
        color={celebrated?.color ?? "hsl(var(--primary))"}
        drillCount={celebrated?.lessons.length ?? 0}
        unlockedTier={unlockedTierName}
        onClose={() => setCelebrated(null)}
      />
    </main>
  );
};

export default Pathway;
