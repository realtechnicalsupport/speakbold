import { Lock, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ImpromptuTopic } from "@/data/impromptuTopics";
import { FRAMEWORKS, PREP_TIME } from "@/data/impromptuTopics";

interface Props {
  topic: ImpromptuTopic;
  secondsLeft: number;
  /** Total prep length for this session (may be the competition 3-min override,
   *  not just the difficulty default). Falls back to the difficulty value. */
  totalPrep?: number;
  challengeMode: boolean;
  /** The committed opening line (controlled). */
  openingLine?: string;
  onSetOpeningLine?: (v: string) => void;
  onSkip: () => void;
}

export const ImpromptuPrep = ({ topic, secondsLeft, totalPrep, challengeMode, openingLine, onSetOpeningLine, onSkip }: Props) => {
  const framework = FRAMEWORKS[topic.framework];
  const resolvedTotal = totalPrep && totalPrep > 0 ? totalPrep : (PREP_TIME[topic.difficulty] ?? 10);
  const pct = resolvedTotal > 0 ? secondsLeft / resolvedTotal : 0;

  // SVG ring
  const r = 88;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-between py-12 overflow-hidden">

      {/* Atmospheric amber glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/6 blur-[100px]" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-2">
        {["SETUP", "PREP", "SPEAKING", "REVIEW"].map((p, i) => (
          <div key={p} className="flex items-center gap-2">
            <div className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i === 1 ? "w-8 bg-amber-400" : "w-3 bg-foreground/15"
            )} />
          </div>
        ))}
      </div>

      {/* Countdown ring + number */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-[220px] h-[220px] flex items-center justify-center">
          {/* SVG ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 220 220">
            {/* Track */}
            <circle cx="110" cy="110" r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-amber-500/10"
            />
            {/* Progress */}
            <motion.circle
              cx="110" cy="110" r={r}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.9s linear" }}
            />
          </svg>

          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-amber-500/15"
            animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Number — m:ss for long (competition) preps, bare seconds for short. */}
          <div className="relative z-10 text-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={secondsLeft}
                initial={{ opacity: 0.4, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "speak-serif font-bold leading-none text-amber-400 tabular-nums block",
                  resolvedTotal >= 60 ? "text-[5rem]" : "text-[7rem]"
                )}
              >
                {resolvedTotal >= 60
                  ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : secondsLeft}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs font-black uppercase tracking-[0.6em] text-amber-500/70">PREP TIME</p>
          <p className="text-sm font-medium opacity-30">Structure your thoughts. Speaking begins automatically.</p>
        </div>
      </div>

      {/* Topic + Framework */}
      <div className="w-full max-w-2xl space-y-4 px-4">
        {/* Topic */}
        <div className="rounded-[2rem] border border-amber-500/15 bg-amber-500/4 p-6 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-amber-500/50 mb-3">YOUR TOPIC</p>
          <p className="speak-serif text-xl md:text-2xl leading-snug opacity-80">
            "{topic.text}"
          </p>
        </div>

        {/* Lock your first line — trains a confident, planned open. The text is
            shown back to you for the first seconds of the speech so you deliver
            the open you planned instead of improvising the riskiest moment. */}
        {onSetOpeningLine && (
          <div className="rounded-[2rem] border border-sky-500/20 bg-sky-500/4 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-sky-400/70">LOCK YOUR FIRST LINE</p>
              <p className="text-[9px] font-medium opacity-25">optional</p>
            </div>
            <input
              value={openingLine ?? ""}
              onChange={e => onSetOpeningLine(e.target.value)}
              maxLength={140}
              placeholder="Type the exact sentence you'll open with…"
              className="w-full bg-transparent border-b border-sky-500/20 focus:border-sky-400/60 outline-none py-2 text-sm md:text-base placeholder:opacity-25 transition-colors"
            />
            <p className="text-[10px] font-medium opacity-25 leading-relaxed">
              A strong open is a sentence you've already decided — not one you find mid-breath.
            </p>
          </div>
        )}

        {/* Framework scaffold */}
        <AnimatePresence mode="wait">
          {challengeMode ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-3 py-5 border border-dashed border-amber-500/20 rounded-[2rem]"
            >
              <Lock className="h-3.5 w-3.5 text-amber-500/40" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-500/40">
                CHALLENGE MODE · HINTS HIDDEN
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="hints"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-[2rem] border border-border/30 bg-muted/4 p-5 space-y-4"
            >
              {framework && (
                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">
                  {framework.name} · {framework.expanded}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {topic.hints.map((hint, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/5 border border-border/30"
                  >
                    <span className="speak-serif text-lg italic text-primary/30 leading-none shrink-0">{i + 1}</span>
                    <span className="text-xs font-medium opacity-50 leading-snug">{hint}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.5em] opacity-15 hover:opacity-40 transition-opacity"
      >
        SKIP PREP <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
};
