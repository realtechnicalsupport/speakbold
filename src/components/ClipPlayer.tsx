import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

const fmtClock = (secs: number) => {
  if (!isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

/**
 * Audio player with its OWN controls. We deliberately do NOT use the native
 * <audio controls> nor `audio.duration` for the total time: MediaRecorder
 * webm/opus blobs ship without a duration header, and on some platforms (seen on
 * Android Chrome) the browser then reports a wildly INFLATED duration — the cause
 * of the "5:21 for a one-minute clip" bug. The authoritative total is the
 * recorder's wall-clock measurement (`durationMs`), which the app already stores;
 * playback position (`currentTime`) is reliable, so we drive the bar from that
 * and clamp to total. Falls back to a sane finite `audio.duration` only when no
 * measurement is available.
 */
export const ClipPlayer = ({
  src,
  durationMs,
  className,
}: {
  src: string;
  durationMs?: number | null;
  className?: string;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [fallbackTotal, setFallbackTotal] = useState<number | null>(null);

  const total = durationMs && durationMs > 0 ? durationMs / 1000 : fallbackTotal;

  const onLoadedMetadata = () => {
    if (durationMs && durationMs > 0) return;
    const d = audioRef.current?.duration;
    if (typeof d === "number" && isFinite(d) && d > 0 && d < 36000) setFallbackTotal(d);
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play().catch(() => {});
  };

  const onTime = () => {
    const el = audioRef.current;
    if (!el) return;
    setCurrent(total ? Math.min(el.currentTime, total) : el.currentTime);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = frac * total;
    setCurrent(frac * total);
  };

  const pct = total && total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="h-9 w-9 shrink-0 rounded-full bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
      </button>

      <span className="text-[10px] font-black tabular-nums opacity-50 shrink-0 w-9">{fmtClock(current)}</span>

      <div
        onClick={seek}
        className="flex-1 h-2 rounded-full bg-foreground/10 cursor-pointer relative overflow-hidden"
      >
        <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>

      <span className="text-[10px] font-black tabular-nums opacity-30 shrink-0 w-9 text-right">
        {total != null ? fmtClock(total) : "--:--"}
      </span>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
        onTimeUpdate={onTime}
        className="hidden"
      />
    </div>
  );
};
