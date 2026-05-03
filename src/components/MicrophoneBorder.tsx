import { useEffect, useRef } from "react";
import { useRecordingActive } from "@/lib/recordingState";

export function MicrophoneBorder() {
  const isRecording = useRecordingActive();
  const elRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const smoothRef = useRef(0);

  useEffect(() => {
    if (!isRecording || !elRef.current) return;
    const el = elRef.current;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

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

          const size = 5 + v * 65;
          const op = 0.1 + v * 0.55;

          el.style.boxShadow =
            `inset 0 0 ${size}px ${size / 3}px hsla(14 88% 62% / ${op}), ` +
            `inset 0 0 ${size * 1.8}px ${size / 1.5}px hsla(14 88% 62% / ${op * 0.2})`;

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch {
        // denied
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [isRecording]);

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
