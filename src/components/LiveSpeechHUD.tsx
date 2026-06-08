import { motion, AnimatePresence } from "framer-motion";
import { Gauge, AlertTriangle, Type, Captions } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveSpeechMetrics } from "@/hooks/useLiveSpeechMetrics";

/**
 * Live speaking HUD — real-time WPM, filler tally, word count, and rolling
 * captions. Turns a passive countdown into a reactive drill. Shared by the
 * Public Speaking and Interview active phases. Renders nothing useful on
 * unsupported browsers/phones beyond a quiet hint, so it degrades gracefully.
 */

// Conversational sweet spot is ~110–160 wpm; flag clearly too-fast/too-slow.
const paceZone = (wpm: number): { label: string; color: string } => {
  if (wpm === 0) return { label: "—", color: "opacity-40" };
  if (wpm < 100) return { label: "Slow", color: "text-amber-400" };
  if (wpm > 175) return { label: "Fast", color: "text-red-400" };
  return { label: "On pace", color: "text-emerald-400" };
};

export const LiveSpeechHUD = ({
  metrics,
  active,
  className,
}: {
  metrics: LiveSpeechMetrics;
  /** True while actually speaking (running and not paused) — drives the pulse. */
  active: boolean;
  className?: string;
}) => {
  const { liveTranscript, liveInterim, fillerCount, totalWords, wpm, speechSupported } = metrics;

  if (!speechSupported) {
    return (
      <div className={cn("rounded-2xl border border-border/60 bg-muted/5 p-5 flex items-center gap-3", className)}>
        <Captions className="h-4 w-4 text-primary opacity-50 shrink-0" />
        <p className="text-xs font-medium opacity-50 leading-snug">
          Live captions &amp; pace tracking run in a desktop browser. Your recording is still scored after the drill.
        </p>
      </div>
    );
  }

  const pace = paceZone(wpm);
  const hasContent = liveTranscript.length > 0 || liveInterim.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Metric pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/60 bg-muted/5 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">
            <Gauge className="h-3 w-3" /> WPM
          </div>
          <p className="speak-serif text-2xl md:text-3xl tabular-nums leading-none">{wpm || "—"}</p>
          <p className={cn("text-[9px] font-black uppercase tracking-widest mt-1", pace.color)}>{pace.label}</p>
        </div>

        <div className={cn(
          "rounded-2xl border p-4 text-center transition-colors",
          fillerCount > 0 ? "border-amber-400/30 bg-amber-400/5" : "border-border/60 bg-muted/5"
        )}>
          <div className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">
            <AlertTriangle className="h-3 w-3" /> FILLERS
          </div>
          <p className={cn("speak-serif text-2xl md:text-3xl tabular-nums leading-none", fillerCount > 0 && "text-amber-400")}>
            {fillerCount}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-40">um · uh · like</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/5 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">
            <Type className="h-3 w-3" /> WORDS
          </div>
          <p className="speak-serif text-2xl md:text-3xl tabular-nums leading-none">{totalWords}</p>
          <p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-40">spoken</p>
        </div>
      </div>

      {/* Rolling captions */}
      <div className="rounded-2xl border border-border/60 bg-muted/5 p-5 min-h-[5.5rem] relative overflow-hidden">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mb-2">
          <Captions className="h-3 w-3" />
          Live captions
          {active && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
        </div>
        <AnimatePresence mode="wait">
          {hasContent ? (
            <motion.p
              key="caption"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm md:text-base leading-relaxed"
            >
              {/* Show only the tail so it reads like a scrolling caption line. */}
              <span className="opacity-70">…{liveTranscript.split(/\s+/).slice(-26).join(" ")}</span>
              {liveInterim && <span className="opacity-40 italic"> {liveInterim}</span>}
            </motion.p>
          ) : (
            <p className="text-sm opacity-30 italic">
              {active ? "Listening… start speaking and your words appear here." : "Hit start — your words will stream here in real time."}
            </p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
