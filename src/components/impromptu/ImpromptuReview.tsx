import {
  Shuffle, TrendingUp, TrendingDown, Minus, Scissors, Lightbulb,
  Target, Mic2, ChevronDown, Repeat2, Volume2, Check, ArrowRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ImpromptuCoachReport } from "@/services/geminiService";
import { ModelSpeech } from "@/components/ModelSpeech";
import type { ImpromptuTopic } from "@/data/impromptuTopics";
import { TARGET_WPM } from "@/data/impromptuTopics";
import type { ImpromptuStats } from "@/lib/impromptuHistory";
import { FILLER_WORDS } from "@/hooks/useImpromptuSession";

interface Props {
  topic: ImpromptuTopic;
  duration: number;
  liveTranscript: string;
  wpm: number;
  totalWords: number;
  fillerCount: number;
  fillerTimes: number[];
  elapsedSecs: number;
  coachReport: ImpromptuCoachReport | null;
  loadingCoach: boolean;
  stats: ImpromptuStats;
  recordingBlobUrl: string | null;
  curveballText: string | null;
  drillMode: boolean;
  onGoAgain: () => void;
  onNewTopic: () => void;
  onDrillCurveball: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreLabel = (s: number) =>
  s >= 90 ? "Outstanding" : s >= 80 ? "Strong" : s >= 70 ? "Solid" : s >= 55 ? "Developing" : "Keep Working";

const scoreColor = (s: number): string =>
  s >= 80 ? "#34d399" : s >= 65 ? "#60a5fa" : s >= 50 ? "#fbbf24" : "#f87171";

// ── Loading — cycling steps ───────────────────────────────────────────────────
const STEPS = [
  "Reading your transcript…",
  "Checking framework structure…",
  "Finding what to expand…",
  "Spotting what to cut…",
  "Writing your feedback…",
  "Measuring your pace…",
  "Almost there…",
];

const LoadingCoach = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % STEPS.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="py-14 flex flex-col items-center gap-7">
      <div className="flex items-center gap-2.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -7, 0] }}
            transition={{ duration: 1.3, delay: i * 0.18, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium opacity-60 tracking-wide"
        >
          {STEPS[step]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

// ── Score hero — horizontal, compact ──────────────────────────────────────────
const ScoreHero = ({ score, verdict, stats }: {
  score: number; verdict: string; stats: ImpromptuStats;
}) => {
  const color = scoreColor(score);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const delta = score - stats.avgScore;

  return (
    <div className="flex items-center gap-5 p-5">
      {/* Ring + number */}
      <div className="relative w-[104px] h-[104px] shrink-0 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 104 104" fill="none">
          <circle cx="52" cy="52" r={r} stroke="currentColor" strokeWidth="3.5" className="text-foreground/8" />
          <motion.circle
            cx="52" cy="52" r={r} stroke={color} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (score / 100) * circ }}
            transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          />
        </svg>
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="speak-serif text-[3.5rem] font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {score}
        </motion.span>
      </div>

      {/* Verdict + label + delta */}
      <div className="min-w-0 space-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-50">{scoreLabel(score)}</p>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45 }}
          className="speak-serif text-lg italic leading-snug opacity-80"
        >
          {verdict}
        </motion.p>
        {stats.totalSessions > 1 && (
          <div>
            {delta > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                <TrendingUp className="h-3 w-3" />+{delta} above your avg
              </span>
            ) : delta < 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-400">
                <TrendingDown className="h-3 w-3" />{delta} below your avg
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-50">
                <Minus className="h-3 w-3" />right at your avg
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── WPM bar ───────────────────────────────────────────────────────────────────
const PaceBar = ({ wpm }: { wpm: number }) => {
  const MIN = 60; const MAX = 240;
  const pct = Math.min(Math.max((wpm - MIN) / (MAX - MIN), 0), 1);
  const sweetL = ((TARGET_WPM.min - MIN) / (MAX - MIN)) * 100;
  const sweetR = 100 - ((TARGET_WPM.max - MIN) / (MAX - MIN)) * 100;
  const dotColor = wpm >= TARGET_WPM.min && wpm <= TARGET_WPM.max ? "#34d399"
    : wpm < TARGET_WPM.min ? "#fbbf24" : "#f87171";

  return (
    <div className="space-y-1.5 w-full">
      <div className="relative h-1 rounded-full bg-foreground/8">
        <div className="absolute inset-y-0 rounded-full bg-emerald-500/25"
          style={{ left: `${sweetL}%`, right: `${sweetR}%` }} />
        <motion.div
          className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-background shadow-sm"
          style={{ backgroundColor: dotColor, left: `${pct * 100}%`, y: "-50%", x: "-50%" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 220, damping: 18 }}
        />
      </div>
      <div className="flex justify-between text-[8px] font-medium opacity-40">
        <span>slow</span><span>{TARGET_WPM.min}–{TARGET_WPM.max}</span><span>fast</span>
      </div>
    </div>
  );
};

// ── Metrics strip ─────────────────────────────────────────────────────────────
const MetricsStrip = ({ wpm, totalWords, elapsedSecs, fillerCount }: {
  wpm: number; totalWords: number; elapsedSecs: number; fillerCount: number;
}) => (
  <div className="grid grid-cols-3 gap-2.5">
    <div className="rounded-2xl border border-border/30 bg-muted/4 p-4 space-y-3">
      <div className="flex items-end justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-50">PACE</span>
        <span className={cn("text-3xl font-black tabular-nums leading-none",
          wpm >= TARGET_WPM.min && wpm <= TARGET_WPM.max && wpm > 0 ? "text-emerald-400"
            : wpm > 0 ? "text-amber-400" : "opacity-50")}>
          {wpm > 0 ? wpm : "—"}
        </span>

      </div>
      {wpm > 0 ? <PaceBar wpm={wpm} /> : <p className="text-[8px] opacity-40">no data</p>}
    </div>
    <div className="rounded-2xl border border-border/30 bg-muted/4 p-4 flex flex-col justify-between">
      <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-50">WORDS</span>
      <div>
        <p className="text-3xl font-black tabular-nums">{totalWords}</p>
        <p className="text-[10px] opacity-40 mt-1">in {elapsedSecs}s</p>
      </div>
    </div>
    <div className="rounded-2xl border border-border/30 bg-muted/4 p-4 flex flex-col justify-between">
      <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-50">FILLERS</span>
      <div>
        <p className={cn("text-3xl font-black tabular-nums",
          fillerCount === 0 ? "text-emerald-400" : fillerCount <= 2 ? "text-amber-400" : "text-red-400")}>
          {fillerCount}
        </p>
        <p className="text-[10px] opacity-40 mt-1">
          {fillerCount === 0 ? "clean!" : fillerCount <= 2 ? "manageable" : "reduce"}
        </p>
      </div>
    </div>
  </div>
);

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ icon, color, children }: {
  icon: React.ReactNode; color: string; children: React.ReactNode;
}) => (
  <div className={cn("flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.45em]", color)}>
    {icon}{children}
  </div>
);

// ── Quote item ────────────────────────────────────────────────────────────────
const QuoteItem = ({ quote, why, variant }: {
  quote: string; why: string; variant: "expand" | "cut";
}) => (
  <div className="space-y-1">
    <p className={cn(
      "text-base font-medium leading-snug pl-3 italic",
      variant === "expand"
        ? "border-l-2 border-emerald-500/40 opacity-70"
        : "border-l-2 border-red-500/40 opacity-45 line-through decoration-red-400/40"
    )}>
      "{quote}"
    </p>
    <p className="text-sm font-medium opacity-35 pl-3 not-italic">{why}</p>
  </div>
);

// ── Filler highlighting ───────────────────────────────────────────────────────
function buildFillerPattern(): RegExp {
  const escaped = FILLER_WORDS.map(w => w.replace(/ /g, "\\s+")).join("|");
  return new RegExp(`\\b(${escaped})\\b`, "gi");
}

function highlightFillers(text: string): React.ReactNode[] {
  const pattern = buildFillerPattern();
  const parts: React.ReactNode[] = [];
  let last = 0; let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <mark key={match.index} className="bg-red-500/20 text-red-400 rounded px-0.5 not-italic">{match[0]}</mark>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ── Filler sparkline ──────────────────────────────────────────────────────────
const FillerSparkline = ({ fillerTimes, duration }: { fillerTimes: number[]; duration: number }) => {
  if (fillerTimes.length === 0 || duration === 0) return null;
  const BUCKETS = 10; const bucketSize = duration / BUCKETS;
  const counts = Array(BUCKETS).fill(0);
  for (const t of fillerTimes) counts[Math.min(Math.floor(t / bucketSize), BUCKETS - 1)]++;
  const max = Math.max(...counts, 1);

  return (
    <div className="space-y-1.5 pt-3 border-t border-border/20">
      <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-50">FILLER DENSITY</p>
      <div className="flex items-end gap-1 h-6">
        {counts.map((count, i) => (
          <div key={i}
            title={`${Math.round(i * bucketSize)}–${Math.round((i + 1) * bucketSize)}s: ${count}`}
            className={cn("flex-1 rounded-sm", count === 0 ? "bg-foreground/6" : count >= max * 0.7 ? "bg-red-400/60" : "bg-amber-400/50")}
            style={{ height: `${Math.max(4, (count / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] opacity-15 font-medium">
        <span>0s</span><span>{duration}s</span>
      </div>
    </div>
  );
};

// ── Reusable collapsible (for bulky reference blocks only) ────────────────────
const Collapsible = ({ label, icon, defaultOpen = false, children }: {
  label: string; icon?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[1.5rem] border border-border/25 bg-muted/3 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-foreground/3 transition-colors"
      >
        <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.5em] opacity-50">
          {icon}{label}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2 } }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border/15 pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Audio playback ────────────────────────────────────────────────────────────
const formatClipDuration = (secs: number) => {
  if (!isFinite(secs) || secs < 0) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const AudioPlayback = ({ blobUrl }: { blobUrl: string }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekedRef = useRef(false);
  const [seconds, setSeconds] = useState<number | null>(null);

  // MediaRecorder webm/opus blobs ship with NO duration in the container header,
  // so the native <audio> control reads `duration === Infinity` and shows a
  // wrong, inflated total time (the recording itself is fine — only the metadata
  // is missing). Force the browser to compute the real length by seeking past the
  // end once metadata loads: it scans the file and fires `durationchange` with the
  // true value, after which we read it and reset the playhead to the start.
  const onLoadedMetadata = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.duration === Infinity || Number.isNaN(el.duration)) {
      seekedRef.current = true;
      el.currentTime = 1e101;
    } else {
      setSeconds(el.duration);
    }
  };

  const onDurationChange = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.duration !== Infinity && !Number.isNaN(el.duration)) {
      setSeconds(el.duration);
      if (seekedRef.current) {
        seekedRef.current = false;
        el.currentTime = 0;
      }
    }
  };

  return (
    <div className="rounded-[1.5rem] border border-border/25 bg-muted/3 p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Volume2 className="h-3 w-3 opacity-50" />
          <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-50">YOUR RECORDING</span>
        </div>
        {seconds != null && (
          <span className="text-[9px] font-black tabular-nums opacity-50">{formatClipDuration(seconds)}</span>
        )}
      </div>
      <audio
        ref={audioRef}
        controls
        src={blobUrl}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={onDurationChange}
        className="w-full h-8"
        style={{ accentColor: "hsl(var(--primary))" }}
      />
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const ImpromptuReview = ({
  duration, liveTranscript, wpm, totalWords, fillerCount, fillerTimes,
  elapsedSecs, coachReport, loadingCoach, stats, recordingBlobUrl,
  curveballText, drillMode, onGoAgain, onNewTopic, onDrillCurveball,
}: Props) => {
  const noSpeech = liveTranscript.trim().length < 15;

  const hasModelSpeech = coachReport && (
    coachReport.exampleSpeech ||
    coachReport.shouldHaveSaid.tighter ||
    coachReport.shouldHaveSaid.opening ||
    coachReport.shouldHaveSaid.closing
  );
  const fwTotal = coachReport?.frameworkCheck.length ?? 0;
  const fwHits = coachReport?.frameworkCheck.filter(f => f.hit).length ?? 0;
  const missed = coachReport?.frameworkCheck.filter(f => !f.hit) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-20">

      {/* Phase dots */}
      <div className="flex items-center justify-center gap-2 pt-2 pb-1">
        {["SETUP", "PREP", "SPEAKING", "REVIEW"].map((_, i) => (
          <div key={i} className={cn("h-1.5 rounded-full transition-all",
            i === 3 ? "w-8 bg-primary" : "w-3 bg-foreground/15")} />
        ))}
      </div>

      {/* Drill badge */}
      {drillMode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
          <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-primary/60 bg-primary/8 border border-primary/20 px-4 py-2 rounded-full">
            <Repeat2 className="h-3 w-3" />Curveball Drill — 30s
          </span>
        </motion.div>
      )}

      {/* ── Score / Loading / No-speech ── */}
      {loadingCoach ? (
        <div className="rounded-[2rem] border border-border/30 bg-muted/4">
          <LoadingCoach />
        </div>
      ) : coachReport ? (
        <div className="rounded-[2rem] border border-border/30 bg-muted/4">
          <ScoreHero score={coachReport.score} verdict={coachReport.verdict} stats={stats} />
        </div>
      ) : noSpeech ? (
        <div className="rounded-[2rem] border border-border/30 bg-muted/4 py-12 flex flex-col items-center gap-3">
          <Mic2 className="h-9 w-9 opacity-10" />
          <p className="text-sm font-medium opacity-60">No speech captured.</p>
          <p className="text-xs opacity-15">Enable your mic and try again.</p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-border/30 bg-muted/4 py-10 text-center">
          <p className="text-sm font-medium opacity-60">AI analysis unavailable.</p>
        </div>
      )}

      {/* Metrics — only when we have speech */}
      {!noSpeech && !loadingCoach && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <MetricsStrip wpm={wpm} totalWords={totalWords} elapsedSecs={elapsedSecs} fillerCount={fillerCount} />
        </motion.div>
      )}

      {/* Delivery notes — inline, compact */}
      {coachReport && !loadingCoach && (coachReport.paceNote || (coachReport.fillerNote && fillerCount > 0)) && (
        <div className="px-1 space-y-1.5">
          {coachReport.paceNote && (
            <p className="text-sm font-medium opacity-45 leading-relaxed">
              <span className="text-blue-400/60 font-bold">Pace · </span>{coachReport.paceNote}
            </p>
          )}
          {coachReport.fillerNote && fillerCount > 0 && (
            <p className="text-sm font-medium opacity-45 leading-relaxed">
              <span className="text-blue-400/60 font-bold">Fillers · </span>{coachReport.fillerNote}
            </p>
          )}
        </div>
      )}

      {/* ── Next Focus — the headline action, prominent + always visible ── */}
      {coachReport && !loadingCoach && coachReport.nextFocus && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[1.75rem] border border-primary/25 bg-gradient-to-br from-primary/8 to-primary/3 p-5 flex items-start gap-4"
        >
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-primary/50">DO THIS NEXT TIME</p>
            <p className="text-base font-semibold leading-relaxed opacity-80">{coachReport.nextFocus}</p>
          </div>
        </motion.div>
      )}

      {/* ── How It Could Sound — prominent, always open ── */}
      {coachReport && !loadingCoach && hasModelSpeech && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[1.75rem] border border-primary/35 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent overflow-hidden"
          style={{ boxShadow: "0 0 32px -8px hsl(var(--primary) / 0.12)" }}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b border-primary/15">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Lightbulb className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-primary/70">How It Could Sound</p>
              <p className="text-sm font-medium opacity-35 mt-0.5">Model answer — hear it, then try again</p>
            </div>
          </div>

          <div className="px-5 pb-6 pt-5 space-y-6">
            {coachReport.exampleSpeech && (
              <ModelSpeech text={coachReport.exampleSpeech} label="Full model speech" compact />
            )}
            {coachReport.shouldHaveSaid.tighter && (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/40">CORE ARGUMENT</p>
                <p className="speak-serif text-lg italic leading-snug opacity-80">"{coachReport.shouldHaveSaid.tighter}"</p>
              </div>
            )}
            {coachReport.shouldHaveSaid.opening && (
              <div className="space-y-2 pt-4 border-t border-primary/12">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/40">STRONGER OPENING</p>
                <p className="text-base font-medium italic opacity-65 leading-relaxed">"{coachReport.shouldHaveSaid.opening}"</p>
              </div>
            )}
            {coachReport.shouldHaveSaid.closing && (
              <div className="space-y-2 pt-4 border-t border-primary/12">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/40">STRONGER CLOSING</p>
                <p className="text-base font-medium italic opacity-65 leading-relaxed">"{coachReport.shouldHaveSaid.closing}"</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Recording */}
      {recordingBlobUrl && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <AudioPlayback blobUrl={recordingBlobUrl} />
        </motion.div>
      )}

      {/* ── Cut + Expand — visible, dense ── */}
      {coachReport && !loadingCoach && (coachReport.cut.length > 0 || coachReport.sayMore.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-[1.75rem] border border-border/30 bg-muted/4 p-5 space-y-5"
        >
          {coachReport.cut.length > 0 && (
            <div className="space-y-3">
              <SectionLabel icon={<Scissors className="h-3 w-3" />} color="text-red-400/70">Cut This</SectionLabel>
              <div className="space-y-3">
                {coachReport.cut.map((item, i) => (
                  <QuoteItem key={i} quote={item.quote} why={item.why} variant="cut" />
                ))}
              </div>
            </div>
          )}

          {coachReport.cut.length > 0 && coachReport.sayMore.length > 0 && (
            <div className="border-t border-border/15" />
          )}

          {coachReport.sayMore.length > 0 && (
            <div className="space-y-3">
              <SectionLabel icon={<TrendingUp className="h-3 w-3" />} color="text-emerald-400/70">Expand On This</SectionLabel>
              <div className="space-y-3">
                {coachReport.sayMore.map((item, i) => (
                  <QuoteItem key={i} quote={item.quote} why={item.why} variant="expand" />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Framework — compact pill row + missed-step notes, visible ── */}
      {coachReport && !loadingCoach && fwTotal > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
          className="rounded-[1.75rem] border border-border/30 bg-muted/4 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <SectionLabel icon={<Target className="h-3 w-3" />} color="text-amber-400/70">Framework</SectionLabel>
            <span className="text-[11px] font-black tabular-nums opacity-50">{fwHits}/{fwTotal} hit</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {coachReport.frameworkCheck.map((item, i) => (
              <span key={i} className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border",
                item.hit
                  ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-300/80"
                  : "border-border/30 opacity-50"
              )}>
                {item.hit
                  ? <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  : <span className="w-2.5 h-2.5 rounded-full border border-current inline-block" />}
                {item.step}
              </span>
            ))}
          </div>
          {missed.length > 0 && (
            <div className="space-y-1 pt-1">
              {missed.map((item, i) => (
                <p key={i} className="text-sm font-medium opacity-70 leading-snug">
                  <span className="text-amber-400/60 font-bold">{item.step} · </span>{item.note}
                </p>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Transcript — collapsed by default ── */}
      {coachReport && !loadingCoach && liveTranscript && (
        <Collapsible label="Your transcript" icon={<Mic2 className="h-3 w-3" />}>
          <div className="space-y-4">
            <p className="text-base font-medium opacity-45 leading-relaxed italic">
              "{highlightFillers(liveTranscript.trim())}"
            </p>
            <FillerSparkline fillerTimes={fillerTimes} duration={duration} />
          </div>
        </Collapsible>
      )}

      {/* ── Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: loadingCoach ? 0 : 0.28 }}
        className="space-y-2.5 pt-1"
      >
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onGoAgain}
            className="button-pill flex-1 py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3 group"
          >
            <Shuffle className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-sm font-black uppercase tracking-[0.25em]">GO AGAIN</span>
          </button>
          <button
            onClick={onNewTopic}
            className="button-pill flex-1 py-5 border border-border/40 flex items-center justify-center gap-3 hover:border-primary/30 hover:text-primary transition-all group"
          >
            <Shuffle className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-sm font-black uppercase tracking-[0.25em]">NEW TOPIC</span>
          </button>
        </div>

        {curveballText && !drillMode && (
          <motion.button
            onClick={onDrillCurveball}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="w-full button-pill py-4 border border-primary/25 bg-primary/5 text-primary flex items-center justify-center gap-3 hover:bg-primary/10 transition-all group"
          >
            <Repeat2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-black uppercase tracking-[0.2em]">Drill the Pivot</span>
            <span className="text-[9px] font-medium opacity-60 ml-1">30s</span>
          </motion.button>
        )}
      </motion.div>
    </div>
  );
};
