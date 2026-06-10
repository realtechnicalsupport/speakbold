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

          // Animate OPACITY ONLY. The glow's box-shadow is painted once (in the
          // element's static style below); rewriting box-shadow every frame — as
          // this used to — forces the compositor to repaint a full-viewport
          // blurred layer at 60fps, which tears the screen on tablets (large
          // display + mobile GPU). Opacity is GPU-composited, so the glow still
          // reacts to the voice with zero per-frame repaint.
          const op = Math.min(1, 0.15 + v * 0.85);
          el.style.opacity = op.toFixed(2);

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
        // Painted ONCE. The analyser loop above only animates `opacity`, so this
        // blurred glow lives on its own compositor layer and never repaints —
        // killing the per-frame full-screen repaint that tore tablets.
        boxShadow:
          "inset 0 0 70px 35px hsla(14, 88%, 62%, 0.9), inset 0 0 150px 75px hsla(14, 88%, 62%, 0.3)",
        opacity: 0.15,
        willChange: "opacity",
        transform: "translateZ(0)",
      }}
    />
  );
}
