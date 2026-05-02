import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileTimerHeaderProps {
  /** Whether the header should be visible (timer has been started at least once) */
  visible: boolean;
  /** Current seconds remaining */
  seconds: number;
  /** Total duration in seconds (for the progress bar) */
  duration: number;
  /** Whether the timer is actively counting down */
  running: boolean;
  /** Whether the timer is paused (pausedAt !== null) */
  paused: boolean;
  /** Called when the user taps Play/Resume */
  onResume: () => void;
  /** Called when the user taps Pause */
  onPause: () => void;
  /** Called when the user taps Reset */
  onReset: () => void;
  /** Optional label shown next to the time (e.g. drill name) */
  label?: string;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

export const MobileTimerHeader = ({
  visible,
  seconds,
  duration,
  running,
  paused,
  onResume,
  onPause,
  onReset,
  label,
}: MobileTimerHeaderProps) => {
  const pct = duration > 0 ? (seconds / duration) * 100 : 0;
  const isFinished = seconds === 0;

  return (
    <div
      className={cn(
        // Only show on mobile (hidden on lg+), fixed below the site header (~76px tall)
        "fixed top-[4.75rem] left-0 right-0 z-40 lg:hidden",
        "transition-all duration-300 ease-in-out",
        visible ? "translate-y-0 opacity-100 pointer-events-auto" : "-translate-y-full opacity-0 pointer-events-none"
      )}
      aria-hidden={!visible}
    >
      {/* Background + progress bar */}
      <div className="relative bg-background border-b border-border shadow-md overflow-hidden">
        {/* Progress fill */}
        <div
          className={cn(
            "absolute bottom-0 left-0 h-0.5 transition-all duration-1000 ease-linear",
            isFinished ? "bg-green-500" : running ? "bg-primary" : "bg-muted-foreground/40"
          )}
          style={{ width: `${pct}%` }}
        />

        <div className="flex items-center gap-3 px-4 h-12">
          {/* Time display */}
          <span
            className={cn(
              "font-mono tabular-nums text-lg font-bold leading-none w-14 shrink-0",
              isFinished ? "text-green-600" : running ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {formatTime(seconds)}
          </span>

          {/* Label */}
          {label && (
            <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
              {isFinished ? "Done" : running ? label : `Paused · ${label}`}
            </span>
          )}

          {!label && <span className="flex-1" />}

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Reset */}
            <button
              onClick={onReset}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Reset timer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* Play / Pause */}
            {!isFinished && (
              <button
                onClick={running ? onPause : onResume}
                className={cn(
                  "h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors",
                  running
                    ? "bg-muted text-foreground hover:bg-muted/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                aria-label={running ? "Pause timer" : "Resume timer"}
              >
                {running ? (
                  <>
                    <Pause className="h-3 w-3" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" />
                    <span>Resume</span>
                  </>
                )}
              </button>
            )}

            {isFinished && (
              <span className="text-xs font-medium text-green-600 px-2">Complete</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
