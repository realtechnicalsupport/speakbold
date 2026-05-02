import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Check, 
  ChevronRight, 
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Mic,
  MicOff,
  Trophy,
  ArrowRight,
  Volume2,
  Clock,
  Target,
  Zap,
  Sparkles,
  Loader2,
  FolderOpen,
  Trash2,
  Download,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { toast } from "@/hooks/use-toast";
import { generateSpeakingDrills, type SpeakingDrill as AISpeakingDrill } from "@/services/geminiService";

type Context = "small" | "large" | "stage" | "virtual";

const CONTEXTS: { id: Context; label: string; desc: string }[] = [
  { id: "small", label: "Small meeting", desc: "Under 20 people" },
  { id: "large", label: "Conference room", desc: "20-100 people" },
  { id: "stage", label: "Large event", desc: "100+ people" },
  { id: "virtual", label: "Virtual / video", desc: "On screen" },
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

interface SavedRecording {
  id: string;
  drillId: string;
  drillTitle: string;
  blob: Blob;
  url: string;
  timestamp: number;
  duration: number;
  attemptNumber: number;
}

const RECORDINGS_STORAGE_KEY = "speakbold:speaking-recordings";

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

const CommonMistake = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
    <div className="text-sm text-foreground/90">{children}</div>
  </div>
);

const PublicSpeaking = () => {
  // Drills state (includes AI generated drills)
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
  const [aiCount, setAiCount] = useState(2);

  // Saved recordings state
  const [savedRecordings, setSavedRecordings] = useState<SavedRecording[]>([]);
  
  // Timer state
  const [duration, setDuration] = useState(DEFAULT_DRILLS[0].duration);
  const [seconds, setSeconds] = useState(DEFAULT_DRILLS[0].duration);
  const [running, setRunning] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const idRef = useRef<number | null>(null);
  const hasStartedRef = useRef<boolean>(false);
  const wasRunningRef = useRef<boolean>(false);
  
  // Recorder refs
  const recorderStartRef = useRef<() => void>();
  const recorderPauseRef = useRef<() => void>();
  const recorderResumeRef = useRef<() => void>();
  const recorderStopRef = useRef<() => void>();
  
  const { user } = useAuth();
  const { upload: uploadRecording, refresh: refreshRecordings } = useRecordings();
  const { markPracticed } = useSyncedStreak();
  
  const current = drills[activeDrill];

  // Load saved recordings from localStorage
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        const stored = localStorage.getItem(RECORDINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const recs: SavedRecording[] = await Promise.all(
            parsed.map(async (r: SavedRecording & { blobData: string }) => {
              const response = await fetch(r.blobData);
              const blob = await response.blob();
              return {
                ...r,
                blob,
                url: URL.createObjectURL(blob),
              };
            })
          );
          setSavedRecordings(recs);
        }
      } catch (error) {
        console.error("Failed to load recordings:", error);
      }
    };
    loadRecordings();
  }, []);

  // Save recordings to localStorage
  const saveRecordingsToStorage = useCallback(async (recs: SavedRecording[]) => {
    try {
      const dataToStore = await Promise.all(
        recs.map(async (r) => {
          const reader = new FileReader();
          const blobData = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(r.blob);
          });
          return {
            id: r.id,
            drillId: r.drillId,
            drillTitle: r.drillTitle,
            timestamp: r.timestamp,
            duration: r.duration,
            attemptNumber: r.attemptNumber,
            blobData,
          };
        })
      );
      localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error("Failed to save recordings:", error);
    }
  }, []);

  // Get recordings for current drill
  const currentDrillRecordings = savedRecordings
    .filter((r) => r.drillId === current?.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Delete a recording
  const deleteRecording = (recordingId: string) => {
    const recording = savedRecordings.find((r) => r.id === recordingId);
    if (recording) {
      URL.revokeObjectURL(recording.url);
    }
    const updated = savedRecordings.filter((r) => r.id !== recordingId);
    setSavedRecordings(updated);
    saveRecordingsToStorage(updated);
  };

  // Download a recording
  const downloadRecording = (recording: SavedRecording) => {
    const a = document.createElement("a");
    a.href = recording.url;
    a.download = `Speaking-${recording.drillTitle.replace(/[^a-z0-9]/gi, '_')}-Attempt${recording.attemptNumber}.webm`;
    a.click();
  };

  // AI Drill Generation
  const generateAIDrills = async () => {
    setIsGenerating(true);
    try {
      const newDrills = await generateSpeakingDrills(aiFocus, aiCount);
      
      // Convert AI drills to our format
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
        title: "Drills generated",
        description: `Added ${formattedDrills.length} new AI-generated drills.`,
      });
    } catch (error) {
      console.error("Failed to generate drills:", error);
      toast({
        title: "Generation failed",
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

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = duration > 0 ? (seconds / duration) * 100 : 0;
  const completedCount = completedDrills.size;

  return (
    <TrackShell
      eyebrow="Public Speaking - 6 drills"
      title={
        <>
          Train the skills that make talks <em className="text-primary not-italic">land.</em>
        </>
      }
      intro="Six focused drills on hooks, structure, pause, pace, energy, and the close. Each one is timed practice - record yourself, listen back, improve."
    >
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Drills completed</span>
          <span className="text-sm font-medium">{completedCount}/{drills.length} mastered</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(completedCount / drills.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Context selector */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">What&apos;s your speaking context?</p>
        <div className="flex flex-wrap gap-2">
          {CONTEXTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setContext(c.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm border transition-colors",
                context === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Adjusting guidance for {CONTEXTS.find((c) => c.id === context)?.desc.toLowerCase()}
        </p>
      </div>

      <CommonMistake>
        Filler words (&quot;um&quot;, &quot;like&quot;) destroy credibility. If you pause instead, you&apos;re powerful.
      </CommonMistake>

      <div className="grid lg:grid-cols-[1fr_420px] gap-10 mt-6">
        {/* Drills list */}
        <div className="space-y-4">
          {drills.map((drill, i) => {
            const isActive = activeDrill === i;
            const isCompleted = completedDrills.has(drill.id);
            
            return (
              <article
                key={drill.id}
                className={cn(
                  "border rounded-2xl overflow-hidden transition-all",
                  isActive 
                    ? "bg-card-gradient border-primary/40 shadow-soft" 
                    : "bg-card border-border hover:border-foreground/30",
                )}
              >
                <button
                  onClick={() => setActiveDrill(i)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "grid place-items-center h-10 w-10 rounded-full font-display text-lg font-semibold shrink-0",
                      isCompleted ? "bg-green-500/10 text-green-600" : "bg-muted"
                    )}>
                      {isCompleted ? <Check className="h-5 w-5" /> : i + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-xl md:text-2xl font-semibold">{drill.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {drill.duration}s
                        </span>
                        {isCompleted && (
                          <span className="text-xs text-green-600 font-medium">Completed</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-5 w-5 transition-transform shrink-0",
                      isActive ? "rotate-90 text-primary" : "text-muted-foreground",
                    )}
                  />
                </button>
                
                {isActive && (
                  <div className="px-6 pb-7 space-y-6 animate-fade-in">
                    {/* Objective */}
                    <div className="bg-muted/30 rounded-xl p-4">
                      <p className="text-xs uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                        <Target className="h-3.5 w-3.5" />
                        Objective
                      </p>
                      <p className="text-foreground/90 leading-relaxed">{drill.objective}</p>
                    </div>

                    {/* Instructions */}
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Instructions</p>
                      <ol className="space-y-2">
                        {drill.instructions.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-foreground/85">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Prompt */}
                    <div className="border-l-2 border-primary pl-4">
                      <p className="text-xs uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                        <Volume2 className="h-3.5 w-3.5" />
                        Your prompt
                      </p>
                      <p className="font-display text-lg italic leading-relaxed">{drill.prompt}</p>
                    </div>

                    {/* Context-specific guidance */}
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2 flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5" />
                        In a {context === "small" ? "small room" : context === "large" ? "large room" : context === "stage" ? "large event" : "virtual setting"}:
                      </p>
                      <p className="text-sm text-foreground/90">{drill.contexts[context]}</p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Practice panel - sticky sidebar */}
        <aside className="lg:sticky lg:top-24 self-start space-y-6">
          {/* Timer and controls */}
          <div className="relative bg-card-gradient border border-border rounded-3xl p-6 overflow-hidden">
            <div
              className="absolute top-0 left-0 h-1 bg-warm transition-all duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
            
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Drill {activeDrill + 1}: {current.title}
              </p>
              <span className="font-mono tabular-nums text-5xl font-bold">
                {mins}:{String(secs).padStart(2, "0")}
              </span>
            </div>

            {/* Timer presets */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
              {[30, 45, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => { setDuration(d); setSeconds(d); setRunning(false); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border transition-colors",
                    duration === d
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>

            {/* Control buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              {!running ? (
                <Button
                  variant="hero"
                  size="lg"
                  onClick={() => {
                    if (seconds === 0) setSeconds(duration);
                    setRunning(true);
                    if (pausedAt) setPausedAt(null);
                    hasStartedRef.current = true;
                  }}
                >
                  <Play className="h-4 w-4" />
                  {hasStartedRef.current ? "Resume" : "Start Drill"}
                </Button>
              ) : (
                <Button variant="hero" size="lg" onClick={() => { setRunning(false); setPausedAt(Date.now()); }}>
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              )}
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => { 
                  recorderStopRef.current?.(); 
                  setSeconds(duration); 
                  setRunning(false); 
                  setPausedAt(null); 
                  wasRunningRef.current = false; 
                  hasStartedRef.current = false; 
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>

            {seconds === 0 && (
              <div className="mt-5 flex items-center justify-center gap-2 text-primary font-semibold animate-fade-in">
                <Trophy className="h-5 w-5" />
                <span>Drill complete! Review your recording.</span>
              </div>
            )}

            {/* Recording toggle */}
            <div className="mt-6 pt-5 border-t border-border flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                {!user ? (
                  <MicOff className="h-5 w-5 text-muted-foreground/50 mt-0.5" />
                ) : recordEnabled ? (
                  <Mic className="h-5 w-5 text-primary mt-0.5" />
                ) : (
                  <MicOff className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">Record drill</p>
                  {!user ? (
                    <p className="text-xs text-muted-foreground">
                      <Link to="/login" className="text-primary hover:underline">Sign in</Link> to save
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Auto-syncs with timer</p>
                  )}
                </div>
              </div>
              <Switch 
                checked={recordEnabled} 
                onCheckedChange={setRecordEnabled} 
                aria-label="Toggle recording"
                disabled={!user}
              />
            </div>
          </div>

          {/* Recorder panel */}
          {recordEnabled && (
            <div className="animate-fade-in">
              <RecorderPanel
                label="Recording your drill"
                hint="Mic activates when you hit Start."
                externalRunning={running}
                recorderStartRef={(fn) => { recorderStartRef.current = fn; }}
                recorderPauseRef={(fn) => { recorderPauseRef.current = fn; }}
                recorderResumeRef={(fn) => { recorderResumeRef.current = fn; }}
                recorderStopRef={(fn) => { recorderStopRef.current = fn; }}
                onRecorded={async ({ blob, durationMs }) => {
                  markPracticed();
                  if (!user) {
                    toast({
                      title: "Recording captured",
                      description: "Sign in to save it to your account.",
                    });
                    return;
                  }
                  const saved = await uploadRecording(blob, {
                    promptText: `Speaking Drill: ${current.title}`,
                    difficulty: "Medium",
                    durationMs,
                    targetSeconds: duration,
                  });
                  toast({
                    title: saved ? "Recording saved" : "Save failed",
                    description: saved
                      ? "Synced to your account."
                      : "We couldn't upload your recording.",
                  });
                }}
              />
            </div>
          )}

          {/* Self-review checklist */}
          <div className="border border-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Self-review checklist</p>
            <ul className="space-y-2 text-sm">
              {current.selfReviewQuestions.map((q) => (
                <li key={q} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground/85">{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setActiveDrill(a => Math.max(0, a - 1))}
              disabled={activeDrill === 0}
            >
              Previous
            </Button>
            <Button 
              variant="hero" 
              className="flex-1"
              onClick={() => setActiveDrill(a => Math.min(drills.length - 1, a + 1))}
              disabled={activeDrill === drills.length - 1}
            >
              Next drill
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <CommonMistake>
            A pause that&apos;s 3+ seconds in a small meeting feels like you forgot your line. Match room size.
          </CommonMistake>

          <Button variant="outline" className="w-full" asChild>
            <Link to="/tracks/impromptu">Try the impromptu drills</Link>
          </Button>
        </aside>
      </div>
    </TrackShell>
  );
};

export default PublicSpeaking;
