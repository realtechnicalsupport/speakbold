import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic2, Copy, Check, Shuffle, ClipboardList, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClipPlayer } from "@/components/ClipPlayer";
import type { ImpromptuTopic } from "@/data/impromptuTopics";
import {
  segmentTranscript,
  countFillerTypes,
  totalFillers,
  buildCoachExport,
} from "@/lib/impromptuExport";

interface Props {
  topic: ImpromptuTopic;
  liveTranscript: string;
  wpm: number;
  totalWords: number;
  elapsedSecs: number;
  duration: number;            // target speak length (seconds)
  prepNotes: string;
  openingLine?: string;
  recordingBlobUrl: string | null;
  recordingDurationMs: number | null;
  /** True while the recording is being transcribed server-side (mobile path). */
  processing: boolean;
  onGoAgain: () => void;
  onNewTopic: () => void;
}

export const ImpromptuCoachExport = ({
  topic, liveTranscript, wpm, totalWords, elapsedSecs, duration,
  prepNotes, openingLine, recordingBlobUrl, recordingDurationMs,
  processing, onGoAgain, onNewTopic,
}: Props) => {
  const transcript = liveTranscript.trim();
  const noSpeech = transcript.length < 15;

  // The recording's wall-clock length is the most accurate spoken duration when
  // available (mobile); otherwise fall back to the elapsed timer.
  const durationSec = recordingDurationMs && recordingDurationMs > 0
    ? Math.round(recordingDurationMs / 1000)
    : elapsedSecs;

  const segments = useMemo(() => segmentTranscript(transcript), [transcript]);
  const fillerTypes = useMemo(() => countFillerTypes(transcript).filter(f => f.count > 0), [transcript]);
  const fillerTotal = useMemo(() => totalFillers(transcript), [transcript]);

  const exportText = useMemo(
    () => buildCoachExport({
      topicText: topic.text,
      prepNotes,
      openingLine,
      transcript,
      durationSec,
      targetSec: duration,
      wpm,
      totalWords,
    }),
    [topic.text, prepNotes, openingLine, transcript, durationSec, duration, wpm, totalWords]
  );

  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard API blocked (insecure context / permissions) — fall back to
      // selecting the preview textarea so the user can copy manually.
      const el = previewRef.current;
      if (el) { el.focus(); el.select(); }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-20">
      {/* Phase dots */}
      <div className="flex items-center justify-center gap-2 pt-2 pb-1">
        {["SETUP", "PREP", "SPEAKING", "REVIEW"].map((_, i) => (
          <div key={i} className={cn("h-1.5 rounded-full transition-all",
            i === 3 ? "w-8 bg-primary" : "w-3 bg-foreground/15")} />
        ))}
      </div>

      {processing ? (
        <div className="rounded-[2rem] border border-border/30 bg-muted/4 py-14 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -7, 0] }}
                transition={{ duration: 1.3, delay: i * 0.18, repeat: Infinity, ease: "easeInOut" }} />
            ))}
          </div>
          <p className="text-sm font-medium opacity-60">Transcribing your speech…</p>
        </div>
      ) : noSpeech ? (
        <div className="rounded-[2rem] border border-border/30 bg-muted/4 py-12 flex flex-col items-center gap-3">
          <Mic2 className="h-9 w-9 opacity-10" />
          <p className="text-sm font-medium opacity-60">No speech captured.</p>
          <p className="text-xs opacity-15">Enable your mic and try again.</p>
        </div>
      ) : (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-border/30 bg-muted/4 p-4">
              <span className="text-[11px] font-black uppercase tracking-[0.35em] opacity-50">TIME</span>
              <p className="text-3xl font-black tabular-nums mt-2">{durationSec}<span className="text-base opacity-40">s</span></p>
              <p className="text-[10px] opacity-40 mt-1">target {duration}s</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-muted/4 p-4">
              <span className="text-[11px] font-black uppercase tracking-[0.35em] opacity-50">WORDS</span>
              <p className="text-3xl font-black tabular-nums mt-2">{totalWords}</p>
              <p className="text-[10px] opacity-40 mt-1">{wpm > 0 ? `${wpm} wpm` : "—"}</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-muted/4 p-4">
              <span className="text-[11px] font-black uppercase tracking-[0.35em] opacity-50">FILLERS</span>
              <p className={cn("text-3xl font-black tabular-nums mt-2",
                fillerTotal === 0 ? "text-emerald-400" : fillerTotal <= 3 ? "text-amber-400" : "text-red-400")}>
                {fillerTotal}
              </p>
              <p className="text-[10px] opacity-40 mt-1">{fillerTotal === 0 ? "clean!" : "flagged"}</p>
            </div>
          </div>

          {/* Prep notes */}
          {prepNotes.trim() && (
            <div className="rounded-[1.5rem] border border-border/25 bg-muted/3 p-5 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-50">PREP NOTES</p>
              <p className="text-sm opacity-60 leading-relaxed whitespace-pre-wrap">{prepNotes.trim()}</p>
            </div>
          )}

          {/* Opening line */}
          {openingLine && openingLine.trim() && (
            <div className="rounded-[1.5rem] border border-sky-500/20 bg-sky-500/4 p-5 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-sky-400/60">PLANNED OPENING</p>
              <p className="text-sm italic opacity-70 leading-relaxed">"{openingLine.trim()}"</p>
            </div>
          )}

          {/* Transcript with inline filler highlights */}
          <div className="rounded-[1.5rem] border border-border/25 bg-muted/3 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Mic2 className="h-3 w-3 opacity-50" />
              <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-50">TRANSCRIPT</span>
            </div>
            <p className="text-base font-medium opacity-70 leading-relaxed">
              {segments.map((seg, i) =>
                seg.isFiller
                  ? <mark key={i} className="bg-red-500/20 text-red-400 rounded px-0.5">{seg.text}</mark>
                  : <span key={i}>{seg.text}</span>
              )}
            </p>

            {/* Per-word filler summary */}
            {fillerTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/20">
                {fillerTypes.map(f => (
                  <span key={f.word}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-500/25 bg-red-500/8 text-red-300/80">
                    {f.word}<span className="tabular-nums opacity-70">×{f.count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recording playback */}
          {recordingBlobUrl && (
            <div className="rounded-[1.5rem] border border-border/25 bg-muted/3 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-3 w-3 opacity-50" />
                <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-50">YOUR RECORDING</span>
              </div>
              <ClipPlayer src={recordingBlobUrl} durationMs={recordingDurationMs} />
            </div>
          )}

          {/* Copy to Coach */}
          <button
            onClick={handleCopy}
            className={cn(
              "w-full button-pill py-5 flex items-center justify-center gap-3 transition-all",
              copied ? "bg-emerald-500 text-white" : "bg-primary text-white shadow-glow"
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="text-sm font-black uppercase tracking-[0.25em]">
              {copied ? "Copied!" : "Copy to Coach"}
            </span>
          </button>

          {/* Raw export preview — always available as a manual-copy fallback */}
          <details className="rounded-[1.5rem] border border-border/25 bg-muted/3 overflow-hidden group">
            <summary className="cursor-pointer list-none flex items-center gap-2 px-5 py-3.5 hover:bg-foreground/3 transition-colors">
              <ClipboardList className="h-3 w-3 opacity-50" />
              <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-50">Preview export text</span>
            </summary>
            <div className="px-5 pb-5 pt-1">
              <textarea
                ref={previewRef}
                readOnly
                value={exportText}
                onFocusCapture={e => e.currentTarget.select()}
                className="w-full h-64 rounded-xl bg-background/60 border border-border/30 p-3 text-xs font-mono leading-relaxed resize-y outline-none focus:border-primary/40"
              />
            </div>
          </details>
        </>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
        <button
          onClick={onGoAgain}
          className="button-pill flex-1 py-5 border border-border/40 flex items-center justify-center gap-3 hover:border-primary/30 hover:text-primary transition-all group"
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
    </div>
  );
};
