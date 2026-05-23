import { motion, AnimatePresence } from "framer-motion";
import { MicOff, Timer } from "lucide-react";
import { useTimerActive, useTimerSeconds } from "@/lib/timerState";
import { useRecordingActive } from "@/lib/recordingState";

/**
 * GlobalStatusBar — fixed floating pill shown globally whenever:
 *  • A timer session is active  (shows countdown + progress arc)
 *  • Mic / recording is OFF during an active session (shows warning)
 */
export const GlobalStatusBar = () => {
  const timerActive = useTimerActive();
  const isRecording = useRecordingActive();
  const { seconds, duration } = useTimerSeconds();

  const micOff = timerActive && !isRecording;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = duration > 0 ? seconds / duration : 1;

  // Arc maths (r=10 → circumference ≈ 62.83)
  const R = 10;
  const CIRC = 2 * Math.PI * R;
  const dash = pct * CIRC;

  if (!timerActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="global-status-bar"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2"
        style={{ pointerEvents: "none" }}
      >
        {/* ── Timer Pill ─────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-full border border-primary/30 shadow-glow shadow-primary/10"
          style={{
            background: "hsl(var(--background) / 0.9)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Arc progress */}
          <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
            <circle
              cx="12" cy="12" r={R}
              fill="none"
              stroke="hsl(var(--primary) / 0.15)"
              strokeWidth="2.5"
            />
            <circle
              cx="12" cy="12" r={R}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
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

          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary opacity-70">
              LIVE
            </span>
          </div>
        </div>

        {/* ── Mic Off Warning Pill ────────────────────────────── */}
        <AnimatePresence>
          {micOff && (
            <motion.div
              key="mic-off"
              initial={{ opacity: 0, x: -8, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-destructive/40 shadow-glow shadow-destructive/10"
              style={{
                background: "hsl(var(--background) / 0.9)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <MicOff className="h-3.5 w-3.5 text-destructive" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-destructive">
                MIC OFF
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
