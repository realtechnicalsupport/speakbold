import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, AlertCircle, Play, ShieldCheck, Microscope, Zap, Target } from "lucide-react";
import { useRecorder } from "@/hooks/useRecorder";
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
  label = "SENSORY CAPTURE PROTOCOL",
  hint = "Initialize recording to begin the authority audit. Every syllable is a data point.",
  targetSeconds,
  recorderStartRef,
  recorderPauseRef,
  recorderResumeRef,
  recorderStopRef,
  onRecorded,
}: RecorderPanelProps, ref) => {
  const { state, recording, elapsedMs, error, start, stop, pause, resume, reset } = useRecorder();
  const externallyControlled = !!(recorderStartRef && recorderPauseRef && recorderResumeRef && recorderStopRef);

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
    }
  }, [recording, onRecorded]);

  const isRecording = state === "recording";
  const isPaused = state === "paused";

  return (
    <div className="bg-muted/5 rounded-[3rem] border border-border/60 p-10 md:p-16 relative overflow-hidden shadow-soft">
      <div className="grain pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-12 relative z-10 mb-16">
        <div className="space-y-6">
          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] text-primary">
            <Microscope className="h-4 w-4" />
            {label}
          </div>
          <p className="speak-serif text-2xl md:text-3xl italic opacity-40 leading-relaxed max-w-lg">{hint}</p>
        </div>
        
        <div className="flex flex-col items-end">
           <div className="speak-serif text-7xl md:text-9xl font-bold tabular-nums tracking-tighter italic leading-none">
             {formatTime(elapsedMs)}
           </div>
           <div className="flex items-center gap-2 mt-4 text-[11px] font-black uppercase tracking-[0.3em] opacity-20">
             <Clock className="h-3 w-3" />
             ELAPSED PROTOCOL TIME
           </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-border/60 pt-12">
        {externallyControlled ? (
          <div className="flex items-center gap-10">
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4">
                  <div className="h-3 w-3 rounded-full bg-primary animate-ping" />
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-primary">AUDIT IN PROGRESS</span>
                </motion.div>
              ) : isPaused ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4 opacity-40">
                  <div className="h-3 w-3 rounded-full bg-foreground" />
                  <span className="text-xs font-black uppercase tracking-[0.4em]">SYSTEM PAUSED</span>
                </motion.div>
              ) : recording ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4">
                  <div className="h-3 w-3 rounded-full bg-primary shadow-glow shadow-primary/20" />
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-primary opacity-60">ANALYSIS FINALIZED</span>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4 opacity-20">
                  <div className="h-3 w-3 rounded-full bg-foreground" />
                  <span className="text-xs font-black uppercase tracking-[0.4em]">AWAITING EXTERNAL COMMAND</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-10">
            {!isRecording ? (
              <button 
                onClick={start} 
                className="button-pill px-12 py-5 bg-primary text-white shadow-glow group"
              >
                <Mic className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">{recording ? "INITIALIZE RE-CAPTURE" : "BEGIN CAPTURE"}</span>
              </button>
            ) : (
              <button 
                onClick={stop} 
                className="button-pill bg-white text-primary border-white px-12 py-5 shadow-xl group"
              >
                <Square className="h-5 w-5 fill-primary group-hover:scale-90 transition-transform" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">TERMINATE SESSION</span>
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
             <p className="text-xs font-black uppercase tracking-[0.3em] text-destructive">INTERFACE ERROR</p>
             <p className="text-sm font-medium opacity-60 leading-relaxed">{error}</p>
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
            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-primary">
              <Play className="h-4 w-4" fill="currentColor" />
              ACOUSTIC FEEDBACK
            </div>
            <span className="speak-serif text-2xl font-bold italic opacity-20 tabular-nums">{formatTime(recording.durationMs)}</span>
          </div>
          
          <div className="bg-muted/10 rounded-[2rem] p-4 border border-border/60 group-hover:border-primary/20 transition-all">
            <audio controls src={recording.url} className="w-full h-12 filter brightness-75 contrast-125" />
          </div>
          
          <div className="flex justify-center items-center gap-6 opacity-10">
             <div className="h-[1px] w-12 bg-foreground" />
             <ShieldCheck className="h-4 w-4" />
             <span className="text-[11px] font-black uppercase tracking-[0.6em]">SECURE LOCAL ENCRYPTED DATA</span>
             <div className="h-[1px] w-12 bg-foreground" />
          </div>
        </motion.div>
      )}
    </div>
  );
});

const Clock = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
