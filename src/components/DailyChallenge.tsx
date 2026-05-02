import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Flame, CheckCircle2 } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import { RecorderPanel } from "@/components/RecorderPanel";

const DAILY_PROMPTS = [
  "The best advice you've ever ignored.",
  "Describe a smell that instantly takes you somewhere.",
  "If you could ban one word from meetings, which and why?",
  "The smallest decision that changed your life.",
  "Convince me to try your favorite hobby in 60 seconds.",
  "A time you were wrong — and what you did about it.",
  "What does 'home' mean to you right now?",
  "The most underrated skill in your field.",
  "A rule you break on purpose.",
  "Something you believed at 15 that you don't anymore.",
  "The last thing that genuinely surprised you.",
  "If your week had a title, what would it be?",
  "A person who shaped you without knowing it.",
  "What you'd tell a room of nervous first-day interns.",
];

const dayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
};

const DURATION = 60;

export const DailyChallenge = () => {
  const prompt = useMemo(() => DAILY_PROMPTS[dayOfYear() % DAILY_PROMPTS.length], []);
  const [left, setLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const ref = useRef<number | null>(null);
  const { count, practicedToday, markPracticed } = useStreak();
  
  const recorderRef = useRef<{ start: () => void; pause: () => void; resume: () => void; stop: () => void } | null>(null);
  
  useEffect(() => {
    if (running && recorderRef.current) {
      if (left === DURATION) {
        recorderRef.current.start();
      } else {
        recorderRef.current.resume();
      }
    } else if (!running && recorderRef.current && left < DURATION && !finished) {
      recorderRef.current.pause();
    } else if (finished && recorderRef.current) {
      recorderRef.current.stop();
    }
  }, [running, finished, left]);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(ref.current!);
          setRunning(false);
          setFinished(true);
          markPracticed();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [running, markPracticed]);

  const reset = () => {
    if (ref.current) window.clearInterval(ref.current);
    setLeft(DURATION);
    setRunning(false);
    setFinished(false);
  };

  const pct = ((DURATION - left) / DURATION) * 100;

  return (
    <section className="py-16 sm:py-20 bg-secondary/50">
      <div className="container">
        {/* Section header */}
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 text-xs font-medium text-accent bg-accent/10 rounded-full mb-4">
            Daily Challenge
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            60-second speaking drill
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Tap start, speak for one minute, and build your streak.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Main challenge card */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 sm:p-8">
            {/* Prompt */}
            <p className="text-xl sm:text-2xl font-semibold leading-snug mb-8 text-balance">
              &ldquo;{prompt}&rdquo;
            </p>

            {/* Timer display */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-5xl sm:text-6xl font-bold tabular-nums">
                0:{String(left).padStart(2, "0")}
              </span>
              {finished && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                  <CheckCircle2 className="h-4 w-4" />
                  Done
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden mb-6">
              <div
                className="h-full bg-accent transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3">
              {!running && left === DURATION && !finished && (
                <Button variant="accent" size="lg" onClick={() => setRunning(true)} className="flex-1 sm:flex-none">
                  <Play className="h-4 w-4" />
                  Start speaking
                </Button>
              )}
              {running && (
                <Button variant="outline" size="lg" onClick={() => setRunning(false)} className="flex-1 sm:flex-none">
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              )}
              {!running && left < DURATION && !finished && (
                <Button variant="accent" size="lg" onClick={() => setRunning(true)} className="flex-1 sm:flex-none">
                  <Play className="h-4 w-4" />
                  Resume
                </Button>
              )}
              {(left < DURATION || finished) && (
                <Button variant="outline" size="lg" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Streak card */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${count > 0 ? "bg-accent/10" : "bg-secondary"}`}>
                <Flame className={`h-6 w-6 ${count > 0 ? "text-accent" : "text-muted-foreground"}`} />
              </div>
              <div>
                <div className="text-3xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">
                  {count === 1 ? "day streak" : "day streak"}
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6 flex-1">
              {practicedToday
                ? "Great work today! Come back tomorrow."
                : count === 0
                  ? "Complete today's challenge to start your streak."
                  : "One more drill to keep your streak."}
            </p>

            {/* Week visualization */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => {
                const filled = i < Math.min(count, 7);
                return (
                  <div
                    key={i}
                    className={`h-8 rounded-lg transition-colors ${filled ? "bg-accent" : "bg-secondary"}`}
                    aria-hidden
                  />
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Last 7 days</p>
          </div>
        </div>

        {/* Recorder */}
        <div className="max-w-5xl mx-auto mt-6">
          <RecorderPanel
            ref={recorderRef}
            label="Your recording"
            hint="Recording syncs with the timer above."
            recorderStartRef={() => {}}
            recorderPauseRef={() => {}}
            recorderResumeRef={() => {}}
            recorderStopRef={() => {}}
          />
        </div>

        {/* Link to full track */}
        <div className="text-center mt-8">
          <Link 
            to="/tracks/impromptu" 
            className="text-sm font-medium text-accent hover:underline"
          >
            View all 24 impromptu prompts
          </Link>
        </div>
      </div>
    </section>
  );
};
