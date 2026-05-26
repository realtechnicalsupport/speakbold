import { RotateCcw, Shuffle, CheckSquare, Square, Loader2, TrendingUp, TrendingDown, Minus, Scissors, Lightbulb, Target, Mic2, Gauge, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ImpromptuCoachReport } from "@/services/geminiService";
import type { ImpromptuTopic } from "@/data/impromptuTopics";
import { TARGET_WPM } from "@/data/impromptuTopics";
import type { ImpromptuStats } from "@/lib/impromptuHistory";

interface Props {
  topic: ImpromptuTopic;
  duration: number;
  liveTranscript: string;
  wpm: number;
  totalWords: number;
  fillerCount: number;
  elapsedSecs: number;
  coachReport: ImpromptuCoachReport | null;
  loadingCoach: boolean;
  stats: ImpromptuStats;
  onGoAgain: () => void;
  onNewTopic: () => void;
}

// ── Score gauge (SVG arc, speedometer style) ─────────────────────────────────
const scoreLabel = (s: number) =>
  s >= 90 ? "Outstanding" : s >= 80 ? "Strong" : s >= 70 ? "Solid" : s >= 55 ? "Developing" : "Keep Working";

const scoreColor = (s: number): string =>
  s >= 80 ? "#34d399" : s >= 65 ? "#60a5fa" : s >= 50 ? "#fbbf24" : "#f87171";

const ScoreGauge = ({ score }: { score: number }) => {
  const r = 78;
  const circ = 2 * Math.PI * r;
  // 270° visible arc (75% of full circle), starting at bottom-left, ending bottom-right
  const arcLength = circ * 0.75;
  const fill = (score / 100) * arcLength;
  const color = scoreColor(score);

  return (
    <div className="relative w-[200px] h-[200px] mx-auto">
      <svg
        className="w-full h-full -rotate-[225deg]"
        viewBox="0 0 200 200"
        fill="none"
      >
        {/* Track */}
        <circle
          cx="100" cy="100" r={r}
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circ}`}
          className="text-foreground/8"
        />
        {/* Fill */}
        <motion.circle
          cx="100" cy="100" r={r}
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${fill} ${circ}` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      {/* Text — positioned independently of SVG rotation */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="speak-serif text-5xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {score}
        </motion.span>
        <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
};

// ── Coach card wrapper ────────────────────────────────────────────────────────
const CoachCard = ({
  icon,
  title,
  accent,
  delay = 0,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent: "green" | "red" | "blue" | "amber" | "primary";
  delay?: number;
  children: React.ReactNode;
}) => {
  const border: Record<string, string> = {
    green:   "border-l-emerald-500/50 bg-emerald-500/4",
    red:     "border-l-red-500/50 bg-red-500/4",
    blue:    "border-l-blue-400/50 bg-blue-400/4",
    amber:   "border-l-amber-400/50 bg-amber-400/4",
    primary: "border-l-primary/50 bg-primary/4",
  };
  const textColor: Record<string, string> = {
    green: "text-emerald-400", red: "text-red-400", blue: "text-blue-400", amber: "text-amber-400", primary: "text-primary",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-[1.5rem] border border-border/30 border-l-4 p-5 space-y-4",
        border[accent]
      )}
    >
      <div className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.5em]", textColor[accent])}>
        {icon}
        {title}
      </div>
      {children}
    </motion.div>
  );
};

// ── Transcript collapsible ────────────────────────────────────────────────────
const TranscriptBlock = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[1.5rem] border border-border/30 bg-muted/3 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-[9px] font-black uppercase tracking-[0.5em] opacity-30 hover:opacity-60 transition-opacity"
      >
        YOUR TRANSCRIPT
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm font-medium opacity-40 leading-relaxed italic border-t border-border/20 pt-4">
              "{text.trim()}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const ImpromptuReview = ({
  topic,
  duration,
  liveTranscript,
  wpm,
  totalWords,
  fillerCount,
  elapsedSecs,
  coachReport,
  loadingCoach,
  stats,
  onGoAgain,
  onNewTopic,
}: Props) => {
  const noSpeech = liveTranscript.trim().length < 15;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">

      {/* Phase dots */}
      <div className="flex items-center justify-center gap-2 pt-2">
        {["SETUP", "PREP", "SPEAKING", "REVIEW"].map((p, i) => (
          <div key={p} className={cn(
            "h-1.5 rounded-full transition-all",
            i === 3 ? "w-8 bg-primary" : "w-3 bg-foreground/15"
          )} />
        ))}
      </div>

      {/* ── Hero: Score + Verdict ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-border/40 bg-muted/4 p-8 text-center space-y-6"
      >
        {loadingCoach ? (
          <div className="py-12 flex flex-col items-center gap-5">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.5em] text-primary/60">ANALYZING</p>
              <p className="text-xs font-medium opacity-30">Reviewing your speech patterns…</p>
            </div>
          </div>
        ) : coachReport ? (
          <>
            <ScoreGauge score={coachReport.score} />
            <div className="space-y-2 max-w-md mx-auto">
              <p className="speak-serif text-base md:text-lg italic opacity-60 leading-relaxed">
                {coachReport.verdict}
              </p>
              {/* vs avg */}
              {stats.totalSessions > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  {coachReport.score > stats.avgScore ? (
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/8 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                      <TrendingUp className="h-3 w-3" />
                      +{coachReport.score - stats.avgScore} above your avg
                    </span>
                  ) : coachReport.score < stats.avgScore ? (
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/8 border border-amber-500/20 px-3 py-1.5 rounded-full">
                      <TrendingDown className="h-3 w-3" />
                      {coachReport.score - stats.avgScore} below avg
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-30 border border-border/30 px-3 py-1.5 rounded-full">
                      <Minus className="h-3 w-3" />
                      at your avg
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        ) : noSpeech ? (
          <div className="py-10 space-y-4">
            <Mic2 className="h-10 w-10 opacity-15 mx-auto" />
            <p className="text-sm font-medium opacity-30">No speech captured.</p>
            <p className="text-xs opacity-20">Enable your mic and try again.</p>
          </div>
        ) : (
          <div className="py-10">
            <p className="text-sm font-medium opacity-30">AI analysis unavailable.</p>
          </div>
        )}

        {/* Metrics strip — always visible if we have any speech */}
        {!noSpeech && !loadingCoach && (
          <div className="grid grid-cols-3 gap-3 pt-5 border-t border-border/20">
            {[
              {
                value: wpm > 0 ? wpm : "—",
                label: "WPM",
                sub: wpm === 0 ? "" : wpm < TARGET_WPM.min ? "↑ too slow" : wpm > TARGET_WPM.max ? "↓ too fast" : "✓ on pace",
                color: wpm >= TARGET_WPM.min && wpm <= TARGET_WPM.max && wpm > 0 ? "text-emerald-400" : wpm > 0 ? "text-amber-400" : "",
              },
              { value: totalWords, label: "WORDS", sub: `in ${elapsedSecs}s`, color: "" },
              {
                value: fillerCount,
                label: "FILLERS",
                sub: fillerCount === 0 ? "clean!" : fillerCount <= 2 ? "manageable" : "work on this",
                color: fillerCount > 3 ? "text-red-400" : fillerCount > 0 ? "text-amber-400" : "text-emerald-400",
              },
            ].map(m => (
              <div key={m.label} className="text-center space-y-1">
                <p className={cn("text-2xl font-black tabular-nums", m.color)}>{m.value}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-25">{m.label}</p>
                <p className="text-[8px] font-medium opacity-20">{m.sub}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── AI Coaching sections ──────────────────────────────────────── */}
      <AnimatePresence>
        {coachReport && !loadingCoach && (
          <div className="space-y-3">

            {/* Delivery notes */}
            {(coachReport.paceNote || (coachReport.fillerNote && fillerCount > 0)) && (
              <CoachCard icon={<Gauge className="h-3 w-3" />} title="DELIVERY" accent="blue" delay={0.05}>
                <div className="space-y-3">
                  {coachReport.paceNote && (
                    <p className="text-sm font-medium opacity-60 leading-relaxed">
                      <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest mr-2">PACE</span>
                      {coachReport.paceNote}
                    </p>
                  )}
                  {coachReport.fillerNote && fillerCount > 0 && (
                    <p className="text-sm font-medium opacity-60 leading-relaxed">
                      <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest mr-2">FILLERS</span>
                      {coachReport.fillerNote}
                    </p>
                  )}
                </div>
              </CoachCard>
            )}

            {/* Expand */}
            {coachReport.sayMore.length > 0 && (
              <CoachCard icon={<TrendingUp className="h-3 w-3" />} title="EXPAND ON THIS" accent="green" delay={0.1}>
                <div className="space-y-4">
                  {coachReport.sayMore.map((item, i) => (
                    <div key={i} className="space-y-1.5">
                      <p className="text-sm italic opacity-55 border-l-2 border-emerald-500/30 pl-3 leading-snug">
                        "{item.quote}"
                      </p>
                      <p className="text-xs font-medium opacity-30 pl-3">{item.why}</p>
                    </div>
                  ))}
                </div>
              </CoachCard>
            )}

            {/* Cut */}
            {coachReport.cut.length > 0 && (
              <CoachCard icon={<Scissors className="h-3 w-3" />} title="CUT THIS" accent="red" delay={0.15}>
                <div className="space-y-4">
                  {coachReport.cut.map((item, i) => (
                    <div key={i} className="space-y-1.5">
                      <p className="text-sm italic opacity-40 border-l-2 border-red-500/30 pl-3 line-through leading-snug">
                        "{item.quote}"
                      </p>
                      <p className="text-xs font-medium opacity-30 pl-3">{item.why}</p>
                    </div>
                  ))}
                </div>
              </CoachCard>
            )}

            {/* Model speech */}
            {(coachReport.shouldHaveSaid.tighter || coachReport.shouldHaveSaid.opening || coachReport.shouldHaveSaid.closing) && (
              <CoachCard icon={<Lightbulb className="h-3 w-3" />} title="MODEL SPEECH" accent="primary" delay={0.2}>
                <div className="space-y-5">
                  {coachReport.shouldHaveSaid.tighter && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-25">CORE ARGUMENT</p>
                      <p className="speak-serif text-lg italic leading-snug border-l-2 border-primary/25 pl-3">
                        "{coachReport.shouldHaveSaid.tighter}"
                      </p>
                    </div>
                  )}
                  {coachReport.shouldHaveSaid.opening && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-25">STRONGER OPENING</p>
                      <p className="text-sm font-medium italic opacity-55 border-l-2 border-primary/25 pl-3 leading-snug">
                        "{coachReport.shouldHaveSaid.opening}"
                      </p>
                    </div>
                  )}
                  {coachReport.shouldHaveSaid.closing && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-25">STRONGER CLOSING</p>
                      <p className="text-sm font-medium italic opacity-55 border-l-2 border-primary/25 pl-3 leading-snug">
                        "{coachReport.shouldHaveSaid.closing}"
                      </p>
                    </div>
                  )}
                </div>
              </CoachCard>
            )}

            {/* Framework check */}
            {coachReport.frameworkCheck.length > 0 && (
              <CoachCard icon={<Target className="h-3 w-3" />} title={`FRAMEWORK · ${topic.framework}`} accent="amber" delay={0.25}>
                <div className="grid sm:grid-cols-2 gap-2">
                  {coachReport.frameworkCheck.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border transition-all",
                        item.hit ? "border-primary/20 bg-primary/5" : "border-border/25 opacity-60"
                      )}
                    >
                      {item.hit
                        ? <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        : <Square className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-30" />
                      }
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest truncate">{item.step}</p>
                        <p className="text-[10px] font-medium opacity-35 leading-snug">{item.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CoachCard>
            )}

            {/* Next focus */}
            {coachReport.nextFocus && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-5"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-primary/60 mb-2">NEXT SESSION FOCUS</p>
                <p className="text-sm font-medium opacity-65 leading-relaxed">{coachReport.nextFocus}</p>
              </motion.div>
            )}

            {/* Transcript collapsible */}
            {liveTranscript && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <TranscriptBlock text={liveTranscript} />
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: loadingCoach ? 0 : 0.4 }}
        className="flex flex-col sm:flex-row gap-3 pt-2"
      >
        <button
          onClick={onGoAgain}
          className="button-pill flex-1 py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3 group"
        >
          <RotateCcw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
          <span className="text-sm font-black uppercase tracking-[0.25em]">GO AGAIN</span>
        </button>
        <button
          onClick={onNewTopic}
          className="button-pill flex-1 py-5 border border-border/50 flex items-center justify-center gap-3 hover:border-primary/30 hover:text-primary transition-all group"
        >
          <Shuffle className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
          <span className="text-sm font-black uppercase tracking-[0.25em]">NEW TOPIC</span>
        </button>
      </motion.div>
    </div>
  );
};
