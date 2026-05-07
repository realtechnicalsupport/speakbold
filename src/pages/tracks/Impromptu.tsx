import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shuffle, Play, Pause, RotateCcw, Lightbulb, EyeOff, Mic, MicOff, Sparkles, Loader2, FolderOpen, RefreshCw, ShieldCheck, Zap, ArrowRight, Target, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PromptAuthor, type CustomPrompt, type Difficulty, type Prompt } from "@/components/PromptAuthor";
import { RecordingsList } from "@/components/RecordingsList";
import { RecordingFeedbackModal } from "@/components/RecordingFeedback";
import { PromptLibrary, type LibraryEntry } from "@/components/PromptLibrary";
import { FloatingTimer } from "@/components/FloatingTimer";
import { useSyncedPrompts } from "@/hooks/useSyncedPrompts";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { setTimerActive, useTimerActive } from "@/lib/timerState";
import { setRecordingActive } from "@/lib/recordingState";
import { generateImpromptuPrompts } from "@/services/geminiService";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const builtinId = (d: Difficulty, i: number) => `builtin:${d}:${i}`;

const FRAMEWORKS = [
  {
    name: "PREP",
    expanded: "Point · Reason · Example · Point",
    detail: "State your view. Why you hold it. A short story or stat. Restate the view.",
  },
  {
    name: "Past · Present · Future",
    expanded: "Where it was · Where it is · Where it's going",
    detail: "Perfect for opinions, trends, or any 'what do you think about X?' question.",
  },
  {
    name: "What · So What · Now What",
    expanded: "The fact · Why it matters · What to do",
    detail: "Great for reactions, news, and putting a recommendation on the table.",
  },
  {
    name: "Story Arc",
    expanded: "Setting · Conflict · Turning point · Lesson",
    detail: "Best for personal anecdotes — pulls the listener in fast.",
  },
];

const PROMPTS: Record<Difficulty, Prompt[]> = {
  Easy: [
    {
      text: "Talk about your favorite meal and why it matters to you.",
      framework: "Story Arc",
      points: ["Set the scene", "One memory", "Sensory detail", "What it represents"],
      example: []
    },
    {
        text: "Describe the room you grew up in.",
        framework: "Story Arc",
        points: ["Vivid detail", "Walk around", "Meaningful object", "Closing impact"],
        example: []
    }
  ],
  Medium: [
    {
      text: "Convince me that breakfast is the most important meal.",
      framework: "PREP",
      points: ["Sets tone", "Energy & Focus", "With vs without", "Compounding effect"],
      example: []
    }
  ],
  Hard: [
    {
      text: "If you ran the world for a day, what is the first law you'd pass?",
      framework: "What · So What · Now What",
      points: ["The law", "The problem", "The next morning"],
      example: []
    }
  ],
};

const Impromptu = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const { user } = useAuth();
  const {
    customPrompts,
    overrides,
    disabledIds,
    upsertCustomPrompt,
  } = useSyncedPrompts();
  const { upload: uploadRecording, refresh: refreshRecordings } = useRecordings("impromptu");
  const { markPracticed } = useSyncedStreak();
  const timerActive = useTimerActive();

  // AI prompt generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiCategory, setAiCategory] = useState("General");
  const [aiCount, setAiCount] = useState(3);

  const generateAIPrompts = async () => {
    setIsGenerating(true);
    try {
      const newPrompts = await generateImpromptuPrompts(aiCategory, aiCount);
      for (const p of newPrompts) {
        const customPrompt: CustomPrompt = {
          id: p.id,
          difficulty: "Medium",
          text: p.topic,
          framework: p.framework,
          points: p.frameworkSteps.map((s) => s.replace(/^(Point|Reason|Example|Past|Present|Future|Problem|Solution|Benefit)\s*[-–—]\s*/i, "").trim()),
          example: p.example || [],
        };
        upsertCustomPrompt(customPrompt);
      }
      toast({ title: "Prompts Synthesized", description: `Added ${newPrompts.length} new prompts.` });
    } catch (error) {
      toast({ title: "Synthesis failed", description: "Try again later.", variant: "destructive" });
    } finally { setIsGenerating(false); }
  };

  const entries = useMemo<LibraryEntry[]>(() => {
    const out: LibraryEntry[] = [];
    (Object.keys(PROMPTS) as Difficulty[]).forEach((d) => {
      PROMPTS[d].forEach((p, i) => {
        const id = builtinId(d, i);
        out.push({ id, source: "builtin", difficulty: d, prompt: p, enabled: !disabledIds.has(id), edited: false });
      });
    });
    customPrompts.forEach((cp) => {
      out.push({ id: cp.id, source: "custom", difficulty: cp.difficulty, prompt: { text: cp.text, framework: cp.framework, points: cp.points, example: cp.example }, enabled: !disabledIds.has(cp.id), edited: false, ai: cp.id.startsWith("ai-impromptu-") });
    });
    return out;
  }, [customPrompts, disabledIds]);

  const pool = useMemo<Record<Difficulty, Prompt[]>>(() => {
    const merged: Record<Difficulty, Prompt[]> = { Easy: [], Medium: [], Hard: [] };
    entries.forEach((e) => { if (e.enabled) merged[e.difficulty].push(e.prompt); });
    return merged;
  }, [entries]);

  const [prompt, setPrompt] = useState<Prompt>(PROMPTS.Medium[0]);
  const [duration, setDuration] = useState(60);
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [recordEnabled, setRecordEnabled] = useState(false);
  const idRef = useRef<number | null>(null);
  const wasRunningRef = useRef<boolean>(false);
  const hasStartedRef = useRef<boolean>(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  const recorderStartRef = useRef<() => void>();
  const recorderPauseRef = useRef<() => void>();
  const recorderResumeRef = useRef<() => void>();
  const recorderStopRef = useRef<() => void>();

  const shuffle = (d: Difficulty = difficulty) => {
    const list = pool[d];
    if (!list || list.length === 0) return;
    let next = prompt;
    let guard = 0;
    while (next.text === prompt.text && guard < 10) {
      next = list[Math.floor(Math.random() * list.length)];
      guard++;
    }
    setPrompt(next);
    setSeconds(duration);
    setRunning(false);
    setRevealed(false);
    setPausedAt(null);
    hasStartedRef.current = false;
  };

  useEffect(() => {
    setTimerActive(running || pausedAt !== null);
    return () => setTimerActive(false);
  }, [running, pausedAt]);

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
  }, [running, pausedAt, recordEnabled, refreshRecordings]);

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
  const suggestedFramework = FRAMEWORKS.find((f) => f.name === prompt.framework);

  return (
    <TrackShell
      eyebrow="MODULE 02 — IMPROMPTU"
      title={<>Sixty seconds. <span className="text-primary italic">No notes.</span></>}
      intro="The fastest way to build speaking confidence is to speak when you don't feel ready. Initialize a prompt, hit start, and talk until the timer ends."
      hideHeader={running || pausedAt !== null}
    >
      {/* Background Decorative Drifting Glow */}
      <div className="absolute top-[30%] left-[5%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/3 rounded-full blur-[140px] animate-float opacity-30 pointer-events-none" />

      <div className="grid lg:grid-cols-[1fr_400px] gap-6 lg:gap-12 relative z-10 w-full">
        <div className="space-y-4 md:space-y-10 min-w-0">
          {/* Difficulty Selectors */}
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {(Object.keys(PROMPTS) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); shuffle(d); }}
                className={cn(
                  "p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col items-center gap-2 group",
                  difficulty === d
                    ? "bg-primary border-primary text-white shadow-glow"
                    : "bg-muted/5 border-border/60 text-foreground/40 hover:border-primary/30 hover:text-foreground"
                )}
              >
                <span className="text-xs font-black uppercase tracking-[0.4em] mb-1">{d}</span>
                <div className="h-1 w-8 bg-current opacity-20 group-hover:opacity-100 transition-opacity rounded-full" />
              </button>
            ))}
          </div>

          {/* AI Generator Panel */}
          <div className="p-4 md:p-10 rounded-2xl md:rounded-[3rem] bg-muted/5 border border-border/60 relative overflow-hidden group min-w-0">
             <div className="absolute top-0 right-0 p-10 opacity-5">
                <Sparkles className="h-20 w-20 text-primary animate-pulse" />
             </div>
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
                <div className="space-y-6">
                   <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-primary">
                      <Zap className="h-4 w-4" />
                      SYNTHESIS ENGINE
                   </div>
                   <div className="space-y-2">
                      <h3 className="speak-serif text-2xl md:text-3xl truncate">Impromptu Generator</h3>
                      <p className="text-sm font-medium opacity-40 max-w-sm">Synthesize unique speaking prompts optimized for your skill level.</p>
                   </div>
                   <div className="flex flex-wrap gap-2 md:gap-4">
                      {["General", "Business", "Creative", "Philosophical"].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setAiCategory(cat)}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all",
                            aiCategory === cat ? "bg-primary text-white border-primary" : "border-border/60 opacity-40 hover:opacity-100"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                   </div>
                </div>
                <button
                  onClick={generateAIPrompts}
                  disabled={isGenerating}
                  className="button-pill py-3 px-6 md:py-5 md:px-10 bg-primary text-white shadow-glow group/btn w-full md:w-auto"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em]">
                       INITIALIZE
                       <Shuffle className="h-4 w-4 group-hover/btn:rotate-180 transition-transform duration-700" />
                    </span>
                  )}
                </button>
             </div>
          </div>

          {/* Active Prompt Card */}
          <motion.div 
            layout
            className="bg-muted/10 border border-primary/20 rounded-2xl md:rounded-[4rem] p-4 md:p-12 shadow-soft relative overflow-hidden group min-w-0"
          >
             <div className="grain pointer-events-none" />
             <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
                <Target className="h-24 w-24 md:h-48 md:w-48 text-primary" />
             </div>

             <div className="space-y-4 md:space-y-10 relative z-10 min-w-0">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3 md:gap-4 text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-primary opacity-60">
                      <Target className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                      PROTOCOL: {difficulty.toUpperCase()}
                   </div>
                   <button 
                    onClick={() => shuffle()}
                    className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted/20 transition-all group/shuffle"
                   >
                     <RefreshCw className="h-4 w-4 opacity-40 group-hover/shuffle:opacity-100 group-hover/shuffle:rotate-180 transition-all duration-700" />
                   </button>
                </div>

                <h2 className="speak-serif text-lg md:text-4xl lg:text-6xl leading-[1.2] tracking-tighter break-words">
                   "{prompt.text}"
                </h2>

                <AnimatePresence>
                  {revealed ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                       className="grid md:grid-cols-2 gap-6 md:gap-10 pt-6 md:pt-10 border-t border-border/60"
                    >
                       <div className="space-y-6">
                          <p className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-3">
                             <Lightbulb className="h-3 w-3" />
                             FRAMEWORK HINTS
                          </p>
                          <ul className="space-y-4">
                             {prompt.points.map((p, i) => (
                               <li key={i} className="flex gap-4 group">
                                  <span className="text-primary speak-serif text-xl opacity-40 group-hover:opacity-100 transition-opacity italic">{i+1}</span>
                                  <span className="text-sm font-medium tracking-tight opacity-60 group-hover:opacity-100 transition-opacity leading-relaxed">{p}</span>
                               </li>
                             ))}
                          </ul>
                       </div>
                       <div className="space-y-6">
                          <p className="text-xs font-black uppercase tracking-widest opacity-40">STRATEGIC LENS</p>
                          {suggestedFramework && (
                            <div className="p-4 md:p-8 rounded-xl md:rounded-[2rem] bg-muted/5 border border-border/60 space-y-3">
                               <p className="text-lg font-black tracking-widest text-primary italic">{suggestedFramework.name}</p>
                               <p className="text-xs font-medium opacity-40 leading-relaxed uppercase tracking-[0.2em]">{suggestedFramework.expanded}</p>
                               <p className="text-xs font-medium opacity-60 leading-relaxed">{suggestedFramework.detail}</p>
                            </div>
                          )}
                       </div>
                    </motion.div>
                  ) : (
                    <button 
                      onClick={() => setRevealed(true)}
                      className="w-full py-5 md:py-8 border-2 border-dashed border-border/60 rounded-2xl md:rounded-[3rem] text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-30 hover:opacity-100 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-3"
                    >
                       <EyeOff className="h-4 w-4" />
                       UNMASK STRATEGY HINTS
                    </button>
                  )}
                </AnimatePresence>
             </div>
          </motion.div>
          <RecordingsList />
        </div>

        {/* Sidebar Controls */}
        <aside className="space-y-6 md:space-y-8 relative z-10 min-w-0">
          <div className="sticky top-32 space-y-8">
            {/* Timer Panel */}
            <div className="bg-muted/5 border border-border/60 rounded-2xl md:rounded-[3rem] p-4 md:p-10 space-y-6 md:space-y-10 relative overflow-hidden shadow-soft min-w-0">
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
                <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">T-MINUS DRILL</p>
                <div className="speak-serif text-4xl md:text-7xl lg:text-8xl font-bold tracking-tighter italic tabular-nums">
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
                      <span className="text-sm font-black uppercase tracking-[0.2em]">{hasStartedRef.current ? "RESUME" : "INITIALIZE"}</span>
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
                  RESTART SEQUENCE
                </button>
              </div>

              {/* Duration Selectors */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-border/60">
                 {[30, 60, 90].map(d => (
                   <button
                    key={d}
                    onClick={() => { setDuration(d); setSeconds(d); setRunning(false); }}
                    className={cn(
                      "py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all",
                      duration === d ? "bg-primary text-white border-primary shadow-glow" : "border-border/60 opacity-40 hover:opacity-100"
                    )}
                   >
                     {d}S
                   </button>
                 ))}
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
                        promptText: `Impromptu: ${prompt.text}`,
                        difficulty: difficulty,
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

export default Impromptu;
