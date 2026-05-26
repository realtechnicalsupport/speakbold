import { cn } from "@/lib/utils";
import { TARGET_WPM } from "@/data/impromptuTopics";

interface Props {
  wpm: number;
  totalWords: number;
  fillerCount: number;
  elapsedSecs: number;
}

interface MetricProps {
  value: string | number;
  label: string;
  sub?: string;
  variant?: "neutral" | "good" | "warn" | "bad";
}

const Metric = ({ value, label, sub, variant = "neutral" }: MetricProps) => (
  <div className={cn(
    "flex-1 flex flex-col items-center gap-1 py-4 px-3 rounded-2xl border transition-all",
    variant === "good" && "bg-emerald-500/8 border-emerald-500/20",
    variant === "warn" && "bg-amber-500/8 border-amber-500/20",
    variant === "bad"  && "bg-red-500/10 border-red-500/25",
    variant === "neutral" && "bg-muted/8 border-border/30",
  )}>
    <span className={cn(
      "text-2xl font-black tabular-nums leading-none",
      variant === "good" && "text-emerald-400",
      variant === "warn" && "text-amber-400",
      variant === "bad"  && "text-red-400",
    )}>
      {value}
    </span>
    <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-35">{label}</span>
    {sub && <span className="text-[8px] font-medium opacity-20">{sub}</span>}
  </div>
);

export const ImpromptuHUD = ({ wpm, totalWords, fillerCount, elapsedSecs }: Props) => {
  const wpmVariant = wpm === 0 ? "neutral"
    : wpm < TARGET_WPM.min ? "warn"
    : wpm > TARGET_WPM.max ? "warn"
    : "good";

  const fillerVariant = fillerCount === 0 ? "neutral"
    : fillerCount <= 2 ? "warn"
    : "bad";

  return (
    <div className="flex items-stretch gap-2">
      <Metric
        value={wpm > 0 ? wpm : "—"}
        label="WPM"
        sub={wpm === 0 ? "" : wpm < TARGET_WPM.min ? "too slow" : wpm > TARGET_WPM.max ? "too fast" : "on pace"}
        variant={wpmVariant}
      />
      <Metric
        value={totalWords}
        label="WORDS"
        sub={elapsedSecs > 0 ? `${elapsedSecs}s` : ""}
        variant="neutral"
      />
      <Metric
        value={fillerCount}
        label="FILLERS"
        sub={fillerCount === 0 ? "clean" : fillerCount <= 2 ? "ok" : "reduce"}
        variant={fillerVariant}
      />
    </div>
  );
};
