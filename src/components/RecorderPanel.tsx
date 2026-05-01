import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecorder } from "@/hooks/useRecorder";
import { cn } from "@/lib/utils";

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
  /** When provided, recording auto-starts on true and auto-pauses on false. Hides manual buttons. */
  externalRunning?: boolean;
  /** Called to set the start recording function */
  recorderStartRef?: (fn: (() => void) | undefined) => void;
  /** Called to set the pause recording function */
  recorderPauseRef?: (fn: (() => void) | undefined) => void;
  /** Called to set the stop recording function */
  recorderStopRef?: (fn: (() => void) | undefined) => void;
  /** Called once when a fresh recording is finalized */
  onRecorded?: (rec: { blob: Blob; durationMs: number }) => void;
}

export const RecorderPanel = React.forwardRef(({ 
  label = "Practice recording", 
  hint = "Hit record, speak out loud, then play it back. Audio stays on your device.",
  targetSeconds,
  recorderStartRef,
  recorderPauseRef,
  recorderStopRef,
  onRecorded,
}, ref) => {
  const { state, recording, elapsedMs, error, start, stop, pause, resume, reset } = useRecorder();
  const externallyControlled = !!(recorderStartRef && recorderPauseRef && recorderStopRef);
  
  const lastReportedRef = useRef<number | null>(null);
  const prevStateRef = useRef<string>("idle");
  
  // Expose the control functions via ref
  React.useImperativeHandle(ref, () => ({
    start: start,
    pause: pause,
    stop: stop,
  }));

  // Pass our functions to the parent via callbacks
  useEffect(() => {
    recorderStartRef?.(start);
  }, [recorderStartRef, start]);
  
  useEffect(() => {
    recorderPauseRef?.(pause);
  }, [recorderPauseRef, pause]);
  
  useEffect(() => {
    recorderStopRef?.(stop);
  }, [recorderStopRef, stop]);

  // React to state changes when externally controlled
  useEffect(() => {
    if (!externallyControlled) return;
    
    // Only trigger on state changes, not every render
    if (prevStateRef.current === state) return;
    prevStateRef.current = state;
    
    // State changed - do nothing here, the parent controls via refs
  }, [state, externallyControlled]);

  useEffect(() => {
    if (recording && recording.createdAt !== lastReportedRef.current) {
      lastReportedRef.current = recording.createdAt;
      onRecorded?.({ blob: recording.blob, durationMs: recording.durationMs });
    }
  }, [recording, onRecorded]);

  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const reachedTarget = targetSeconds ? elapsedMs >= targetSeconds * 1000 : false;

  return (
    <div className="bg-card-gradient border border-border rounded-3xl p-6 md:p-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
        <p className="text-sm text-muted-foreground max-w-md">{hint}</p>
      </div>

      {externallyControlled ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isRecording ? (
            <>
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              Recording - synced with timer
            </>
          ) : isPaused ? (
            <>
              <span className="h-2 w-2 rounded-full bg-warning/20" />
              Paused - synced with timer
            </>
          ) : recording ? (
            <span>Recording captured. Play it back below.</span>
          ) : (
            <span>Recording will start automatically when you hit the timer.</span>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {!isRecording ? (
            <Button variant="hero" size="lg" onClick={start}>
              <Mic className="h-4 w-4" />
              {recording ? "Record again" : "Start recording"}
            </Button>
          ) : (
            <Button variant="hero" size="lg" onClick={stop} className="animate-pulse-glow">
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
          {recording && !isRecording && (
            <Button variant="outline" size="lg" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {recording && !isRecording && (
        <div className="mt-6 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Playback</p>
          <audio controls src={recording.url} className="w-full" />
          <p className="text-xs text-muted-foreground">
            Listen back. Note one thing you nailed and one thing to tighten next time.
          </p>
        </div>
      )}
    </div>
  );
});