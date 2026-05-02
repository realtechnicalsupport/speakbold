import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface TimerHeaderProps {
  running: boolean;
  seconds: number;
  duration: number;
  title: string;
  recordingActive: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const TimerHeader = ({
  running,
  seconds,
  duration,
  title,
  recordingActive,
  onPlay,
  onPause,
  onReset,
}: TimerHeaderProps) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = duration > 0 ? (seconds / duration) * 100 : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border backdrop-blur-sm">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {title}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Recording {recordingActive ? "active" : "inactive"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="font-mono tabular-nums text-4xl font-bold">
              {mins}:{String(secs).padStart(2, "0")}
            </span>
          </div>
          <div className="flex gap-2">
            {running ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onPause}
              >
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={onPlay}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-warm transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
