import { useEffect, useRef } from "react";
import { useRecordingActive, useActiveStream } from "@/lib/recordingState";

export function MicrophoneBorder() {
  const isRecording = useRecordingActive();
  // Pulls the recorder's existing MediaStream from the shared store. We no
  // longer open a second getUserMedia just for the visualizer — that caused
  // two mic icons in the tab, double CPU, and occasional NotReadableError on
  // macOS/Windows when a third stream tried to attach.
  const stream = useActiveStream();
  const elRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const smoothRef = useRef(0);

  useEffect(() => {
    if (!isRecording || !stream || !elRef.current) return;
    const el = elRef.current;
    let cancelled = false;

    (async () => {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();
        if (cancelled) { ctx.close(); return; }

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        analyserRef.current = analyser;

        ctx.createMediaStreamSource(stream).connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const loop = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = Math.min(1, (sum / data.length / 255) * 2.5);

          smoothRef.current = smoothRef.current * 0.4 + avg * 0.6;
          const v = smoothRef.current;

          const size = 10 + v * 100;
          const op = 0.2 + v * 0.8;

          el.style.boxShadow =
            `inset 0 0 ${size}px ${size / 2}px hsla(14, 88%, 62%, ${op}), ` +
            `inset 0 0 ${size * 2}px ${size}px hsla(14, 88%, 62%, ${op * 0.3})`;

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error("[MicBorder] Failed to attach analyser:", err);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      // Don't stop the stream — it belongs to the recorder, which is still
      // using it. Just detach the analyser and close our own AudioContext.
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [isRecording, stream]);

  if (!isRecording) return null;

  return (
    <div
      ref={elRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 9999,
        boxShadow: "inset 0 0 5px 2px hsla(14 88% 62% / 0.1)",
      }}
    />
  );
}
