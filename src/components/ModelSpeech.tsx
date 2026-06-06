import { useEffect, useRef, useState } from "react";
import { Mic, Play, Pause, Loader2 } from "lucide-react";
import { speakWithDeepgramTTS } from "@/services/geminiService";
import { cn } from "@/lib/utils";

/**
 * ONE fixed voice for every model speech across the entire app. The model
 * speech is "the ideal answer" — it should always sound like the same coach,
 * never the user's opponent voice and never a per-name hash. Deepgram Aura
 * "Orion" is a warm, authoritative read. Change it here and it changes
 * everywhere — that's the point.
 */
const MODEL_SPEECH_VOICE = "aura-orion-en";

/**
 * Deterministic browser-TTS fallback voice, used only when the ai-tts edge
 * function is unavailable. Picks a stable en-US voice by name so the fallback
 * stays as consistent as the platform allows rather than grabbing a random
 * system default.
 */
function pickFallbackVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  if (!voices.length) return null;
  const preferred = [
    "Google US English",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Samantha",
    "Daniel",
  ];
  for (const name of preferred) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  return (
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang?.startsWith("en")) ??
    voices[0]
  );
}

interface ModelSpeechProps {
  /** The model/example speech text to display and read aloud. */
  text: string;
  /** Header label. Defaults to "Model speech". */
  label?: string;
  /** Tighter padding + smaller type for dense result cards. */
  compact?: boolean;
  className?: string;
}

/**
 * Shows the AI's model speech (the ideal answer) and lets the user HEAR it
 * delivered, in a single fixed voice, after they finish their own recording.
 * Used on every scored result screen so the "here's how it's done" moment is
 * consistent app-wide. Click-to-play only (no autoplay).
 */
export function ModelSpeech({ text, label = "Model speech", compact = false, className }: ModelSpeechProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const usingFallbackRef = useRef(false);

  // Stop any audio / cancel any browser speech when this unmounts.
  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (usingFallbackRef.current) window.speechSynthesis?.cancel();
  }, []);

  const stop = () => {
    audioRef.current?.pause();
    if (usingFallbackRef.current) window.speechSynthesis?.cancel();
    setPlaying(false);
  };

  // Browser SpeechSynthesis fallback — only when Deepgram TTS is unavailable.
  const playFallback = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    const v = pickFallbackVoice();
    if (v) u.voice = v;
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => setPlaying(false);
    usingFallbackRef.current = true;
    synth.cancel();
    synth.speak(u);
    setPlaying(true);
  };

  const toggle = async () => {
    // Existing Deepgram audio → just toggle play/pause (no refetch).
    if (audioRef.current) {
      if (audioRef.current.paused) { audioRef.current.play().catch(() => {}); setPlaying(true); }
      else { audioRef.current.pause(); setPlaying(false); }
      return;
    }
    if (playing) { stop(); return; }

    setLoading(true);
    try {
      const audio = await speakWithDeepgramTTS(text, MODEL_SPEECH_VOICE);
      usingFallbackRef.current = false;
      audio.onended = () => setPlaying(false);
      audioRef.current = audio;
      audio.play().catch(() => {});
      setPlaying(true);
    } catch {
      // Edge function down / no key — still give them a spoken read.
      playFallback();
    } finally {
      setLoading(false);
    }
  };

  if (!text?.trim()) return null;

  return (
    <div
      className={cn(
        "bg-primary/5 border border-primary/20 rounded-2xl",
        compact ? "p-4 space-y-2" : "p-6 md:p-8 space-y-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2",
            compact ? "text-[9px]" : "text-xs md:text-sm",
          )}
        >
          <Mic className={compact ? "h-3 w-3" : "h-4 w-4"} /> {label}
        </p>

        <button
          onClick={toggle}
          disabled={loading}
          aria-label={playing ? "Stop model speech" : "Play model speech"}
          className="btn-tactile btn-tactile-primary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {loading ? "Loading" : playing ? "Stop" : "Hear it"}
        </button>
      </div>

      <p
        className={cn(
          "speak-serif italic leading-relaxed opacity-80 whitespace-pre-wrap break-words",
          compact ? "text-sm" : "text-base md:text-lg",
        )}
      >
        "{text}"
      </p>
    </div>
  );
}
