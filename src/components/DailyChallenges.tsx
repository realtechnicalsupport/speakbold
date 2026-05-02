import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Zap,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Timer,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DailyChallenge = {
  id: string;
  title: string;
  prompt: string;
  duration: number; // seconds
  difficulty: "easy" | "medium" | "hard";
  category: string;
  xp: number;
};

const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: "elevator-pitch",
    title: "The Elevator Pitch",
    prompt: "Introduce yourself and what you do in 30 seconds as if you just met your dream employer.",
    duration: 30,
    difficulty: "easy",
    category: "Introductions",
    xp: 50,
  },
  {
    id: "explain-it-simply",
    title: "Explain It Simply",
    prompt: "Pick something complex you know well and explain it like you're talking to a curious 10-year-old.",
    duration: 60,
    difficulty: "medium",
    category: "Clarity",
    xp: 75,
  },
  {
    id: "impromptu-story",
    title: "Impromptu Story",
    prompt: "Tell a short story about a time you failed at something and what you learned from it.",
    duration: 90,
    difficulty: "hard",
    category: "Storytelling",
    xp: 100,
  },
];

const STORAGE_KEY = "speakbold.dailyChallenges.v1";

type CompletedChallenge = {
  id: string;
  completedAt: string;
};

type DailyChallengesState = {
  date: string;
  completed: CompletedChallenge[];
  totalXp: number;
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const readState = (): DailyChallengesState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), completed: [], totalXp: 0 };
    const parsed = JSON.parse(raw) as DailyChallengesState;
    // Reset if it's a new day
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), completed: [], totalXp: parsed.totalXp ?? 0 };
    }
    return parsed;
  } catch {
    return { date: todayKey(), completed: [], totalXp: 0 };
  }
};

const writeState = (state: DailyChallengesState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
};

export const DailyChallenges = () => {
  const [state, setState] = useState<DailyChallengesState>({ date: todayKey(), completed: [], totalXp: 0 });
  const [activeChallenge, setActiveChallenge] = useState<DailyChallenge | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Load state on mount
  useEffect(() => {
    setState(readState());
  }, []);

  // Timer logic
  useEffect(() => {
    if (!isRunning || !activeChallenge) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerRef.current!);
          setIsRunning(false);
          setIsComplete(true);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isRunning, activeChallenge]);

  const handleComplete = useCallback(() => {
    if (!activeChallenge) return;
    
    setState((prev) => {
      const alreadyCompleted = prev.completed.some((c) => c.id === activeChallenge.id);
      if (alreadyCompleted) return prev;

      const next: DailyChallengesState = {
        ...prev,
        completed: [...prev.completed, { id: activeChallenge.id, completedAt: new Date().toISOString() }],
        totalXp: prev.totalXp + activeChallenge.xp,
      };
      writeState(next);
      setShowReward(true);
      return next;
    });
  }, [activeChallenge]);

  const startChallenge = (challenge: DailyChallenge) => {
    setActiveChallenge(challenge);
    setTimeLeft(challenge.duration);
    setIsRunning(false);
    setIsComplete(false);
    setShowReward(false);
  };

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (activeChallenge) {
      setTimeLeft(activeChallenge.duration);
    }
    setIsRunning(false);
    setIsComplete(false);
    setShowReward(false);
  };

  const closeChallenge = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setActiveChallenge(null);
    setIsRunning(false);
    setIsComplete(false);
    setShowReward(false);
  };

  const isCompleted = (id: string) => state.completed.some((c) => c.id === id);
  const completedCount = state.completed.length;
  const allComplete = completedCount === DAILY_CHALLENGES.length;

  const progressPct = (completedCount / DAILY_CHALLENGES.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const difficultyColor = (d: DailyChallenge["difficulty"]) => {
    switch (d) {
      case "easy":
        return "text-green-400 bg-green-400/10";
      case "medium":
        return "text-yellow-400 bg-yellow-400/10";
      case "hard":
        return "text-red-400 bg-red-400/10";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.25em] uppercase mb-2">
            <span className="h-px w-10 bg-primary" />
            Daily Challenges
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-balance">
            Complete today&apos;s challenges
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Fresh challenges every day. Build your speaking skills one prompt at a time.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-display font-semibold tabular-nums">{state.totalXp}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Total XP</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-warm grid place-items-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-card-gradient border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">
            {completedCount} of {DAILY_CHALLENGES.length} completed
          </span>
          {allComplete && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> All done!
            </span>
          )}
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-warm transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {allComplete && (
          <p className="text-sm text-muted-foreground mt-3">
            Amazing work! Come back tomorrow for new challenges.
          </p>
        )}
      </div>

      {/* Challenge cards */}
      <div className="grid gap-4">
        {DAILY_CHALLENGES.map((challenge, index) => {
          const completed = isCompleted(challenge.id);
          const isActive = activeChallenge?.id === challenge.id;

          return (
            <div
              key={challenge.id}
              className={cn(
                "relative bg-card-gradient border rounded-2xl overflow-hidden transition-all duration-300",
                completed
                  ? "border-primary/50"
                  : isActive
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30"
              )}
            >
              {/* Challenge header */}
              <div
                className={cn(
                  "p-5 cursor-pointer transition-colors",
                  !isActive && !completed && "hover:bg-muted/20"
                )}
                onClick={() => !completed && !isActive && startChallenge(challenge)}
              >
                <div className="flex items-start gap-4">
                  {/* Number badge */}
                  <div
                    className={cn(
                      "shrink-0 h-10 w-10 rounded-xl grid place-items-center font-display text-lg font-semibold transition-colors",
                      completed ? "bg-warm text-primary-foreground" : "bg-muted text-foreground"
                    )}
                  >
                    {completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display text-lg font-semibold">{challenge.title}</h3>
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full",
                          difficultyColor(challenge.difficulty)
                        )}
                      >
                        {challenge.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{challenge.prompt}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {formatTime(challenge.duration)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" /> {challenge.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary font-semibold">
                        <Zap className="h-3.5 w-3.5" /> +{challenge.xp} XP
                      </span>
                    </div>
                  </div>

                  {!completed && !isActive && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              </div>

              {/* Active challenge panel */}
              {isActive && (
                <div className="border-t border-border p-5 bg-muted/10">
                  {!isComplete ? (
                    <>
                      {/* Timer display */}
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center h-32 w-32 rounded-full bg-muted/30 border-4 border-primary/20 relative">
                          {/* Progress ring */}
                          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="46"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-muted"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="46"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              strokeLinecap="round"
                              className="text-primary transition-all duration-1000 ease-linear"
                              strokeDasharray={`${((challenge.duration - timeLeft) / challenge.duration) * 289} 289`}
                            />
                          </svg>
                          <div className="relative">
                            <Timer className="h-5 w-5 text-primary mx-auto mb-1" />
                            <span className="font-display text-3xl font-semibold tabular-nums">
                              {formatTime(timeLeft)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          variant={isRunning ? "spotlight" : "hero"}
                          size="lg"
                          onClick={toggleTimer}
                        >
                          {isRunning ? (
                            <>
                              <Pause className="h-4 w-4" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" /> {timeLeft === challenge.duration ? "Start" : "Resume"}
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="lg" onClick={resetTimer}>
                          <RotateCcw className="h-4 w-4" /> Reset
                        </Button>
                        <Button variant="ghost" size="lg" onClick={closeChallenge}>
                          Cancel
                        </Button>
                      </div>

                      {/* Prompt reminder */}
                      <div className="mt-6 p-4 bg-muted/20 rounded-xl border border-border">
                        <p className="text-sm font-medium text-foreground/80 text-center italic">
                          &ldquo;{challenge.prompt}&rdquo;
                        </p>
                      </div>
                    </>
                  ) : (
                    /* Completion state */
                    <div className="text-center py-4">
                      <div
                        className={cn(
                          "inline-flex items-center justify-center h-20 w-20 rounded-full mb-4 transition-all",
                          showReward ? "bg-warm animate-pulse-glow" : "bg-primary/20"
                        )}
                      >
                        {showReward ? (
                          <Gift className="h-8 w-8 text-primary-foreground" />
                        ) : (
                          <CheckCircle2 className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      <h4 className="font-display text-xl font-semibold mb-2">Challenge Complete!</h4>
                      <p className="text-muted-foreground text-sm mb-4">
                        You earned <span className="text-primary font-semibold">+{challenge.xp} XP</span>
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Button variant="outline" onClick={closeChallenge}>
                          Close
                        </Button>
                        {completedCount < DAILY_CHALLENGES.length && (
                          <Button variant="hero" onClick={() => {
                            const next = DAILY_CHALLENGES.find((c) => !isCompleted(c.id) && c.id !== challenge.id);
                            if (next) startChallenge(next);
                            else closeChallenge();
                          }}>
                            Next Challenge <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bonus challenge teaser */}
      <div className="bg-card-gradient border border-dashed border-primary/30 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-display text-lg font-semibold">Want more practice?</h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              Try our full impromptu speaking track for unlimited prompts and drills.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link to="/tracks/impromptu">
              Explore <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
