import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, RotateCcw, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileTimerHeaderProps {
  visible: boolean;
  seconds: number;
  duration: number;
  running: boolean;
  paused: boolean;
  label?: string;
  onResume: () => void;
  onPause: () => void;
  onReset: () => void;
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
  label,
  onResume,
  onPause,
  onReset,
}: MobileTimerHeaderProps) => {
  const [mounted, setMounted] = useState(false);
  const [headerBottom, setHeaderBottom] = useState(76);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamically measure the SiteHeader height so the bar sits exactly below it
  useEffect(() => {
    const measure = () => {
      const siteHeader = document.querySelector("header");
      if (siteHeader) {
        setHeaderBottom(siteHeader.getBoundingClientRect().bottom);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, []);

  if (!mounted) return null;

  const pct = duration > 0 ? Math.max(0, ((duration - seconds) / duration) * 100) : 0;
  const isFinished = seconds === 0 && duration > 0;
  const isUrgent = seconds <= 10 && seconds > 0 && running;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: headerBottom,
        left: 0,
        right: 0,
        width: "100%",
        maxWidth: "none",
        zIndex: 9999,
      }}
      className={cn(
        "lg:hidden transition-all duration-300 ease-out",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-2 pointer-events-none"
      )}
      aria-hidden={!visible}
      aria-label="Active timer controls"
    >
      <div className="px-3 pt-2">
        <div
          className={cn(
            "relative rounded-xl border overflow-hidden",
            isUrgent ? "border-destructive/60" : "border-border",
          )}
          style={{
            background: "hsl(var(--card))",
            boxShadow: isUrgent
              ? "0 12px 40px -8px hsl(0 75% 60% / 0.35), 0 4px 16px -4px hsl(220 45% 4% / 0.9)"
              : "0 12px 40px -8px hsl(220 45% 4% / 0.7), 0 4px 16px -4px hsl(220 45% 4% / 0.9)",
            maxWidth: "none",
          }}
        >
          {/* Progress bar along top edge */}
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: "hsl(var(--muted))" }}
          >
            <div
              className={cn(
                "h-full transition-all ease-linear",
                isFinished
                  ? "bg-green-400"
                  : isUrgent
                  ? "bg-destructive"
                  : paused
                  ? "bg-primary/50"
                  : "bg-primary"
              )}
              style={{
                width: isFinished ? "100%" : `${pct}%`,
                transitionDuration: running ? "1000ms" : "300ms",
              }}
            />
          </div>

          <div className="flex items-center gap-3 px-4 h-12">
            {/* Live recording dot */}
            <span className="shrink-0 w-5 flex items-center justify-center">
              {running ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-destructive" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                </span>
              ) : isFinished ? (
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              ) : (
                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </span>

            {/* Countdown */}
            <span
              className={cn(
                "font-mono tabular-nums text-lg font-bold leading-none shrink-0 w-12",
                isFinished
                  ? "text-green-400"
                  : isUrgent
                  ? "text-destructive"
                  : paused
                  ? "text-muted-foreground"
                  : "text-foreground"
              )}
            >
              {formatTime(seconds)}
            </span>

            {/* Status label */}
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate leading-none" style={{ color: "hsl(var(--muted-foreground))" }}>
                {isFinished ? (
                  <span style={{ color: "rgb(74 222 128)" }} className="font-semibold">Complete</span>
                ) : running ? (
                  label ?? "Recording in progress"
                ) : paused ? (
                  <><span style={{ color: "hsl(var(--accent))" }} className="font-medium">Paused</span>{label ? ` · ${label}` : ""}</>
                ) : (
                  label ?? "Ready"
                )}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onReset}
                aria-label="Reset timer"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg transition-all active:scale-95"
                style={{ color: "hsl(var(--muted-foreground))" }}
                onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              {!isFinished && (
                <button
                  onClick={running ? onPause : onResume}
                  aria-label={running ? "Pause timer" : "Resume timer"}
                  className={cn(
                    "h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95",
                    running
                      ? "bg-muted text-foreground hover:bg-muted/70"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {running ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </>
                  )}
                </button>
              )}

              {isFinished && (
                <button
                  onClick={onReset}
                  aria-label="Start new drill"
                  className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: "rgb(74 222 128 / 0.15)",
                    color: "rgb(74 222 128)",
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  New
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
