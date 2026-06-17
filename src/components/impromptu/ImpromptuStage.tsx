import { Pause, Play, Square, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { isMobileDevice } from "@/lib/isMobileDevice";
import type { ImpromptuTopic } from "@/data/impromptuTopics";
import { ImpromptuHUD } from "./ImpromptuHUD";

interface Props {
  topic: ImpromptuTopic;
  duration: number;
  secondsLeft: number;
  isPaused: boolean;
  wpm: number;
  totalWords: number;
  fillerCount: number;
  elapsedSecs: number;
  liveInterim: string;
  speechSupported: boolean;
  curveballText: string | null;
  curveballVisible: boolean;
  /** The opening line the speaker committed to in prep — surfaced briefly at the
   *  start of the speech so they actually deliver the open they planned. */
  openingLine?: string;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

// Where the speech "should" be by now, sized to the duration. Opening = first
// 15%, Close = last 15%, Body in between. Purely time-driven, so it works on
// mobile too (no transcript needed). Trains pacing/structure: the speaker can
// see whether they're lingering in the open or coasting toward an early finish.
const PacingBar = ({ elapsedSecs, duration }: { elapsedSecs: number; duration: number }) => {
  const pct = duration > 0 ? Math.min(1, elapsedSecs / duration) : 0;
  const section = pct < 0.15 ? "OPENING" : pct < 0.85 ? "BODY" : "CLOSE";
  const hint =
    section === "OPENING" ? "Own your first line" :
    section === "BODY" ? "Build your points" :
    "Land it — wrap up";
  const sectionColor =
    section === "OPENING" ? "text-sky-400" :
    section === "BODY" ? "text-primary" :
    "text-amber-400";

  return (
    <div className="w-full space-y-2">
      <div className="relative h-2 rounded-full bg-foreground/8 overflow-hidden">
        {/* zone dividers at 15% and 85% */}
        <div className="absolute inset-y-0 left-[15%] w-px bg-foreground/15" />
        <div className="absolute inset-y-0 left-[85%] w-px bg-foreground/15" />
        {/* elapsed fill */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear",
            section === "CLOSE" ? "bg-amber-400" : "bg-primary"
          )}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={cn("text-[9px] font-black uppercase tracking-[0.4em]", sectionColor)}>{section}</span>
        <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">{hint}</span>
      </div>
    </div>
  );
};

// Animated voice-activity bars
const VoiceBars = ({ active }: { active: boolean }) => (
  <div className="flex items-end gap-0.5 h-5">
    {[0.7, 1.2, 0.5, 0.9, 0.6, 1.1, 0.4].map((speed, i) => (
      <motion.div
        key={i}
        className="w-0.5 rounded-full bg-primary/50"
        animate={active ? {
          scaleY: [0.2, 1, 0.4, 0.8, 0.2],
        } : { scaleY: 0.15 }}
        transition={active ? {
          duration: speed,
          delay: i * 0.07,
          repeat: Infinity,
          ease: "easeInOut",
        } : { duration: 0.4 }}
        style={{ height: "20px", transformOrigin: "bottom" }}
      />
    ))}
  </div>
);

export const ImpromptuStage = ({
  topic,
  duration,
  secondsLeft,
  isPaused,
  wpm,
  totalWords,
  fillerCount,
  elapsedSecs,
  liveInterim,
  speechSupported,
  curveballText,
  curveballVisible,
  openingLine,
  onPause,
  onResume,
  onStop,
}: Props) => {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct = duration > 0 ? secondsLeft / duration : 0;
  const isLow = secondsLeft > 0 && secondsLeft <= 10;
  const isActive = !isPaused && secondsLeft > 0;

  // Pacing only earns its space on longer speeches; for a 30s drill it's noise.
  const showPacing = duration >= 90;
  // The opening window — surface the planned first line here (weakness: starting
  // confidently). Sized so it's meaningful on a 1–3 min speech, gone by the time
  // the speaker is into their body.
  const inOpening = !isPaused && elapsedSecs < 15 && duration >= 60;

  // Mobile skips live Web Speech (recorded audio is transcribed server-side after
  // the turn), so there's no live transcript to drive WPM/word metrics here. Hide
  // the live HUD + voice bars on mobile — the figures only arrive on the review
  // screen once the recording is analysed.
  const liveMetrics = speechSupported && !isMobileDevice();

  // SVG ring
  const r = 115;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="relative min-h-[92vh] flex flex-col items-center justify-between py-10 overflow-hidden">

      {/* Atmospheric background shift */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-700">
        {isLow && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(239,68,68,0.06),transparent_70%)]"
          />
        )}
        {!isPaused && !isLow && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(var(--primary-rgb,139,92,246),0.04),transparent_60%)]" />
        )}
      </div>

      {/* Phase dots */}
      <div className="relative z-10 flex items-center gap-2">
        {["SETUP", "PREP", "SPEAKING", "REVIEW"].map((p, i) => (
          <div key={p} className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            i === 2 ? "w-8 bg-primary" : "w-3 bg-foreground/15"
          )} />
        ))}
      </div>

      {/* Top: topic + LIVE badge */}
      <div className="relative z-10 w-full max-w-xl flex items-start justify-between gap-4 px-4">
        <p className="text-sm italic opacity-70 flex-1 leading-snug">"{topic.text}"</p>

        <div className="flex items-center gap-3 shrink-0">
          {liveMetrics && (
            <VoiceBars active={isActive && totalWords > 0} />
          )}
          {!isPaused ? (
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-red-400">LIVE</span>
            </div>
          ) : (
            <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">PAUSED</span>
          )}
        </div>
      </div>

      {/* Curveball banner */}
      <AnimatePresence>
        {curveballVisible && curveballText && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="absolute top-24 inset-x-4 z-30 max-w-lg mx-auto"
          >
            <div className="relative rounded-[1.75rem] border border-primary/50 bg-primary/15 backdrop-blur-md p-5 text-center overflow-hidden shadow-[0_8px_32px_rgba(139,92,246,0.3)]">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
              <div className="relative flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-[0.5em] text-primary/80">CURVEBALL</span>
                </div>
                <p className="text-base font-bold leading-snug">{curveballText}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Opening-line reminder — deliver the open you planned in prep */}
      <AnimatePresence>
        {inOpening && openingLine && openingLine.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute top-24 inset-x-4 z-30 max-w-lg mx-auto"
          >
            <div className="rounded-[1.5rem] border border-sky-500/40 bg-sky-500/10 backdrop-blur-md p-4 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-sky-400/80 mb-1.5">YOUR OPENING</p>
              <p className="text-sm font-bold leading-snug">"{openingLine}"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TIMER — the centerpiece ──────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative w-[280px] h-[280px] flex items-center justify-center">
          {/* Outer glow pulse when active */}
          {isActive && (
            <motion.div
              className="absolute inset-[-16px] rounded-full"
              style={{
                background: isLow
                  ? "radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)"
              }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* SVG ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 280 280"
            fill="none"
          >
            {/* Track */}
            <circle
              cx="140" cy="140" r={r}
              stroke="currentColor"
              strokeWidth="2.5"
              className={cn(
                "transition-colors duration-700",
                isLow ? "text-red-500/12" : "text-primary/10"
              )}
            />
            {/* Progress arc */}
            <circle
              cx="140" cy="140" r={r}
              stroke={isLow ? "#ef4444" : "hsl(var(--primary))"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s ease" }}
            />
          </svg>

          {/* Timer text */}
          <div className="relative z-10 text-center space-y-1">
            <div className={cn(
              "speak-serif tabular-nums font-bold tracking-tighter leading-none transition-colors duration-500",
              "text-[5.5rem] md:text-[6.5rem]",
              isLow ? "text-red-500" : isPaused ? "opacity-25" : ""
            )}>
              {mins > 0
                ? <>{mins}<span className={cn(isPaused ? "" : "animate-pulse")}>:</span>{String(secs).padStart(2, "0")}</>
                : <>{String(secs)}</>
              }
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.6em] opacity-20">
              {isPaused ? "PAUSED" : isLow ? "FINISH STRONG" : "REMAINING"}
            </p>
          </div>
        </div>

        {/* HUD */}
        {liveMetrics && (
          <div className="w-full max-w-[280px]">
            <ImpromptuHUD
              wpm={wpm}
              totalWords={totalWords}
              fillerCount={fillerCount}
              elapsedSecs={elapsedSecs}
            />
          </div>
        )}

        {/* Pacing bar — open / body / close guide (time-driven, mobile too) */}
        {showPacing && (
          <div className="w-full max-w-[300px]">
            <PacingBar elapsedSecs={elapsedSecs} duration={duration} />
          </div>
        )}

        {/* Live caption */}
        <AnimatePresence mode="wait">
          {liveInterim && (
            <motion.p
              key={liveInterim.slice(0, 20)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-center italic opacity-25 max-w-sm px-6 leading-relaxed"
            >
              {liveInterim}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="relative z-10 w-full max-w-[260px] space-y-4">
        <AnimatePresence mode="wait">
          {isPaused ? (
            <motion.button
              key="resume"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              onClick={onResume}
              className="button-pill w-full py-5 bg-primary text-white shadow-glow flex items-center justify-center gap-3"
            >
              <Play className="h-4 w-4 fill-current" />
              <span className="text-sm font-black uppercase tracking-[0.25em]">RESUME</span>
            </motion.button>
          ) : (
            <motion.button
              key="pause"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              onClick={onPause}
              className="button-pill w-full py-5 border border-foreground/15 flex items-center justify-center gap-3 hover:border-primary/30 hover:text-primary transition-all"
            >
              <Pause className="h-4 w-4 fill-current" />
              <span className="text-sm font-black uppercase tracking-[0.25em]">PAUSE</span>
            </motion.button>
          )}
        </AnimatePresence>

        <button
          onClick={onStop}
          className="w-full text-center text-[9px] font-black uppercase tracking-[0.5em] opacity-15 hover:opacity-50 transition-opacity py-2 flex items-center justify-center gap-2"
        >
          <Square className="h-2.5 w-2.5 fill-current" />
          STOP EARLY
        </button>
      </div>
    </div>
  );
};
