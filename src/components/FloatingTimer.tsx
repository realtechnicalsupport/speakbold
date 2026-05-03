interface FloatingTimerProps {
  isRunning: boolean;
  seconds: number;
  duration: number;
  isPaused?: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const FloatingTimer = ({ isRunning, seconds, duration, isPaused, onPause, onResume, onReset }: FloatingTimerProps) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = duration > 0 ? (seconds / duration) * 100 : 0;

  if (!isRunning && !isPaused) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/30 animate-fade-down shadow-glow">
      <div className="container py-3 px-6 flex items-center justify-between max-w-full">
        <span className={`font-mono text-2xl font-bold tabular-nums tracking-wide ${isPaused ? "text-amber-500" : "text-foreground"}`}>
          {mins}:{String(secs).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-4">
          {isRunning ? (
            <button 
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-colors"
              aria-label="Pause timer"
            >
              <span className="text-lg">⏸</span>
              <span className="text-sm">Pause</span>
            </button>
          ) : (
            <button 
              onClick={onResume}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-semibold transition-colors"
              aria-label="Resume timer"
            >
              <span className="text-lg">▶</span>
              <span className="text-sm">Resume</span>
            </button>
          )}
          <button 
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-foreground font-semibold transition-colors"
            aria-label="Reset timer"
          >
            <span className="text-lg">↺</span>
            <span className="text-sm">Reset</span>
          </button>
        </div>
      </div>
      <div className="h-1 w-full bg-muted/50">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${isPaused ? "bg-amber-500" : "bg-warm"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
