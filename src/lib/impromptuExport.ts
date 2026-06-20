// ── Coach-export helpers ──────────────────────────────────────────────────────
// Pure functions that turn a captured impromptu session into clean text for a
// human (or a separate Claude session) to review. No AI, no scoring — the app's
// job here is faithful capture + formatting, nothing more.

// The exact filler set to flag, per the speaker's request. "so" is included even
// though it's frequently a legitimate connective — we flag every instance and
// let the human coach decide which were filler. Order doesn't matter here; the
// matcher sorts longest-first so multi-word phrases ("you know") win.
export const EXPORT_FILLER_WORDS = [
  "um", "uh", "like", "you know", "so", "basically", "literally",
] as const;

export interface FillerSegment {
  text: string;
  isFiller: boolean;
}

function buildPattern(): RegExp {
  // Longest phrases first so "you know" matches as one unit before any
  // single-word rule could split it.
  const sorted = [...EXPORT_FILLER_WORDS].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(w => w.replace(/ /g, "\\s+")).join("|");
  return new RegExp(`\\b(${escaped})\\b`, "gi");
}

/** Split a transcript into ordered segments, flagging filler runs — for inline
 *  highlighting in the UI without dangerouslySetInnerHTML. */
export function segmentTranscript(text: string): FillerSegment[] {
  const pattern = buildPattern();
  const segs: FillerSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), isFiller: false });
    segs.push({ text: m[0], isFiller: true });
    last = m.index + m[0].length;
    if (m.index === pattern.lastIndex) pattern.lastIndex++; // guard against zero-width
  }
  if (last < text.length) segs.push({ text: text.slice(last), isFiller: false });
  return segs;
}

/** Per-word filler counts (only the requested set). */
export function countFillerTypes(text: string): { word: string; count: number }[] {
  return EXPORT_FILLER_WORDS.map(w => {
    const re = new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "gi");
    return { word: w, count: (text.match(re) || []).length };
  });
}

export function totalFillers(text: string): number {
  return countFillerTypes(text).reduce((n, f) => n + f.count, 0);
}

/** Transcript with each flagged filler wrapped in [brackets] — for the clipboard. */
export function bracketFillers(text: string): string {
  return text.replace(buildPattern(), m => `[${m}]`);
}

import type { VoiceMetrics } from "@/lib/voiceAnalysis";

export interface CoachExportInput {
  topicText: string;
  prepNotes: string;
  openingLine?: string;
  transcript: string;
  durationSec: number;
  targetSec: number;
  wpm: number;
  totalWords: number;
  voice?: VoiceMetrics | null;
}

/** The single block of text the "Copy to Coach" button puts on the clipboard. */
export function buildCoachExport(i: CoachExportInput): string {
  const fillers = countFillerTypes(i.transcript).filter(f => f.count > 0);
  const total = fillers.reduce((n, f) => n + f.count, 0);
  const fillerLines = fillers.length
    ? fillers.map(f => `  - ${f.word}: ${f.count}`).join("\n")
    : "  (none detected)";

  const lines: string[] = [
    "IMPROMPTU SPEECH — FOR COACH REVIEW",
    "",
    `Topic: "${i.topicText}"`,
    `Speech duration: ${i.durationSec}s (target ${i.targetSec}s)`,
    `Pace: ${i.wpm > 0 ? `${i.wpm} wpm` : "n/a"} · Words: ${i.totalWords}`,
    "",
    "PREP NOTES / OUTLINE:",
    i.prepNotes.trim() || "(none)",
    "",
  ];

  if (i.openingLine && i.openingLine.trim()) {
    lines.push("PLANNED OPENING:", `"${i.openingLine.trim()}"`, "");
  }

  if (i.voice) {
    const v = i.voice;
    lines.push(
      "DELIVERY (approximate, on-device acoustic analysis):",
      `  - Average pitch: ${v.meanPitchHz} Hz`,
      `  - Pitch variation: ${v.pitchRangeLabel} (±${v.pitchStdHz} Hz)`,
      `  - Volume dynamics: ${v.volumeDynamicsLabel}`,
      `  - Voiced/projected: ${v.voicedPct}% of speaking time`,
      `  - Pauses (>0.6s): ${v.pauseCount}${v.longestPauseSec > 0 ? ` (longest ${v.longestPauseSec}s)` : ""}`,
      "",
    );
  }

  lines.push(
    "TRANSCRIPT (fillers in [brackets]):",
    bracketFillers(i.transcript.trim()) || "(no speech captured)",
    "",
    `FILLER SUMMARY — total ${total}:`,
    fillerLines,
  );

  return lines.join("\n");
}
