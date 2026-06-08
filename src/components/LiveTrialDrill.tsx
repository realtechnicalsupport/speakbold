import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Lock, ArrowRight, RotateCcw, Gauge, Hash, AudioWaveform, AlertTriangle, Loader2 } from "lucide-react";
import { getRandomTopic, TARGET_WPM, type ImpromptuTopic } from "@/data/impromptuTopics";
import { speechRecognitionSupported } from "@/lib/speechRecognition";
import { track } from "@/lib/analytics";
import { transcribeAudio } from "@/services/geminiService";

// ─────────────────────────────────────────────────────────────────────────────
// Anonymous, zero-backend "feel the magic" drill for the landing page.
//
// A cold visitor records a 30-second answer; we transcribe locally with the
// browser's free Web Speech API and compute REAL metrics (words, WPM, filler
// count, pace) entirely client-side — no auth, no edge function, no cost. The
// AI Coaching Score is shown locked behind a free signup: aha → wall, at the
// exact moment of peak curiosity.
//
// Filler list mirrors FILLER_WORDS in useImpromptuSession.ts (kept inline so
// the landing bundle doesn't pull in the full session hook).
// ─────────────────────────────────────────────────────────────────────────────

const TRIAL_SECONDS = 30;

const FILLER_WORDS = [
  "um", "uh", "like", "you know", "so", "basically", "right",
  "actually", "literally", "kind of", "sort of",
];

const countFillers = (text: string): number => {
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce(
    (n, w) => n + (lower.match(new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "g"))?.length ?? 0),
    0,
  );
};

const detectedFillers = (text: string): string[] => {
  const lower = text.toLowerCase();
  return FILLER_WORDS.filter((w) => new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`).test(lower));
};

const getSpeechRecognition = (): any => {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

type Pace = { label: string; tone: "good" | "warn" };
const assessPace = (wpm: number): Pace => {
  if (wpm === 0) return { label: "No speech", tone: "warn" };
  if (wpm < 100) return { label: "Too slow", tone: "warn" };
  if (wpm < TARGET_WPM.min) return { label: "A little slow", tone: "warn" };
  if (wpm <= TARGET_WPM.max) return { label: "On target", tone: "good" };
  if (wpm <= 185) return { label: "A little fast", tone: "warn" };
  return { label: "Too fast", tone: "warn" };
};

type Phase = "intro" | "recording" | "transcribing" | "results" | "denied" | "error" | "unsupported";

interface Metrics {
  words: number;
  wpm: number;
  fillers: number;
  fillerList: string[];
  pace: Pace;
}

// Same metric computation for both paths (live Web Speech on desktop, recorded
// blob → server transcript on mobile) so the trial result is identical.
const computeMetrics = (text: string, elapsedSeconds: number): Metrics => {
  const clean = text.trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
  const elapsed = Math.max(1, Math.min(TRIAL_SECONDS, elapsedSeconds));
  const wpm = words > 0 ? Math.round((words / elapsed) * 60) : 0;
  const fillers = countFillers(clean);
  return { words, wpm, fillers, fillerList: detectedFillers(clean), pace: assessPace(wpm) };
};

// Pick a MediaRecorder mime the browser actually supports. iOS Safari records
// mp4/aac (not webm); Chrome/Android prefer webm/opus. The server transcriber
// reads the mime we send, so this just needs to be honest about the container.
const pickRecorderMime = (): string => {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];
  for (const m of candidates) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* keep trying */ }
  }
  return "";
};

const hasMediaRecorder = (): boolean =>
  typeof window !== "undefined" &&
  typeof MediaRecorder !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia;

interface Props {
  open: boolean;
  onClose: () => void;
}

export const LiveTrialDrill = ({ open, onClose }: Props) => {
  const [phase, setPhase] = useState<Phase>("intro");
  const [topic, setTopic] = useState<ImpromptuTopic>(() => getRandomTopic("Easy"));
  const [secondsLeft, setSecondsLeft] = useState(TRIAL_SECONDS);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalRef = useRef("");
  const timerRef = useRef<number | undefined>(undefined);
  const startedAtRef = useRef(0);
  const stoppingRef = useRef(false);

  // Mobile (record-then-transcribe) path refs.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordMimeRef = useRef<string>("");

  // Two ways to "try" on the homepage:
  //  • DESKTOP — live Web Speech, zero backend, instant metrics as you talk.
  //  • MOBILE  — phones/tablets run a Web Speech engine that ignores
  //    `continuous` (auto-stops on every pause, re-opens the mic), so instead we
  //    record the clip and transcribe it server-side (anonymous "trial" call),
  //    then compute the SAME metrics. This unblocks the all-important "judge
  //    tries it on their phone" moment instead of dead-ending at a signup wall.
  const liveSupported = speechRecognitionSupported();
  const recordSupported = !liveSupported && hasMediaRecorder();
  const supported = liveSupported || recordSupported;

  // ── Teardown helpers ────────────────────────────────────────────────────────
  const stopRecognition = useCallback(() => {
    stoppingRef.current = true;
    if (timerRef.current) window.clearInterval(timerRef.current);
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
  }, []);

  const stopMedia = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        // Detach onstop so a teardown-driven stop doesn't kick off transcription.
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
    } catch { /* noop */ }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch { /* noop */ } });
    mediaStreamRef.current = null;
  }, []);

  // Full teardown for both paths — used on close / reset / unmount.
  const teardownAll = useCallback(() => {
    stopRecognition();
    stopMedia();
  }, [stopRecognition, stopMedia]);

  const computeAndShow = useCallback(() => {
    const elapsed = (Date.now() - startedAtRef.current) / 1000;
    const m = computeMetrics(finalRef.current, elapsed);
    setMetrics(m);
    setPhase("results");
    track("trial_completed", { words: m.words, wpm: m.wpm, fillers: m.fillers, path: "live" });
  }, []);

  const finish = useCallback(() => {
    if (stoppingRef.current) return;
    stopRecognition();
    computeAndShow();
  }, [stopRecognition, computeAndShow]);

  // ── Start recording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) { setPhase("unsupported"); return; }

    finalRef.current = "";
    stoppingRef.current = false;
    setTranscript("");
    setInterim("");
    setSecondsLeft(TRIAL_SECONDS);

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalRef.current += res[0].transcript + " ";
        else interimChunk += res[0].transcript;
      }
      setTranscript(finalRef.current);
      setInterim(interimChunk);
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        stopRecognition();
        setPhase("denied");
      }
      // "no-speech" / "aborted" are recoverable — onend will restart if needed.
    };

    // The engine auto-stops on silence; while we're still inside the window,
    // restart it so a thoughtful pause doesn't end the drill early.
    rec.onend = () => {
      if (!stoppingRef.current) {
        try { recognitionRef.current?.start(); } catch { /* noop */ }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setPhase("unsupported");
      return;
    }

    startedAtRef.current = Date.now();
    setPhase("recording");
    track("trial_started", { topic: topic.text });

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timerRef.current);
          // Defer to next tick so state settles before we compute.
          window.setTimeout(finish, 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [finish, stopRecognition]);

  // ── Mobile path: record clip → transcribe server-side → same metrics ─────────
  const transcribeAndShow = useCallback(async (blob: Blob, elapsedSeconds: number) => {
    setPhase("transcribing");
    try {
      const transcript = await transcribeAudio(blob, 0, { trial: true });
      const m = computeMetrics(transcript, elapsedSeconds);
      setMetrics(m);
      setPhase("results");
      track("trial_completed", { words: m.words, wpm: m.wpm, fillers: m.fillers, path: "record" });
    } catch (err) {
      console.warn("[LiveTrialDrill] trial transcription failed:", err);
      track("trial_error", { stage: "transcribe" });
      setPhase("error"); // fail-safe: offer retry + signup, never a broken state
    }
  }, []);

  const startRecordingMobile = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase("denied");
      return;
    }
    mediaStreamRef.current = stream;
    const mime = pickRecorderMime();
    recordMimeRef.current = mime;
    chunksRef.current = [];

    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      try { recorder = new MediaRecorder(stream); } catch { setPhase("error"); return; }
    }
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      mediaStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch { /* noop */ } });
      mediaStreamRef.current = null;
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      const type = recordMimeRef.current || chunksRef.current[0]?.type || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size < 1200) { setPhase("error"); return; } // effectively empty
      void transcribeAndShow(blob, elapsed);
    };

    setTranscript("");
    setInterim("");
    setSecondsLeft(TRIAL_SECONDS);
    startedAtRef.current = Date.now();
    try { recorder.start(); } catch { setPhase("error"); return; }
    setPhase("recording");
    track("trial_started", { topic: topic.text, path: "record" });

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timerRef.current);
          try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* onstop handles */ }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [topic.text, transcribeAndShow]);

  const finishMobile = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop(); // onstop → transcribeAndShow
      }
    } catch { setPhase("error"); }
  }, []);

  // Branch the intro/record button + the "done" button by device path.
  const handleStart = () => { if (recordSupported) void startRecordingMobile(); else startRecording(); };
  const handleFinish = () => { if (recordSupported) finishMobile(); else finish(); };

  // ── Reset / lifecycle ───────────────────────────────────────────────────────
  const resetToIntro = useCallback((newTopic = false) => {
    teardownAll();
    setMetrics(null);
    setTranscript("");
    setInterim("");
    setSecondsLeft(TRIAL_SECONDS);
    if (newTopic) setTopic(getRandomTopic("Easy"));
    setPhase(supported ? "intro" : "unsupported");
  }, [teardownAll, supported]);

  // When the modal opens, start clean. When it closes, tear everything down.
  useEffect(() => {
    if (open) {
      setPhase(supported ? "intro" : "unsupported");
      setMetrics(null);
      setTopic(getRandomTopic("Easy"));
    } else {
      teardownAll();
    }
    return () => teardownAll();
  }, [open, supported, teardownAll]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    teardownAll();
    onClose();
  };

  if (!open) return null;

  const ringPct = (secondsLeft / TRIAL_SECONDS) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-xl"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl glass-card rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 overflow-hidden"
        >
          {/* Close */}
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute top-4 right-4 h-9 w-9 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-muted/30 transition-all z-10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Eyebrow */}
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            30-second drill · no signup
          </div>

          {/* ── INTRO ──────────────────────────────────────────────────────── */}
          {phase === "intro" && (
            <div className="space-y-7">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Your prompt</p>
                <h2 className="speak-serif text-2xl md:text-4xl leading-tight tracking-tight">
                  {topic.text}
                </h2>
              </div>
              <p className="text-sm font-medium opacity-50 leading-relaxed">
                {recordSupported
                  ? "Hit record and speak for 30 seconds. We'll capture a short clip and analyze your pace, words, and filler words instantly — audio is used only to score this drill."
                  : "Hit record and speak for 30 seconds. We'll measure your pace, words, and filler words live — right here in your browser. Nothing is uploaded."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleStart}
                  className="group flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-primary text-white shadow-glow hover:scale-[1.02] active:scale-95 transition-transform"
                >
                  <Mic className="h-4 w-4" />
                  <span className="text-sm font-black uppercase tracking-wide">Start speaking</span>
                </button>
                <button
                  onClick={() => resetToIntro(true)}
                  className="px-5 py-4 rounded-full border border-border/60 text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:border-primary/40 transition-all"
                >
                  New prompt
                </button>
              </div>
            </div>
          )}

          {/* ── RECORDING ──────────────────────────────────────────────────── */}
          {phase === "recording" && (
            <div className="space-y-7">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Speaking on</p>
                <h2 className="speak-serif text-lg md:text-2xl leading-tight tracking-tight opacity-80">
                  {topic.text}
                </h2>
              </div>

              {/* Timer ring */}
              <div className="flex items-center justify-center gap-6">
                <div className="relative h-28 w-28">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <motion.circle
                      cx="50" cy="50" r="44" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 44}
                      animate={{ strokeDashoffset: (2 * Math.PI * 44) * (1 - ringPct / 100) }}
                      transition={{ duration: 0.5, ease: "linear" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="speak-serif text-3xl font-bold tabular-nums italic">{secondsLeft}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">sec left</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Recording</span>
                </div>
              </div>

              {/* Live transcript (desktop) — or a record hint (mobile, no live STT) */}
              <div className="min-h-[72px] max-h-32 overflow-y-auto rounded-2xl bg-muted/20 border border-border/60 p-4 text-sm leading-relaxed">
                {recordSupported ? (
                  <p className="opacity-50 italic">Recording your answer — we'll analyze it the moment you finish.</p>
                ) : transcript || interim ? (
                  <p>
                    <span className="opacity-90">{transcript}</span>
                    <span className="opacity-40">{interim}</span>
                  </p>
                ) : (
                  <p className="opacity-30 italic">Listening… start talking.</p>
                )}
              </div>

              <button
                onClick={handleFinish}
                className="w-full px-6 py-3.5 rounded-full border border-primary/40 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
              >
                I'm done — show my results
              </button>
            </div>
          )}

          {/* ── TRANSCRIBING (mobile path) ─────────────────────────────────── */}
          {phase === "transcribing" && (
            <div className="space-y-6 text-center py-8">
              <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
              <div className="space-y-1.5">
                <h2 className="speak-serif text-2xl italic">Analyzing your delivery…</h2>
                <p className="text-sm opacity-50">Scoring your pace, words, and filler words.</p>
              </div>
            </div>
          )}

          {/* ── ERROR (mobile path fail-safe) ──────────────────────────────── */}
          {phase === "error" && (
            <div className="space-y-5 text-center py-4">
              <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 opacity-70" />
              <h2 className="speak-serif text-2xl italic">That didn't go through.</h2>
              <p className="text-sm opacity-50 leading-relaxed">
                We couldn't analyze that clip. Give it another go, or create a free account for the full AI coach.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => resetToIntro(false)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-border/60 text-xs font-black uppercase tracking-widest opacity-70 hover:opacity-100 transition-all"
                >
                  <RotateCcw className="h-4 w-4" /> Try again
                </button>
                <Link
                  to="/login?mode=signup"
                  onClick={() => track("trial_signup_click", { from: "error" })}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow"
                >
                  Create free account <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* ── RESULTS ────────────────────────────────────────────────────── */}
          {phase === "results" && metrics && (
            <div className="space-y-6">
              {metrics.words === 0 ? (
                <div className="space-y-5 text-center py-4">
                  <AudioWaveform className="h-10 w-10 mx-auto text-primary opacity-40" />
                  <h2 className="speak-serif text-2xl italic">We didn't catch any speech.</h2>
                  <p className="text-sm opacity-50">Check your mic is on and give it another go.</p>
                  <button
                    onClick={() => resetToIntro(false)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow"
                  >
                    <RotateCcw className="h-4 w-4" /> Try again
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Your live results</p>
                    <h2 className="speak-serif text-2xl md:text-3xl italic tracking-tight">Here's how you did.</h2>
                  </div>

                  {/* Real metric tiles */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-muted/20 border border-border/60 p-4 text-center space-y-1">
                      <Hash className="h-4 w-4 mx-auto text-blue-500 opacity-70" />
                      <p className="speak-serif text-2xl md:text-3xl font-bold italic tabular-nums">{metrics.words}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Words</p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 border border-border/60 p-4 text-center space-y-1">
                      <Gauge className="h-4 w-4 mx-auto text-primary opacity-70" />
                      <p className="speak-serif text-2xl md:text-3xl font-bold italic tabular-nums">{metrics.wpm}</p>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${metrics.pace.tone === "good" ? "text-emerald-500" : "text-amber-500"}`}>
                        {metrics.pace.label}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 border border-border/60 p-4 text-center space-y-1">
                      <AudioWaveform className="h-4 w-4 mx-auto text-purple-500 opacity-70" />
                      <p className="speak-serif text-2xl md:text-3xl font-bold italic tabular-nums">{metrics.fillers}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Fillers</p>
                    </div>
                  </div>

                  {metrics.fillerList.length > 0 && (
                    <p className="text-[11px] text-center opacity-40">
                      Caught: {metrics.fillerList.map((f) => `"${f}"`).join(", ")}
                    </p>
                  )}

                  {/* Locked AI score — the wall, at peak curiosity */}
                  <div className="relative rounded-2xl border border-primary/30 bg-primary/[0.04] p-5 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">AI Coaching Score</p>
                        <div className="flex items-end gap-2 select-none" aria-hidden>
                          <span className="speak-serif text-4xl font-bold italic blur-[7px] text-primary tabular-nums">87</span>
                          <span className="text-sm font-bold opacity-30 blur-[5px] mb-1">/ 100</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5" aria-hidden>
                      {[88, 64, 76].map((w, i) => (
                        <div key={i} className="h-2 rounded-full bg-foreground/10 blur-[3px]" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-center opacity-50 leading-relaxed">
                    Those metrics are real — measured from your speech. Your{" "}
                    <span className="text-primary font-semibold">AI coaching score, model answer & personalised pathway</span>{" "}
                    unlock free in 10 seconds.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      to="/login?mode=signup"
                      onClick={() => track("trial_signup_click", { from: "results", wpm: metrics.wpm, fillers: metrics.fillers })}
                      className="group flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-primary text-white shadow-glow hover:scale-[1.02] active:scale-95 transition-transform"
                    >
                      <span className="text-sm font-black uppercase tracking-wide">Unlock my AI score — free</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <button
                      onClick={() => resetToIntro(true)}
                      className="px-5 py-4 rounded-full border border-border/60 text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:border-primary/40 transition-all"
                    >
                      <RotateCcw className="h-4 w-4 inline" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── DENIED ─────────────────────────────────────────────────────── */}
          {phase === "denied" && (
            <div className="space-y-5 text-center py-4">
              <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 opacity-70" />
              <h2 className="speak-serif text-2xl italic">We need your mic.</h2>
              <p className="text-sm opacity-50 leading-relaxed">
                Allow microphone access in your browser, then try again.
              </p>
              <button
                onClick={() => resetToIntro(false)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow"
              >
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
            </div>
          )}

          {/* ── UNSUPPORTED ────────────────────────────────────────────────── */}
          {phase === "unsupported" && (
            <div className="space-y-5 text-center py-4">
              <Mic className="h-10 w-10 mx-auto text-primary opacity-40" />
              <h2 className="speak-serif text-2xl italic">Best on a computer.</h2>
              <p className="text-sm opacity-50 leading-relaxed">
                The instant 30-second drill runs in desktop Chrome. On a phone or tablet, create a
                free account to record with the full server-side AI coach — same feedback, any device.
              </p>
              <Link
                to="/login?mode=signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow"
              >
                Start now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
