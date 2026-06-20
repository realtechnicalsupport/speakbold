// ── On-device voice analysis ──────────────────────────────────────────────────
// Computes acoustic delivery metrics — pitch, pitch variation, pauses, volume
// dynamics — directly from the recorded audio using the Web Audio API. Runs
// entirely in the browser: no API calls, no cost, and no audio ever leaves the
// device. Approximate by design (it's a coaching aid, not a lab instrument), and
// it degrades gracefully: if the audio can't be decoded (e.g. some Safari/opus
// cases) it returns null and the UI simply hides the panel.

export interface VoiceMetrics {
  meanPitchHz: number;
  pitchStdHz: number;
  pitchRangeLabel: "monotone" | "narrow" | "moderate" | "expressive";
  /** % of speech that carried a clear voiced pitch — a rough projection proxy. */
  voicedPct: number;
  volumeDynamicsLabel: "flat" | "some variation" | "dynamic";
  pauseCount: number;        // silences longer than ~0.6s
  longestPauseSec: number;
  /** Normalised (0–1) pitch contour, ~24 buckets, for a sparkline. */
  contour: number[];
}

const TARGET_RATE = 8000;     // downsample target — plenty for voice F0
const WIN = 512;              // ~64ms analysis window
const HOP = 320;              // ~40ms hop
const MIN_HZ = 75;
const MAX_HZ = 350;

function decimate(data: Float32Array, srcRate: number): Float32Array {
  if (srcRate <= TARGET_RATE) return data;
  const ratio = srcRate / TARGET_RATE;
  const n = Math.floor(data.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = data[Math.floor(i * ratio)];
  return out;
}

// Normalised autocorrelation pitch detection for a single frame. Returns 0 when
// no clear period is found (unvoiced / noise).
function detectPitch(frame: Float32Array, rate: number, minLag: number, maxLag: number): number {
  let bestLag = -1;
  let bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0, n1 = 0, n2 = 0;
    const lim = frame.length - lag;
    for (let i = 0; i < lim; i++) {
      corr += frame[i] * frame[i + lag];
      n1 += frame[i] * frame[i];
      n2 += frame[i + lag] * frame[i + lag];
    }
    const nc = corr / (Math.sqrt(n1 * n2) + 1e-9);
    if (nc > bestCorr) { bestCorr = nc; bestLag = lag; }
  }
  // Clarity gate — below this the "pitch" is just noise correlation.
  return bestLag > 0 && bestCorr > 0.5 ? rate / bestLag : 0;
}

function rangeLabel(std: number): VoiceMetrics["pitchRangeLabel"] {
  if (std < 12) return "monotone";
  if (std < 25) return "narrow";
  if (std < 45) return "moderate";
  return "expressive";
}

export async function analyzeVoice(blob: Blob): Promise<VoiceMetrics | null> {
  try {
    const arrayBuf = await blob.arrayBuffer();
    const Ctx: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    const ac = new Ctx();
    let audioBuf: AudioBuffer;
    try {
      audioBuf = await ac.decodeAudioData(arrayBuf);
    } finally {
      ac.close();
    }

    const raw = audioBuf.getChannelData(0);
    const data = decimate(raw, audioBuf.sampleRate);
    const rate = Math.min(audioBuf.sampleRate, TARGET_RATE);

    const minLag = Math.floor(rate / MAX_HZ);
    const maxLag = Math.floor(rate / MIN_HZ);

    // Global RMS → adaptive silence threshold.
    let sumSq = 0;
    for (let i = 0; i < data.length; i++) sumSq += data[i] * data[i];
    const globalRms = Math.sqrt(sumSq / Math.max(1, data.length));
    const silenceThresh = Math.max(0.008, globalRms * 0.18);

    const pitches: number[] = [];
    const frameRms: number[] = [];
    const voicedFlags: boolean[] = [];

    for (let start = 0; start + WIN <= data.length; start += HOP) {
      const frame = data.subarray(start, start + WIN);
      let s = 0;
      for (let i = 0; i < frame.length; i++) s += frame[i] * frame[i];
      const rms = Math.sqrt(s / frame.length);
      frameRms.push(rms);

      if (rms < silenceThresh) {
        voicedFlags.push(false);
        continue;
      }
      const f0 = detectPitch(frame, rate, minLag, maxLag);
      if (f0 > 0) {
        pitches.push(f0);
        voicedFlags.push(true);
      } else {
        voicedFlags.push(false);
      }
    }

    if (pitches.length < 5) return null; // not enough voiced audio to say anything

    // Pitch stats
    const meanPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((a, b) => a + (b - meanPitch) ** 2, 0) / pitches.length;
    const pitchStd = Math.sqrt(variance);

    const voicedPct = Math.round((voicedFlags.filter(Boolean).length / voicedFlags.length) * 100);

    // Volume dynamics — std of voiced-frame loudness in dB.
    const voicedRms = frameRms.filter(r => r >= silenceThresh);
    const dbs = voicedRms.map(r => 20 * Math.log10(r + 1e-9));
    const dbMean = dbs.reduce((a, b) => a + b, 0) / Math.max(1, dbs.length);
    const dbStd = Math.sqrt(dbs.reduce((a, b) => a + (b - dbMean) ** 2, 0) / Math.max(1, dbs.length));
    const volumeDynamicsLabel: VoiceMetrics["volumeDynamicsLabel"] =
      dbStd < 3 ? "flat" : dbStd < 6 ? "some variation" : "dynamic";

    // Pauses — runs of silent frames longer than ~0.6s.
    const frameSec = HOP / rate;
    const pauseFrames = Math.ceil(0.6 / frameSec);
    let run = 0;
    let pauseCount = 0;
    let longestRun = 0;
    for (const voiced of voicedFlags) {
      if (!voiced) {
        run++;
      } else {
        if (run >= pauseFrames) pauseCount++;
        longestRun = Math.max(longestRun, run);
        run = 0;
      }
    }
    if (run >= pauseFrames) pauseCount++;
    longestRun = Math.max(longestRun, run);
    const longestPauseSec = Math.round(longestRun * frameSec * 10) / 10;

    // Contour — bucket voiced pitches across the timeline for a sparkline.
    const BUCKETS = 24;
    const buckets: number[] = Array(BUCKETS).fill(0);
    const counts: number[] = Array(BUCKETS).fill(0);
    let vi = 0;
    for (let f = 0; f < voicedFlags.length; f++) {
      if (!voicedFlags[f]) continue;
      const b = Math.min(BUCKETS - 1, Math.floor((f / voicedFlags.length) * BUCKETS));
      buckets[b] += pitches[vi++];
      counts[b]++;
    }
    const pMin = Math.min(...pitches);
    const pMax = Math.max(...pitches);
    const span = Math.max(1, pMax - pMin);
    const contour = buckets.map((sum, i) =>
      counts[i] > 0 ? (sum / counts[i] - pMin) / span : 0
    );

    return {
      meanPitchHz: Math.round(meanPitch),
      pitchStdHz: Math.round(pitchStd),
      pitchRangeLabel: rangeLabel(pitchStd),
      voicedPct,
      volumeDynamicsLabel,
      pauseCount,
      longestPauseSec,
      contour,
    };
  } catch {
    return null;
  }
}
