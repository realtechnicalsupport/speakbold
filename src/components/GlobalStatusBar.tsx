import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { useTimerActive, useTimerSeconds } from "@/lib/timerState";
import { useRecordingActive, useActiveStream } from "@/lib/recordingState";

const BAR_COUNT = 6;

/**
 * GlobalStatusBar — fixed floating pill shown whenever a timer session is active.
 *  • Left pill : arc progress + countdown + LIVE dot
 *  • Right pill: live mic waveform bars (shown when recording; nothing otherwise)
 *
 * The old "MIC OFF" warning has been removed — it was a false positive caused by
 * the recording state not being synchronised with the timer state at mount time.
 */
export const GlobalStatusBar = () => {
  const timerActive  = useTimerActive();
  const isRecording  = useRecordingActive();
  const stream       = useActiveStream();
  const { seconds, duration } = useTimerSeconds();

  // Bar DOM refs — heights driven directly by the RAF loop, no React state.
  const barsRef     = useRef<(HTMLDivElement | null)[]>(Array(BAR_COUNT).fill(null));
  const smoothRef   = useRef<number[]>(Array(BAR_COUNT).fill(0));
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef      = useRef(0);

  // ── Audio analyser for waveform bars ─────────────────────────────────────
  useEffect(() => {
    if (!isRecording || !stream) return;
    let cancelled = false;

    (async () => {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();
        if (cancelled) { ctx.close(); return; }

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.65;
        ctx.createMediaStreamSource(stream).connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const loop = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          const binCount = analyser.frequencyBinCount;

          for (let i = 0; i < BAR_COUNT; i++) {
            const bin = Math.floor((i / BAR_COUNT) * binCount * 0.4);
            const raw = data[bin] / 255;
            smoothRef.current[i] = smoothRef.current[i] * 0.45 + raw * 0.55;
            const h = 12 + smoothRef.current[i] * 88;
            const el = barsRef.current[i];
            if (el) el.style.height = `${h}%`;
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error("[GlobalStatusBar] analyser error:", err);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      smoothRef.current = Array(BAR_COUNT).fill(0);
      // Reset bars to resting height
      barsRef.current.forEach(el => { if (el) el.style.height = "12%"; });
    };
  }, [isRecording, stream]);

  // ── Timer math ────────────────────────────────────────────────────────────
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct  = duration > 0 ? seconds / duration : 1;
  const R    = 10;
  const CIRC = 2 * Math.PI * R;
  const dash = pct * CIRC;

  // Timer pill only when a real countdown is running. The arena never publishes
  // a timer (setTimerSeconds is only called by impromptu/interview/public-speaking),
  // so duration stays 0 there → no meaningless "0:00 LIVE" pill during battles.
  const showTimer = timerActive && duration > 0;
  // Mic pill only when a live recording stream exists (the actual battle/speech).
  const showMic = isRecording && !!stream;

  if (!showTimer && !showMic) return null;

  const pillBase = {
    background: "hsl(var(--background) / 0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  } as const;

  return (
    <AnimatePresence>
      <motion.div
        key="global-status-bar"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2 pointer-events-none"
      >
        {/* ── Timer pill (only with a real countdown) ─────────────────────── */}
        {showTimer && (
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-full border border-primary/30 shadow-glow shadow-primary/10"
            style={pillBase}
          >
            {/* Arc progress */}
            <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
              <circle cx="12" cy="12" r={R} fill="none"
                stroke="hsl(var(--primary) / 0.15)" strokeWidth="2.5" />
              <circle cx="12" cy="12" r={R} fill="none"
                stroke="hsl(var(--primary))" strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${CIRC}`}
                style={{ transition: "stroke-dasharray 0.5s linear" }}
              />
            </svg>

            {/* Countdown */}
            <span className="speak-serif text-sm font-bold tabular-nums tracking-tight text-primary">
              {mins}:{String(secs).padStart(2, "0")}
            </span>

            <div className="h-3 w-px bg-border/60" />

            {/* LIVE dot */}
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary opacity-70">
                LIVE
              </span>
            </div>
          </div>
        )}

        {/* ── Mic live pill (waveform bars) — only when actively recording ──
            Gate on the live MediaStream, not just `isRecording`. The arena
            restores `running` (and thus the recording flag) from sessionStorage
            during ready-up, which would otherwise flash this pill with dead bars
            before the speech actually starts. A stream only exists once the
            recorder genuinely starts, i.e. the battle is underway. */}
        <AnimatePresence>
          {isRecording && stream && (
            <motion.div
              key="mic-live"
              initial={{ opacity: 0, x: -8, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-full border border-primary/30 shadow-glow shadow-primary/10"
              style={pillBase}
            >
              <Mic className="h-3.5 w-3.5 text-primary shrink-0" />

              {/* Audio-reactive bars */}
              <div className="flex gap-[3px] h-3.5 items-end">
                {Array.from({ length: BAR_COUNT }, (_, i) => (
                  <div
                    key={i}
                    ref={el => { barsRef.current[i] = el; }}
                    className="w-[3px] bg-primary rounded-full"
                    style={{ height: "12%" }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
