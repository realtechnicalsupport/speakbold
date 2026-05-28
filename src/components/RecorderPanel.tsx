import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Square, RotateCcw, AlertCircle, Play } from "lucide-react";
import { useRecorder } from "@/hooks/useRecorder";
import { useMicPermission } from "@/hooks/useMicPermission";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const formatTime = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

interface RecorderPanelProps {
  label?: string;
  hint?: string;
  targetSeconds?: number;
  externalRunning?: boolean;
  recorderStartRef?: (fn: (() => void) | undefined) => void;
  recorderPauseRef?: (fn: (() => void) | undefined) => void;
  recorderResumeRef?: (fn: (() => void) | undefined) => void;
  recorderStopRef?: (fn: (() => void) | undefined) => void;
  onRecorded?: (rec: { blob: Blob; durationMs: number }) => void;
}

export const RecorderPanel = React.forwardRef(({
  label = "Recording",
  hint = "Hit record when you're ready. Speak naturally — every attempt makes you better.",
  targetSeconds,
  recorderStartRef,
  recorderPauseRef,
  recorderResumeRef,
  recorderStopRef,
  onRecorded,
}: RecorderPanelProps, ref) => {
  const { state, recording, elapsedMs, error, start, stop, pause, resume, reset } = useRecorder();
  const { permission, requestPermission } = useMicPermission();
  const externallyControlled = !!(recorderStartRef && recorderPauseRef && recorderResumeRef && recorderStopRef);

  // Pre-request permission on mount for externally-driven recorders (hidden in
  // Arena/Pathway) so the browser prompt fires before the user hits start.
  // Gated by a session flag so navigating between track pages doesn't re-prompt:
  // some browsers (notably Safari and Chromium with "ask each time" policy)
  // return "prompt" from the Permissions API even after the user has just
  // granted access in this tab, which would otherwise pop the dialog on every
  // single mount. The flag is session-scoped so a fresh tab still gets the
  // proactive prompt once.
  useEffect(() => {
    if (!recorderStartRef) return;
    if (permission !== "prompt") return;
    const SESSION_FLAG = "speakbold-mic-prompted-this-session";
    if (sessionStorage.getItem(SESSION_FLAG) === "1") return;
    try { sessionStorage.setItem(SESSION_FLAG, "1"); } catch { /* private mode */ }
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastReportedRef = useRef<number | null>(null);
  const prevStateRef = useRef<string>("idle");

  React.useImperativeHandle(ref, () => ({
    start,
    pause,
    resume,
    stop,
  }));

  useEffect(() => { recorderStartRef?.(start); }, [recorderStartRef, start]);
  useEffect(() => { recorderPauseRef?.(pause); }, [recorderPauseRef, pause]);
  useEffect(() => { recorderResumeRef?.(resume); }, [recorderResumeRef, resume]);
  useEffect(() => { recorderStopRef?.(stop); }, [recorderStopRef, stop]);

  useEffect(() => {
    if (!externallyControlled) return;
    if (prevStateRef.current === state) return;
    prevStateRef.current = state;
  }, [state, externallyControlled]);

  useEffect(() => {
    if (recording && recording.createdAt !== lastReportedRef.current) {
      lastReportedRef.current = recording.createdAt;
      onRecorded?.({ blob: recording.blob, durationMs: recording.durationMs });
      // Notify TutorialOverlay that a drill was completed
      window.dispatchEvent(new CustomEvent("speakbold:drill-complete"));
    }
  }, [recording, onRecorded]);

  const isRecording = state === "recording";
  const isPaused = state === "paused";

  return (
    <div className="bg-muted/5 rounded-[3rem] border border-border/60 p-10 md:p-16 relative overflow-hidden shadow-soft">
      <div className="grain pointer-events-none" />

      {permission === "denied" && (
        <div className="mb-8 flex items-center gap-3 p-4 rounded-2xl bg-red-500/8 border border-red-500/20 text-sm text-red-500 relative z-10">
          <MicOff className="h-4 w-4 shrink-0" />
          Microphone access is blocked. Enable it in your browser settings to record.
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-12 relative z-10 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm font-semibold text-primary">
            <Mic className="h-4 w-4" />
            {label}
          </div>
          <p className="text-lg md:text-xl opacity-60 leading-relaxed max-w-lg">{hint}</p>
        </div>

        <div className="flex flex-col items-end">
           <div className="text-6xl md:text-7xl font-bold tabular-nums leading-none">
             {formatTime(elapsedMs)}
           </div>
           <div className="text-xs font-medium opacity-40 mt-2">
             Time
           </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-border/60 pt-12">
        {externallyControlled ? (
          <div className="flex items-center gap-10">
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
                  <span className="text-sm font-semibold text-primary">Recording…</span>
                </motion.div>
              ) : isPaused ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 opacity-60">
                  <div className="h-2.5 w-2.5 rounded-full bg-foreground" />
                  <span className="text-sm font-medium">Paused</span>
                </motion.div>
              ) : recording ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-primary">Done</span>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 opacity-40">
                  <div className="h-2.5 w-2.5 rounded-full bg-foreground" />
                  <span className="text-sm font-medium">Ready</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-10">
            {!isRecording ? (
              <button
                onClick={start}
                className="button-pill px-10 py-4 bg-primary text-white shadow-glow group"
              >
                <Mic className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold">{recording ? "Record again" : "Start recording"}</span>
              </button>
            ) : (
              <button
                onClick={stop}
                className="button-pill bg-white text-primary border-white px-10 py-4 shadow-xl group"
              >
                <Square className="h-5 w-5 fill-primary group-hover:scale-90 transition-transform" />
                <span className="text-sm font-semibold">Stop</span>
              </button>
            )}
            {recording && !isRecording && !isPaused && (
              <button onClick={reset} className="h-14 w-14 rounded-full border border-border/60 flex items-center justify-center opacity-30 hover:opacity-100 transition-all hover:border-primary/40 group">
                <RotateCcw className="h-5 w-5 group-hover:rotate-[-45deg] transition-transform" />
              </button>
            )}
            
            <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
          </div>
        )}
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-10 p-8 bg-destructive/[0.03] rounded-[2rem] flex items-start gap-6 border border-destructive/20 relative z-10"
        >
          <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
             <p className="text-sm font-semibold text-destructive">Something went wrong</p>
             <p className="text-sm opacity-70 leading-relaxed">{error}</p>
          </div>
        </motion.div>
      )}

      {recording && !isRecording && !isPaused && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 pt-16 border-t border-border/60 space-y-12 relative z-10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm font-semibold text-primary">
              <Play className="h-4 w-4" fill="currentColor" />
              Playback
            </div>
            <span className="text-xl font-bold opacity-40 tabular-nums">{formatTime(recording.durationMs)}</span>
          </div>

          <div className="bg-muted/10 rounded-2xl p-4 border border-border/60">
            <audio controls src={recording.url} className="w-full h-12" />
          </div>
        </motion.div>
      )}
    </div>
  );
});

