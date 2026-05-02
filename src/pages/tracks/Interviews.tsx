import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  ChevronRight, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw, 
  Shuffle, 
  Lightbulb, 
  EyeOff,
  Mic,
  MicOff,
  CheckCircle2,
  Clock,
  Target,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { toast } from "@/hooks/use-toast";

const CommonMistake = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
    <div className="text-sm text-foreground/90">{children}</div>
  </div>
);

interface Question {
  q: string;
  type: "Behavioural" | "Tell me about yourself" | "Strengths/Weaknesses" | "Why this role" | "Salary" | "Curveball";
  guidance: string;
  example: string;
  targetSeconds: number;
  difficulty: "Warm-up" | "Standard" | "Pressure";
  keyPoints: string[];
}

const QUESTIONS: Question[] = [
  {
    q: "Tell me about yourself.",
    type: "Tell me about yourself",
    guidance:
      "Use Present, Past, Future. One line on what you do now, two on the experience that built you, one on why this role is the natural next step. 60-90 seconds. No life story.",
    example:
      "I'm a product designer focused on fintech. The last four years I've shipped onboarding flows for two startups, taking one from a 38% to a 71% completion rate. I'm here because your team is solving the same problem at scale, and that's exactly the work I want to do next.",
    targetSeconds: 75,
    difficulty: "Warm-up",
    keyPoints: [
      "Present: what you do now (1 sentence)",
      "Past: key experience that built you (2 sentences)",
      "Future: why this role is your next step (1 sentence)",
    ],
  },
  {
    q: "Tell me about a time you failed.",
    type: "Behavioural",
    guidance:
      "STAR: Situation, Task, Action, Result. Pick a real failure with a clean lesson. Don't pick something fake-humble (\"I work too hard\"). Land on what you changed because of it.",
    example:
      "S: Led a launch with a team of five. T: Ship in eight weeks. A: I overpromised scope and didn't push back. R: We slipped two weeks and morale dropped. Since then I run a written scoping doc on day one, and I haven't missed a launch date in two years.",
    targetSeconds: 90,
    difficulty: "Standard",
    keyPoints: [
      "Situation: set the scene briefly",
      "Task: what were you responsible for",
      "Action: what YOU did (use 'I', not 'we')",
      "Result: numbers if possible, lesson always",
    ],
  },
  {
    q: "Tell me about a time you had a conflict with a coworker.",
    type: "Behavioural",
    guidance:
      "Show maturity, not blame. Describe the disagreement neutrally, the conversation you initiated, and the outcome. Focus on what you owned.",
    example:
      "An engineer and I disagreed on the scope of an MVP. I asked for a 30-minute session where we each wrote our top three priorities. Three of six matched. We shipped those, parked the rest. The feature went live in three weeks instead of eight.",
    targetSeconds: 90,
    difficulty: "Standard",
    keyPoints: [
      "Describe disagreement neutrally (no blame)",
      "Show initiative: you started the resolution",
      "Focus on what you owned or changed",
      "End with positive outcome",
    ],
  },
  {
    q: "What is your greatest strength?",
    type: "Strengths/Weaknesses",
    guidance:
      "One strength + one short proof + one outcome. Choose a strength relevant to the role. Avoid generic words like 'hardworking'.",
    example:
      "Translating messy customer feedback into a clear product spec. Last quarter I synthesised 200 support tickets into three feature bets — two of them shipped and lifted retention by 9%.",
    targetSeconds: 60,
    difficulty: "Warm-up",
    keyPoints: [
      "Name ONE specific strength (not generic)",
      "Provide proof: when did you use it?",
      "Show outcome: numbers or impact",
    ],
  },
  {
    q: "What is your greatest weakness?",
    type: "Strengths/Weaknesses",
    guidance:
      "Pick a real weakness, name how you noticed it, then the system you built to manage it. Never say 'perfectionist'.",
    example:
      "I used to over-prepare for meetings — I'd write five pages of notes and lose the thread live. I now write a single one-page brief with three bullets. Meetings are shorter and decisions land faster.",
    targetSeconds: 60,
    difficulty: "Standard",
    keyPoints: [
      "Name a REAL weakness (not humble-brag)",
      "How you noticed or got feedback",
      "The system you built to manage it",
      "Evidence it's working",
    ],
  },
  {
    q: "Why do you want to work here?",
    type: "Why this role",
    guidance:
      "Show you researched. One sentence on something specific (a product decision, a value, a recent launch). One sentence on how your skills slot in. One sentence on what you'd want to learn.",
    example:
      "Your bet on async-first communication is the way I already work, and the new collaboration product looks like the cleanest take on the problem I've seen. I'd bring four years of growth experience and learn a lot from how your team thinks about retention.",
    targetSeconds: 60,
    difficulty: "Standard",
    keyPoints: [
      "Something specific you researched about them",
      "How your skills connect to their needs",
      "What you'd want to learn here",
    ],
  },
  {
    q: "What are your salary expectations?",
    type: "Salary",
    guidance:
      "Anchor with a researched range, not a single number. Tie it to value. Stay friendly and firm. If pushed for one number, give the upper third of your range.",
    example:
      "Based on the role, my experience, and market data for this city, I'm looking in the 95-115k range. I'm flexible on the mix between base and equity if that helps you make a strong offer.",
    targetSeconds: 45,
    difficulty: "Pressure",
    keyPoints: [
      "Give a RANGE, not a single number",
      "Show you researched market rates",
      "Express flexibility on structure",
      "Stay confident and friendly",
    ],
  },
  {
    q: "Where do you see yourself in five years?",
    type: "Why this role",
    guidance:
      "Show ambition aimed at the company, not away from it. Describe the kind of work and impact you want — not a job title at another firm.",
    example:
      "Leading a small team that owns end-to-end on a product surface. I'd want to be the person new hires shadow in their first week — and to still be learning from the people around me.",
    targetSeconds: 60,
    difficulty: "Standard",
    keyPoints: [
      "Ambition aimed AT the company",
      "Describe impact and work type, not titles",
      "Show growth mindset: still learning",
    ],
  },
  {
    q: "Why are you leaving your current job?",
    type: "Curveball",
    guidance:
      "Stay positive. Frame it as growth, scope, or alignment — not complaints about your manager or company.",
    example:
      "I've learned a lot but I've outgrown the surface area I own. I want a role with more ambiguity and a bigger product to shape — which is exactly what this looks like.",
    targetSeconds: 45,
    difficulty: "Pressure",
    keyPoints: [
      "Stay POSITIVE (no complaints)",
      "Frame as growth opportunity",
      "Connect to why THIS role fits",
    ],
  },
  {
    q: "Do you have any questions for us?",
    type: "Curveball",
    guidance:
      "Always have three. Ask about: how success is measured in the first 90 days, what makes someone thrive on the team, and one specific thing you read about the company.",
    example:
      "What does great look like in this role at the 90-day mark? What separates the people who thrive on this team from the ones who struggle? I read about your move to weekly releases — what surprised you in the first month?",
    targetSeconds: 60,
    difficulty: "Standard",
    keyPoints: [
      "Ask about success metrics (90 days)",
      "Ask what makes people thrive here",
      "Ask about something you researched",
    ],
  },
];

const STAR = [
  { letter: "S", word: "Situation", line: "Set the scene in one sentence." },
  { letter: "T", word: "Task", line: "What were you responsible for?" },
  { letter: "A", word: "Action", line: "What did you specifically do? Use 'I', not 'we'." },
  { letter: "R", word: "Result", line: "Numbers if you have them. Lesson if you don't." },
];

const DIFFICULTY_COLORS = {
  "Warm-up": "bg-green-500/10 text-green-600 border-green-500/30",
  "Standard": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "Pressure": "bg-orange-500/10 text-orange-600 border-orange-500/30",
};

const Interviews = () => {
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"browse" | "practice">("browse");
  const [revealed, setRevealed] = useState(false);
  const [recordEnabled, setRecordEnabled] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(() => {
    const saved = localStorage.getItem("speakbold:interview-completed");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  // Timer state
  const [duration, setDuration] = useState(75);
  const [seconds, setSeconds] = useState(75);
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
  const { upload: uploadRecording, refresh: refreshRecordings, items: recordings } = useRecordings();
  const { markPracticed } = useSyncedStreak();
  
  const current = QUESTIONS[active];

  // Save completed questions
  useEffect(() => {
    localStorage.setItem("speakbold:interview-completed", JSON.stringify([...completedQuestions]));
  }, [completedQuestions]);

  // Update duration when question changes
  useEffect(() => {
    setDuration(current.targetSeconds);
    setSeconds(current.targetSeconds);
    setRunning(false);
    setPausedAt(null);
    setRevealed(false);
    hasStartedRef.current = false;
    wasRunningRef.current = false;
  }, [active, current.targetSeconds]);

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
            setCompletedQuestions(prev => new Set([...prev, active]));
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
  }, [running, pausedAt, active, recordEnabled, refreshRecordings]);

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

  const shuffleQuestion = () => {
    let next = active;
    let guard = 0;
    while (next === active && guard < 10) {
      next = Math.floor(Math.random() * QUESTIONS.length);
      guard++;
    }
    setActive(next);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = duration > 0 ? (seconds / duration) * 100 : 0;
  const completedCount = completedQuestions.size;

  return (
    <TrackShell
      eyebrow="Job Interviews - 10 questions"
      title={
        <>
          Practice the questions you&apos;ll <em className="text-primary not-italic">actually be asked.</em>
        </>
      }
      intro="Pick a question, hit start, and answer out loud under time pressure. No notes. No do-overs. Just like the real thing."
    >
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Session progress</span>
          <span className="text-sm font-medium">{completedCount}/{QUESTIONS.length} practiced</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(completedCount / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("browse")}
          className={cn(
            "px-4 py-2 rounded-full text-sm border transition-colors",
            mode === "browse"
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          Browse Questions
        </button>
        <button
          onClick={() => setMode("practice")}
          className={cn(
            "px-4 py-2 rounded-full text-sm border transition-colors",
            mode === "practice"
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          Practice Mode
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <CommonMistake>The STAR framework helps, but the real test is: did I own it? Use &quot;I&quot; not &quot;we&quot; in the Action step.</CommonMistake>
        <CommonMistake>Avoid fake-humble weaknesses (&quot;I work too hard&quot;). Pick a real one and show how you fixed it.</CommonMistake>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        <aside className="space-y-2 lg:sticky lg:top-24 self-start max-h-[80vh] overflow-y-auto pr-2">
          {QUESTIONS.map((qu, i) => (
            <button
              key={qu.q}
              onClick={() => setActive(i)}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-colors flex items-start gap-3",
                active === i
                  ? "bg-card-gradient border-primary/40"
                  : "border-border hover:border-foreground/30",
              )}
            >
              <span
                className={cn(
                  "font-mono text-xs mt-1",
                  active === i ? "text-primary" : "text-muted-foreground",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium leading-snug">{qu.q}</span>
                <span className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{qu.type}</span>
                  {completedQuestions.has(i) && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  )}
                </span>
              </span>
              <ChevronRight className={cn("h-4 w-4 mt-1 shrink-0", active === i ? "text-primary" : "text-muted-foreground")} />
            </button>
          ))}
        </aside>

        <div className="space-y-6">
          {/* Main practice card */}
          <div className="relative bg-card-gradient border border-border rounded-3xl p-8 md:p-10 overflow-hidden">
            {mode === "practice" && (
              <div
                className="absolute top-0 left-0 h-1 bg-warm transition-all duration-1000 ease-linear"
                style={{ width: `${pct}%` }}
              />
            )}
            
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border",
                  DIFFICULTY_COLORS[current.difficulty]
                )}>
                  {current.difficulty}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Target: {current.targetSeconds}s
                </span>
              </div>
              {mode === "practice" && (
                <span className="font-mono tabular-nums text-4xl md:text-5xl font-bold">
                  {mins}:{String(secs).padStart(2, "0")}
                </span>
              )}
            </div>

            <p className="text-xs uppercase tracking-widest text-primary mb-3">{current.type}</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold leading-tight mb-8 text-pretty">
              &quot;{current.q}&quot;
            </h2>

            {mode === "practice" && (
              <>
                {/* Timer controls */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground mr-1">Timer</span>
                  {[30, 60, 90, 120].map((d) => (
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
                      {d < 60 ? `${d}s` : `${d / 60}m`}
                    </button>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
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
                      {hasStartedRef.current ? "Resume" : "Start"}
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
                  <Button variant="outline" size="lg" onClick={shuffleQuestion}>
                    <Shuffle className="h-4 w-4" />
                    Random
                  </Button>
                  <Button
                    variant={revealed ? "outline" : "spotlight"}
                    size="lg"
                    onClick={() => setRevealed((r) => !r)}
                  >
                    {revealed ? <EyeOff className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                    {revealed ? "Hide hints" : "Show hints"}
                  </Button>
                </div>

                {seconds === 0 && (
                  <div className="mt-6 flex items-center gap-2 text-primary font-semibold animate-fade-in">
                    <Trophy className="h-5 w-5" />
                    <span>Done! Listen back, then try the next question.</span>
                  </div>
                )}

                {/* Recording toggle */}
                <div className="mt-8 pt-6 border-t border-border flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {!user ? (
                      <MicOff className="h-5 w-5 text-muted-foreground/50 mt-0.5" />
                    ) : recordEnabled ? (
                      <Mic className="h-5 w-5 text-primary mt-0.5" />
                    ) : (
                      <MicOff className="h-5 w-5 text-muted-foreground mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">Record this answer</p>
                      {!user ? (
                        <p className="text-xs text-muted-foreground max-w-sm">
                          <Link to="/login" className="text-primary hover:underline">Sign in</Link> to save recordings to your account.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Auto-starts and stops with the timer. Saved to your account.
                        </p>
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

                {recordEnabled && (
                  <div className="mt-6 animate-fade-in">
                    <RecorderPanel
                      label="Recording your answer"
                      hint={
                        user
                          ? "Mic activates when you hit Start. Saved to your account when recording ends."
                          : "Mic activates when you hit Start. Sign in to sync recordings to your account."
                      }
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
                          promptText: `Interview: ${current.q}`,
                          difficulty: current.difficulty,
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
              </>
            )}

            {/* Hints section - shown in browse mode always, in practice mode when revealed */}
            {(mode === "browse" || revealed) && (
              <div className={cn("space-y-6", mode === "practice" && "mt-8 animate-fade-in")}>
                <div className="border-l-2 border-primary pl-5">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">How to answer</p>
                  <p className="text-foreground/90 leading-relaxed">{current.guidance}</p>
                </div>

                <div className="bg-muted/30 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Target className="h-3.5 w-3.5" />
                    Key points to hit
                  </p>
                  <ul className="space-y-2">
                    {current.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-foreground/85">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-muted/40 rounded-2xl p-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Worked example</p>
                  <p className="font-display text-lg italic leading-relaxed text-pretty">{current.example}</p>
                </div>
              </div>
            )}
          </div>

          {/* STAR Framework reference */}
          <div className="border border-border rounded-3xl p-6 md:p-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-5">The STAR framework</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {STAR.map((s) => (
                <div key={s.letter} className="flex gap-4">
                  <span className="grid place-items-center h-10 w-10 rounded-full bg-warm text-primary-foreground font-display font-bold shrink-0">
                    {s.letter}
                  </span>
                  <div>
                    <p className="font-semibold">{s.word}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.line}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setActive((a) => Math.max(0, a - 1))}
              disabled={active === 0}
            >
              Previous question
            </Button>
            <Button
              variant="hero"
              onClick={() => setActive((a) => Math.min(QUESTIONS.length - 1, a + 1))}
              disabled={active === QUESTIONS.length - 1}
            >
              Next question
            </Button>
          </div>
        </div>
      </div>
    </TrackShell>
  );
};

export default Interviews;
