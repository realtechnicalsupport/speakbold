import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { RecordingsList } from "@/components/RecordingsList";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Check, 
  ChevronRight, 
  Play,
  Pause,
  RotateCcw,
  Mic,
  MicOff,
  Trophy,
  Volume2,
  Clock,
  Target,
  Zap,
  Sparkles,
  Loader2,
  X,
  RefreshCw,
  ShieldCheck,
  ZapOff,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { RecordingFeedbackModal } from "@/components/RecordingFeedback";
import { toast } from "@/hooks/use-toast";
import { generateSpeakingDrills, type SpeakingDrill as AISpeakingDrill } from "@/services/geminiService";
import { setTimerActive, setTimerSeconds } from "@/lib/timerState";
import { setRecordingActive } from "@/lib/recordingState";
import { motion, AnimatePresence } from "framer-motion";

type Context = "small" | "large" | "stage" | "virtual";

const CONTEXTS: { id: Context; label: string; desc: string }[] = [
  { id: "small", label: "INTIMATE", desc: "Small meeting context" },
  { id: "large", label: "STRATEGIC", desc: "Boardroom / Conference" },
  { id: "stage", label: "COMMAND", desc: "Large audience event" },
  { id: "virtual", label: "DIGITAL", desc: "Virtual / Screen context" },
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
    title: "Energy Calibration",
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

const PublicSpeaking = () => {
  const [drills, setDrills] = useState<Drill[]>(DEFAULT_DRILLS);
  const [activeDrill, setActiveDrill] = useState(0);
  const [context, setContext] = useState<Context>("large");
  const [completedDrills, setCompletedDrills] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("speakbold:speaking-completed");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [recordEnabled, setRecordEnabled] = useState(false);

  // AI generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiFocus, setAiFocus] = useState("Vocal Variety");
  
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

  // AI Drill Generation
  const generateAIDrills = async () => {
    setIsGenerating(true);
    try {
      const newDrills = await generateSpeakingDrills(aiFocus, 2);
      const formattedDrills: Drill[] = newDrills.map((d, idx) => ({
        id: `ai-drill-${Date.now()}-${idx}`,
        title: d.title,
        duration: d.duration,
        objective: d.objective,
        instructions: d.steps,
        prompt: d.prompt,
        selfReviewQuestions: d.selfReviewQuestions,
        contexts: {
          small: "Adapt this drill for an intimate setting with direct eye contact.",
          large: "Project your voice and use larger gestures for a conference room.",
          stage: "Full commitment - your energy must reach the back row.",
          virtual: "Stay close to camera, slightly elevated energy.",
        },
        isAI: true,
      }));

      setDrills(prev => [...prev, ...formattedDrills]);
      toast({
        title: "Protocol Synthesized",
        description: `Added ${formattedDrills.length} new AI-generated drills.`,
      });
    } catch (error) {
      toast({
        title: "Synthesis failed",
        description: "Could not generate drills. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

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

  return (
    <TrackShell
      eyebrow="MODULE 01 — PERFORMANCE"
      title={
        <>
          Train the skills that make talks <span className="text-primary italic">land.</span>
        </>
      }
      intro="Focused drills on hooks, structure, pause, and pace. Each session is a timed operational drill. Record, audit, and evolve your presence."
      hideHeader={running || pausedAt !== null}
    >
      {/* Background Decorative Drifting Glow */}
      <div className="absolute top-[20%] right-[10%] w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-primary/5 rounded-full blur-[120px] animate-float opacity-30 pointer-events-none" />

      <div className="grid lg:grid-cols-[1fr_400px] gap-6 lg:gap-12 relative z-10">
        <div className="space-y-6 md:space-y-10 min-w-0">
          {/* Progress Section */}
          <div className="bg-muted/5 border border-border/60 rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 flex items-center justify-between shadow-soft overflow-hidden">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40">OPERATIONAL MASTERY</p>
              <h3 className="speak-serif text-xl md:text-3xl">{completedCount} / {drills.length} <span className="opacity-40 italic text-sm md:text-base block md:inline mt-1 md:mt-0">drills completed</span></h3>
            </div>
            <div className="h-16 w-16 rounded-full border-4 border-muted flex items-center justify-center relative">
               <svg className="absolute inset-0 h-full w-full -rotate-90">
                 <circle
                   cx="32"
                   cy="32"
                   r="28"
                   fill="none"
                   stroke="currentColor"
                   strokeWidth="4"
                   className="text-primary"
                   strokeDasharray={176}
                   strokeDashoffset={176 - (176 * (completedCount / drills.length))}
                   strokeLinecap="round"
                 />
               </svg>
               <span className="text-xs font-bold">{Math.round((completedCount / drills.length) * 100)}%</span>
            </div>
          </div>

          {/* Drills List */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] opacity-40 mb-8">
              <Target className="h-3 w-3" />
              AVAILABLE PROTOCOLS
            </div>
            {drills.map((drill, i) => {
              const isActive = activeDrill === i;
              const isCompleted = completedDrills.has(drill.id);
              
              return (
                <motion.article
                  key={drill.id}
                  initial={false}
                  className={cn(
                    "border rounded-2xl md:rounded-[2.5rem] transition-all duration-500 overflow-hidden group",
                    isActive 
                      ? "bg-muted/10 border-primary/40 shadow-glow shadow-primary/5" 
                      : "bg-muted/5 border-border/60 hover:border-primary/20",
                  )}
                >
                  <button
                    onClick={() => setActiveDrill(isActive ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 md:gap-6 p-5 md:p-8 text-left"
                  >
                    <div className="flex items-center gap-4 md:gap-6 min-w-0">
                      <div className={cn(
                        "h-10 w-10 md:h-14 md:w-14 shrink-0 rounded-full flex items-center justify-center font-sans-bold text-base md:text-lg border-2 transition-all duration-500 italic",
                        isCompleted ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border/60 text-foreground/40 group-hover:border-primary/30"
                      )}>
                        {isCompleted ? <Check className="h-6 w-6" /> : i + 1}
                      </div>
                      <div>
                        <h3 className={cn(
                          "speak-serif text-xl md:text-3xl transition-colors truncate",
                          isActive ? "text-primary" : "text-foreground"
                        )}>{drill.title}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {drill.duration}S TARGET
                          </span>
                          {drill.isAI && (
                            <span className="text-[11px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="h-2 w-2" /> AI GEN
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "h-6 w-6 transition-transform duration-500",
                      isActive ? "rotate-90 text-primary" : "opacity-20",
                    )} />
                  </button>
                  
                  <AnimatePresence>
                    {isActive && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-5 md:p-8 pt-0 space-y-6 md:space-y-10"
                      >
                        <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                           <div className="space-y-4">
                              <p className="text-xs font-black uppercase tracking-widest opacity-40">OBJECTIVE</p>
                              <p className="text-lg font-medium tracking-tight opacity-70 leading-relaxed italic border-l border-primary/30 pl-6">
                                "{drill.objective}"
                              </p>
                           </div>
                           <div className="space-y-4">
                              <p className="text-xs font-black uppercase tracking-widest opacity-40">EXECUTION STEPS</p>
                              <ul className="space-y-3">
                                {drill.instructions.map((step, idx) => (
                                  <div key={idx} className="bg-background/50 border border-border/60 rounded-lg md:rounded-xl p-3 md:p-4 text-xs font-medium opacity-60 flex items-start gap-3">
                                    <span className="text-primary">✱</span>
                                    {step}
                                  </div>
                                ))}
                              </ul>
                           </div>
                        </div>

                        <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 space-y-4 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-6 opacity-5">
                              <Volume2 className="h-16 w-16" />
                           </div>
                           <p className="text-xs font-black uppercase tracking-widest text-primary">OPERATIONAL PROMPT</p>
                           <p className="speak-serif text-xl md:text-2xl italic leading-relaxed">"{drill.prompt}"</p>
                        </div>

                        <div className="p-5 md:p-10 rounded-2xl md:rounded-[3rem] bg-muted/5 border border-border/60 relative overflow-hidden group">
                           <p className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                              <Zap className="h-3 w-3 text-primary" />
                              {CONTEXTS.find(c => c.id === context)?.label} CONTEXT GUIDANCE
                           </p>
                           <p className="text-base md:text-lg font-medium opacity-60 leading-relaxed max-w-2xl">{drill.contexts[context]}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </div>

          {/* AI Generator Panel */}
          <div className="p-5 md:p-10 rounded-2xl md:rounded-[3rem] bg-gradient-to-br from-primary/[0.05] to-accent/[0.05] border border-primary/20 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <RefreshCw className="h-24 w-24 animate-spin-slow" />
             </div>
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
                <div className="space-y-4">
                   <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-primary">
                      <Sparkles className="h-4 w-4" />
                      SYNTHESIS ENGINE
                   </div>
                   <h3 className="speak-serif text-3xl">Generate Custom Protocols</h3>
                   <div className="flex flex-wrap gap-4 pt-4">
                      {["Vocal Variety", "Body Language", "Structure", "Storytelling"].map(f => (
                        <button 
                          key={f}
                          onClick={() => setAiFocus(f)}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all",
                            aiFocus === f ? "bg-primary text-white border-primary shadow-glow" : "border-border/60 opacity-40 hover:opacity-100"
                          )}
                        >
                          {f}
                        </button>
                      ))}
                   </div>
                </div>
                <button
                  onClick={generateAIDrills}
                  disabled={isGenerating}
                  className="button-pill py-3 px-6 md:py-5 md:px-10 bg-primary text-white shadow-glow group/btn w-full md:w-auto"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] animate-pulse">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      SYNTHESIZING...
                    </span>
                  ) : (
                    <span className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em]">
                       INITIALIZE GENERATION
                       <ChevronRight className="h-5 w-5 md:h-6 md:w-6 shrink-0 opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
                    </span>
                  )}
                </button>
             </div>
          </div>
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
                <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">OPERATIONAL TIMER</p>
                <div className="speak-serif text-5xl md:text-6xl lg:text-8xl font-bold tracking-tighter italic tabular-nums">
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
                      <span className="text-sm font-black uppercase tracking-[0.2em]">{hasStartedRef.current ? "RESUME DRILL" : "START PROTOCOL"}</span>
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
                  onClick={() => { 
                    recorderStopRef.current?.(); 
                    setSeconds(duration); 
                    setRunning(false); 
                    setPausedAt(null); 
                    wasRunningRef.current = false; 
                    hasStartedRef.current = false; 
                  }}
                  className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-opacity"
                >
                  <RotateCcw className="h-3 w-3" />
                  RESET DRILL
                </button>
              </div>

              {/* Context Selector */}
              <div className="space-y-6 pt-6 border-t border-border/60">
                 <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">SELECT CONTEXT</p>
                 <div className="grid grid-cols-2 gap-3">
                    {CONTEXTS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setContext(c.id)}
                        className={cn(
                          "py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all",
                          context === c.id ? "bg-primary text-white border-primary shadow-glow" : "border-border/60 opacity-40 hover:opacity-100"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                 </div>
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
                    <p className="text-[11px] font-bold opacity-30 uppercase tracking-widest">{recordEnabled ? "ACTIVE" : "DISABLED"}</p>
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
                        promptText: `Speaking Drill: ${current.title}`,
                        difficulty: "Medium",
                        type: "drill"
                      });
                    }
                  }}
                />
              </div>
            )}

            {/* Audit Trigger */}
            <AnimatePresence>
               {seconds === 0 && (
                 <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="p-8 rounded-[2.5rem] bg-primary text-white shadow-glow flex flex-col items-center text-center gap-6"
                 >
                   <Trophy className="h-10 w-10 animate-bounce" />
                   <div className="space-y-2">
                      <h4 className="speak-serif text-2xl italic">Drill Complete</h4>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80">INITIALIZE PERFORMANCE AUDIT</p>
                   </div>
                   <button className="w-full py-4 bg-white text-primary rounded-full text-xs font-black uppercase tracking-[0.3em]">
                      VIEW RESULTS
                   </button>
                 </motion.div>
               )}
            </AnimatePresence>

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

export default PublicSpeaking;
