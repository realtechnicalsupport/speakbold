import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { setTimerActive, setTimerSeconds } from "@/lib/timerState";
import { setRecordingActive } from "@/lib/recordingState";
import { coachImpromptu, type ImpromptuCoachReport } from "@/services/geminiService";
import {
  type Difficulty,
  type ImpromptuTopic,
  PREP_TIME,
  getRandomTopic,
} from "@/data/impromptuTopics";
import { useImpromptuHistory } from "@/lib/impromptuHistory";

export type SessionPhase = "setup" | "prep" | "speaking" | "review";

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

const FILLER_WORDS = [
  "um", "uh", "like", "you know", "so", "basically", "right",
  "actually", "literally", "kind of", "sort of",
];

function countFillers(text: string): number {
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce(
    (n, w) => n + (lower.match(new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "g"))?.length ?? 0),
    0
  );
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useImpromptuSession() {
  // ── Config ─────────────────────────────────────────────────────────────────
  const [topic, setTopicState] = useState<ImpromptuTopic>(() => getRandomTopic("Medium"));
  const [difficulty, setDifficultyState] = useState<Difficulty>("Medium");
  const [duration, setDurationState] = useState(60);
  const [curveballEnabled, setCurveballEnabledState] = useState(false);
  const [recordEnabled, setRecordEnabledState] = useState(false);
  const [challengeMode, setChallengeModeState] = useState(false);

  // ── Phase ──────────────────────────────────────────────────────────────────
  const [phase, setPhaseState] = useState<SessionPhase>("setup");
  const phaseRef = useRef<SessionPhase>("setup");
  const setPhase = useCallback((p: SessionPhase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // ── Timers ─────────────────────────────────────────────────────────────────
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(0);
  const [speakSecondsLeft, setSpeakSecondsLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const speakSecondsLeftRef = useRef(0);

  // ── Speaking expired flag (set inside interval, consumed by effect) ─────────
  const [speakingExpired, setSpeakingExpired] = useState(false);

  // ── Speech ─────────────────────────────────────────────────────────────────
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveInterim, setLiveInterim] = useState("");
  const [fillerCount, setFillerCount] = useState(0);
  const transcriptRef = useRef("");
  const fillerCountRef = useRef(0);

  // ── Curveball ──────────────────────────────────────────────────────────────
  const [curveballText, setCurveballText] = useState<string | null>(null);
  const [curveballVisible, setCurveballVisible] = useState(false);
  const curveballFiredRef = useRef(false);
  const curveballTextRef = useRef<string | null>(null);

  // ── Review ─────────────────────────────────────────────────────────────────
  const [coachReport, setCoachReport] = useState<ImpromptuCoachReport | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(false);

  // ── Recorder ───────────────────────────────────────────────────────────────
  const recorderStartRef = useRef<(() => void) | undefined>(undefined);
  const recorderPauseRef = useRef<(() => void) | undefined>(undefined);
  const recorderResumeRef = useRef<(() => void) | undefined>(undefined);
  const recorderStopRef = useRef<(() => void) | undefined>(undefined);
  const [autoFeedbackId, setAutoFeedbackId] = useState<string | null>(null);
  const wasRecordingRef = useRef(false);

  // ── Stable refs for values used in callbacks ────────────────────────────────
  const topicRef = useRef(topic);
  const durationRef = useRef(duration);
  const difficultyRef = useRef(difficulty);
  const curveballEnabledRef = useRef(curveballEnabled);
  const recordEnabledRef = useRef(recordEnabled);

  useEffect(() => { topicRef.current = topic; }, [topic]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { curveballEnabledRef.current = curveballEnabled; }, [curveballEnabled]);
  useEffect(() => { recordEnabledRef.current = recordEnabled; }, [recordEnabled]);
  useEffect(() => { speakSecondsLeftRef.current = speakSecondsLeft; }, [speakSecondsLeft]);

  // ── Auth & services ────────────────────────────────────────────────────────
  const { user } = useAuth();
  const { upload: uploadRecording, refresh: refreshRecordings } = useRecordings("impromptu");
  const { markPracticed } = useSyncedStreak();
  const { addSession, history, stats } = useImpromptuHistory();

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const totalWords = useMemo(
    () => liveTranscript.split(/\s+/).filter(Boolean).length,
    [liveTranscript]
  );
  const elapsedSecs = duration - speakSecondsLeft;
  const wpm = phase === "speaking" && elapsedSecs > 3
    ? Math.round((totalWords / elapsedSecs) * 60)
    : 0;
  const speechSupported = !!getSpeechRecognition();

  // ── Transition to REVIEW ────────────────────────────────────────────────────
  const transitionToReview = useCallback(async () => {
    setPhase("review");
    setIsPaused(false);
    isPausedRef.current = false;

    if (wasRecordingRef.current) {
      recorderStopRef.current?.();
    }
    setRecordingActive(false);

    const finalTranscript = transcriptRef.current;
    const finalFillers = fillerCountRef.current;
    const finalWords = finalTranscript.split(/\s+/).filter(Boolean).length;
    const finalElapsed = durationRef.current - speakSecondsLeftRef.current;
    const finalWpm = finalElapsed > 3
      ? Math.round((finalWords / Math.max(1, finalElapsed)) * 60)
      : 0;

    if (finalTranscript.trim().length < 15) {
      setCoachReport(null);
      return;
    }

    setLoadingCoach(true);
    try {
      const report = await coachImpromptu(
        topicRef.current,
        finalTranscript,
        durationRef.current,
        finalFillers,
        finalWpm
      );
      setCoachReport(report);
      addSession({
        topicText: topicRef.current.text,
        topicId: topicRef.current.id,
        difficulty: topicRef.current.difficulty,
        duration: durationRef.current,
        score: report.score,
        wpm: finalWpm,
        fillerCount: finalFillers,
        totalWords: finalWords,
        verdict: report.verdict,
      });
    } catch {
      setCoachReport(null);
    }
    setLoadingCoach(false);
  }, [setPhase, addSession]);

  // ── PREP timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "prep") return;
    const id = window.setInterval(() => {
      setPrepSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          setSpeakSecondsLeft(durationRef.current);
          speakSecondsLeftRef.current = durationRef.current;
          setPhase("speaking");
          if (recordEnabledRef.current) {
            recorderStartRef.current?.();
            wasRecordingRef.current = true;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, setPhase]);

  // ── SPEAKING timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "speaking" || isPaused) return;
    const id = window.setInterval(() => {
      setSpeakSecondsLeft(s => {
        const next = s - 1;
        speakSecondsLeftRef.current = next;

        // Curveball trigger at ~55% elapsed
        if (
          curveballEnabledRef.current &&
          !curveballFiredRef.current &&
          curveballTextRef.current
        ) {
          const elapsed = durationRef.current - next;
          if (elapsed >= Math.floor(durationRef.current * 0.55)) {
            curveballFiredRef.current = true;
            setCurveballVisible(true);
          }
        }

        if (next <= 0) {
          clearInterval(id);
          setSpeakingExpired(true);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, isPaused]);

  // ── Consume speakingExpired flag ────────────────────────────────────────────
  useEffect(() => {
    if (!speakingExpired) return;
    setSpeakingExpired(false);
    transitionToReview();
  }, [speakingExpired, transitionToReview]);

  // ── Speech recognition ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "speaking" || isPaused) return;
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let stopped = false;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;

    recognition.onresult = (e: any) => {
      let interim = "";
      let newFinal = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) newFinal += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      if (newFinal) {
        const updated = transcriptRef.current + newFinal;
        transcriptRef.current = updated;
        const fillers = countFillers(updated);
        fillerCountRef.current = fillers;
        setLiveTranscript(updated);
        setFillerCount(fillers);
      }
      setLiveInterim(interim);
    };
    recognition.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
    };
    recognition.onend = () => {
      if (stopped) return;
      restartTimer = setTimeout(() => {
        if (!stopped) try { recognition.start(); } catch (_) {}
      }, 100);
    };

    try { recognition.start(); } catch (_) {}

    return () => {
      stopped = true;
      if (restartTimer) clearTimeout(restartTimer);
      try { recognition.stop(); } catch (_) {}
      setLiveInterim("");
    };
  }, [phase, isPaused]);

  // ── timerState broadcast ─────────────────────────────────────────────────────
  useEffect(() => {
    const active = (phase === "speaking" && !isPaused) || phase === "prep";
    setTimerActive(active);
    if (phase === "speaking") setTimerSeconds(speakSecondsLeft, duration);
    else if (phase === "prep") setTimerSeconds(prepSecondsLeft, PREP_TIME[difficulty]);
    return () => { setTimerActive(false); setTimerSeconds(0, 0); };
  }, [phase, isPaused, speakSecondsLeft, prepSecondsLeft, duration, difficulty]);

  // ── recordingState broadcast ─────────────────────────────────────────────────
  useEffect(() => {
    const active = recordEnabled && phase === "speaking" && !isPaused;
    setRecordingActive(active);
    return () => setRecordingActive(false);
  }, [recordEnabled, phase, isPaused]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const begin = useCallback(() => {
    transcriptRef.current = "";
    fillerCountRef.current = 0;
    setLiveTranscript("");
    setLiveInterim("");
    setFillerCount(0);
    setCoachReport(null);
    setAutoFeedbackId(null);
    setCurveballVisible(false);
    curveballFiredRef.current = false;
    wasRecordingRef.current = false;
    setSpeakingExpired(false);

    if (curveballEnabledRef.current && topicRef.current.curveballs.length > 0) {
      const cbs = topicRef.current.curveballs;
      const cb = cbs[Math.floor(Math.random() * cbs.length)];
      setCurveballText(cb);
      curveballTextRef.current = cb;
    } else {
      setCurveballText(null);
      curveballTextRef.current = null;
    }

    setPrepSecondsLeft(PREP_TIME[difficultyRef.current]);
    setPhase("prep");
  }, [setPhase]);

  const pause = useCallback(() => {
    if (phaseRef.current !== "speaking") return;
    setIsPaused(true);
    isPausedRef.current = true;
    if (wasRecordingRef.current) recorderPauseRef.current?.();
  }, []);

  const resume = useCallback(() => {
    if (phaseRef.current !== "speaking") return;
    setIsPaused(false);
    isPausedRef.current = false;
    if (wasRecordingRef.current) recorderResumeRef.current?.();
  }, []);

  const stopEarly = useCallback(() => {
    if (phaseRef.current !== "speaking") return;
    transitionToReview();
  }, [transitionToReview]);

  const skipPrep = useCallback(() => {
    if (phaseRef.current !== "prep") return;
    setPrepSecondsLeft(0);
    setSpeakSecondsLeft(durationRef.current);
    speakSecondsLeftRef.current = durationRef.current;
    setPhase("speaking");
    if (recordEnabledRef.current) {
      recorderStartRef.current?.();
      wasRecordingRef.current = true;
    }
  }, [setPhase]);

  const reset = useCallback((newTopic?: ImpromptuTopic) => {
    setPhase("setup");
    setIsPaused(false);
    isPausedRef.current = false;
    setPrepSecondsLeft(0);
    setSpeakSecondsLeft(0);
    speakSecondsLeftRef.current = 0;
    transcriptRef.current = "";
    setLiveTranscript("");
    setLiveInterim("");
    setFillerCount(0);
    setCurveballText(null);
    curveballTextRef.current = null;
    setCurveballVisible(false);
    curveballFiredRef.current = false;
    setCoachReport(null);
    setLoadingCoach(false);
    setSpeakingExpired(false);
    wasRecordingRef.current = false;
    if (newTopic) setTopicState(newTopic);
  }, [setPhase]);

  const goAgain = useCallback(() => reset(), [reset]);

  const newTopic = useCallback(
    (d?: Difficulty) => {
      const diff = d ?? difficultyRef.current;
      if (d) setDifficultyState(d);
      reset(getRandomTopic(diff));
    },
    [reset]
  );

  const shuffleTopic = useCallback(() => {
    const current = topicRef.current;
    let next = getRandomTopic(difficultyRef.current);
    let guard = 0;
    while (next.id === current.id && guard < 10) {
      next = getRandomTopic(difficultyRef.current);
      guard++;
    }
    setTopicState(next);
  }, []);

  // Config setters
  const setTopic = useCallback((t: ImpromptuTopic) => setTopicState(t), []);
  const setDifficulty = useCallback((d: Difficulty) => {
    setDifficultyState(d);
    setTopicState(getRandomTopic(d));
  }, []);
  const setDuration = useCallback((d: number) => setDurationState(d), []);
  const setCurveballEnabled = useCallback((v: boolean) => setCurveballEnabledState(v), []);
  const setRecordEnabled = useCallback((v: boolean) => setRecordEnabledState(v), []);
  const setChallengeMode = useCallback((v: boolean) => setChallengeModeState(v), []);

  // Called by RecorderPanel after recording stops
  const onRecordingComplete = useCallback(
    async (blob: Blob, durationMs: number) => {
      markPracticed();
      if (!user) return;
      try {
        const result = await uploadRecording(blob, {
          promptText: `Impromptu: ${topicRef.current.text}`,
          difficulty: topicRef.current.difficulty,
          durationMs,
          targetSeconds: durationRef.current,
        });
        if (result?.id) setAutoFeedbackId(result.id);
        refreshRecordings();
      } catch { /* non-critical */ }
    },
    [user, uploadRecording, refreshRecordings, markPracticed]
  );

  return {
    // Phase
    phase,

    // Config
    topic,
    difficulty,
    duration,
    curveballEnabled,
    recordEnabled,
    challengeMode,

    // Timers
    prepSecondsLeft,
    speakSecondsLeft,
    isPaused,

    // Live metrics
    liveTranscript,
    liveInterim,
    fillerCount,
    wpm,
    totalWords,
    elapsedSecs,

    // Curveball
    curveballText,
    curveballVisible,

    // Review
    coachReport,
    loadingCoach,

    // Misc
    speechSupported,
    autoFeedbackId,
    clearAutoFeedback: () => setAutoFeedbackId(null),

    // Actions
    begin,
    pause,
    resume,
    stopEarly,
    skipPrep,
    goAgain,
    newTopic,
    shuffleTopic,
    reset,

    // Config setters
    setTopic,
    setDifficulty,
    setDuration,
    setCurveballEnabled,
    setRecordEnabled,
    setChallengeMode,

    // History
    history,
    stats,

    // Recorder refs (assigned by RecorderPanel via callback props)
    recorderStartRef,
    recorderPauseRef,
    recorderResumeRef,
    recorderStopRef,
    onRecordingComplete,
  };
}
