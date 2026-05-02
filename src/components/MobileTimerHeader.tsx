import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileTimerHeaderProps {
  /** Whether the header should be visible (timer has been started at least once) */
  visible: boolean;
  /** Current seconds remaining */
  seconds: number;
  /** Total duration in seconds */
  duration: number;
  /** Whether the timer is actively counting down */
  running: boolean;
  /** Whether the timer is paused */
  paused: boolean;
  /** Called when the user taps Resume */
  onResume: () => void;
  /** Called when the user taps Pause */
  onPause: () => void;
  /** Called when the user taps Reset */
  onReset: () => void;
  /** Label shown next to the time */
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
  const pct = duration > 0 ? Math.max(0, (seconds / duration) * 100) : 0;
  const isFinished = seconds === 0;

  // Colour-code the progress bar
  const barColor = isFinished
    ? "bg-green-400"
    : paused
    ? "bg-primary/50"
    : "bg-primary";

  return (
    // no-max-w escapes the global `max-width: 100% !important` rule on divs
    <div
      className={cn(
        "no-max-w fixed left-0 right-0 z-50 lg:hidden",
        "transition-all duration-300 ease-in-out",
        visible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "-translate-y-4 opacity-0 pointer-events-none"
      )}
      style={{ top: "var(--header-h, 4.75rem)", width: "100%", maxWidth: "none" }}
      aria-hidden={!visible}
      aria-label="Timer controls"
    >
      {/* Card */}
      <div className="mx-3 rounded-xl border border-border bg-card shadow-[0_8px_32px_-8px_hsl(220_60%_4%/0.8)] overflow-hidden">
        {/* Progress bar — top edge */}
        <div className="h-0.5 w-full bg-muted overflow-hidden">
          <div
            className={cn("h-full transition-all ease-linear", barColor)}
            style={{
              width: `${pct}%`,
              transitionDuration: running ? "1s" : "300ms",
            }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Pulsing dot — live indicator */}
          <span className="relative shrink-0">
            <span
              className={cn(
                "block h-2 w-2 rounded-full",
                isFinished
                  ? "bg-green-400"
                  : running
                  ? "bg-primary animate-pulse"
                  : "bg-muted-foreground"
              )}
            />
          </span>

          {/* Time */}
          <span
            className={cn(
              "font-mono tabular-nums text-base font-bold leading-none shrink-0",
              isFinished
                ? "text-green-400"
                : paused
                ? "text-muted-foreground"
                : "text-foreground"
            )}
          >
            {formatTime(seconds)}
          </span>

          {/* Label / status */}
          <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
            {isFinished
              ? "Complete — great work"
              : paused
              ? label
                ? `Paused · ${label}`
                : "Paused"
              : label || "Timer running"}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Reset */}
            <button
              onClick={onReset}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
              aria-label="Reset timer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* Play / Pause */}
            {!isFinished && (
              <button
                onClick={running ? onPause : onResume}
                className={cn(
                  "h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95",
                  running
                    ? "bg-muted text-foreground hover:bg-muted/70"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
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
              <span className="text-xs font-semibold text-green-400 px-2">Done</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
