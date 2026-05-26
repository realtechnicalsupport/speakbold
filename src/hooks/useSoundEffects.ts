/**
 * useSoundEffects — synthesized game audio via Web Audio API.
 * Zero external files. All sounds are generated programmatically.
 */
import { useCallback, useRef } from "react";

// ─── Audio context singleton ─────────────────────────────────────────────────
let sharedCtx: AudioContext | null = null;

const getCtx = (): AudioContext => {
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
};

// ─── Primitive: play one oscillator tone ────────────────────────────────────
function playTone(
  freq: number,
  durationSec: number,
  type: OscillatorType = "sine",
  peakGain = 0.25,
  delayAtStart = 0,
): void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delayAtStart);

    // Attack → decay envelope
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + delayAtStart);
    gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + delayAtStart + 0.012);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + delayAtStart + durationSec,
    );

    osc.start(ctx.currentTime + delayAtStart);
    osc.stop(ctx.currentTime + delayAtStart + durationSec + 0.05);
  } catch {
    // AudioContext might be blocked — silently skip
  }
}

// ─── Primitive: white-noise burst (for "whoosh" / "thud") ───────────────────
function playNoise(durationSec: number, peakGain = 0.15, delayAtStart = 0, highpass = 0): void {
  try {
    const ctx = getCtx();
    const bufferSize = Math.ceil(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + delayAtStart);
    gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + delayAtStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delayAtStart + durationSec);

    if (highpass > 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = highpass;
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }

    gain.connect(ctx.destination);
    source.start(ctx.currentTime + delayAtStart);
  } catch {
    // Silently skip
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useSoundEffects = () => {
  // Track which second we last ticked so we don't double-fire
  const lastTickRef = useRef<number>(-1);

  /**
   * countdownTick — call on every secondsLeft change.
   * Only plays on 3, 2, 1 (and the "time's up" 0).
   */
  const countdownTick = useCallback((second: number) => {
    if (second === lastTickRef.current) return;
    lastTickRef.current = second;

    if (second === 3) {
      playTone(660, 0.07, "square", 0.12);
    } else if (second === 2) {
      playTone(740, 0.07, "square", 0.15);
    } else if (second === 1) {
      playTone(880, 0.10, "square", 0.20);
    } else if (second === 0) {
      // Final: two descending tones — "bwomp bwomp"
      playTone(440, 0.14, "sine", 0.28, 0);
      playTone(330, 0.22, "sine", 0.18, 0.14);
    }
  }, []);

  /** Reset tick dedup when phase changes. */
  const resetCountdown = useCallback(() => {
    lastTickRef.current = -1;
  }, []);

  /**
   * phaseStart — plays when a new speaking round begins.
   * "user": bright rising chime (your turn!)
   * "ai":   low dark rumble (opponent's turn)
   */
  const phaseStart = useCallback((speaker: "user" | "ai") => {
    if (speaker === "user") {
      // C5 → E5 → G5 rising arpeggio
      playTone(523, 0.12, "sine", 0.20, 0.00);
      playTone(659, 0.12, "sine", 0.20, 0.11);
      playTone(784, 0.22, "sine", 0.25, 0.22);
    } else {
      // Low dark rumble
      playTone(196, 0.15, "triangle", 0.18, 0.00);
      playTone(175, 0.22, "triangle", 0.12, 0.14);
      playNoise(0.18, 0.06, 0.05, 80);
    }
  }, []);

  /**
   * matchStart — 3-beat ascending drum roll into a chime.
   * Plays when the debate opens.
   */
  const matchStart = useCallback(() => {
    // Drum beats (sine sub + noise click)
    const beats = [0, 0.22, 0.44];
    beats.forEach((t, i) => {
      playTone(80 + i * 20, 0.12, "sine", 0.35, t);
      playNoise(0.04, 0.12, t, 200);
    });
    // Resolve chime
    playTone(523, 0.18, "sine", 0.22, 0.70);
    playTone(659, 0.18, "sine", 0.20, 0.82);
    playTone(784, 0.30, "sine", 0.28, 0.94);
  }, []);

  /**
   * judgingStart — low tension rumble when AI deliberates.
   */
  const judgingStart = useCallback(() => {
    playTone(90, 0.55, "sawtooth", 0.08, 0.00);
    playTone(110, 0.40, "sawtooth", 0.06, 0.25);
    playTone(70, 0.60, "sawtooth", 0.05, 0.45);
    playNoise(0.4, 0.04, 0.5, 60);
  }, []);

  /**
   * win — ascending C-E-G-C arpeggio, triumphant.
   */
  const win = useCallback(() => {
    playTone(523, 0.16, "sine", 0.28, 0.00);  // C5
    playTone(659, 0.16, "sine", 0.26, 0.13);  // E5
    playTone(784, 0.16, "sine", 0.26, 0.26);  // G5
    playTone(1047, 0.35, "sine", 0.32, 0.39); // C6
    // Shimmer on top
    playTone(1568, 0.25, "sine", 0.10, 0.42); // G6
  }, []);

  /**
   * loss — descending minor C-Ab-F, muted.
   */
  const loss = useCallback(() => {
    playTone(523, 0.20, "sine", 0.20, 0.00);  // C5
    playTone(415, 0.20, "sine", 0.16, 0.18);  // Ab4
    playTone(349, 0.38, "sine", 0.14, 0.36);  // F4
    playNoise(0.15, 0.04, 0.55, 100);
  }, []);

  /**
   * eloGain — quick bright ding.
   */
  const eloGain = useCallback(() => {
    playTone(880, 0.10, "sine", 0.22, 0.00);
    playTone(1047, 0.22, "sine", 0.18, 0.09);
  }, []);

  /**
   * eloLoss — short low thud.
   */
  const eloLoss = useCallback(() => {
    playTone(200, 0.18, "triangle", 0.28, 0.00);
    playTone(150, 0.28, "triangle", 0.18, 0.12);
    playNoise(0.10, 0.06, 0.02, 50);
  }, []);

  /**
   * buttonClick — subtle click for important buttons (optional polish).
   */
  const buttonClick = useCallback(() => {
    playNoise(0.03, 0.08, 0, 800);
  }, []);

  return {
    countdownTick,
    resetCountdown,
    phaseStart,
    matchStart,
    judgingStart,
    win,
    loss,
    eloGain,
    eloLoss,
    buttonClick,
  };
};
