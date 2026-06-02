import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRecordings, useSyncedStreak } from "@/hooks/useRecordings";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { setTimerActive } from "@/lib/timerState";
import { setRecordingActive } from "@/lib/recordingState";
import { isMobileDevice } from "@/lib/isMobileDevice";
import { coachImpromptu, transcribeAudio, type ImpromptuCoachReport } from "@/services/geminiService";
import { logSkillEvent } from "@/lib/skillEvents";
import { impromptuToDims } from "@/lib/skillScoring";
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

export const FILLER_WORDS = [
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

function countFillersInChunk(chunk: string): number {
  const lower = chunk.toLowerCase();
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
  // Options below persist across refresh via localStorage so the user's chosen
  // setup (difficulty, duration, recording, challenge, curveball) is restored
  // on next visit. Topic stays ephemeral — we still randomise per session.
  const [difficulty, setDifficultyState] = useLocalStorageState<Difficulty>("speakbold:impromptu:difficulty", "Medium");
  const [duration, setDurationState] = useLocalStorageState<number>("speakbold:impromptu:duration", 60);
  const [curveballEnabled, setCurveballEnabledState] = useLocalStorageState<boolean>("speakbold:impromptu:curveball", false);
  const [recordEnabled, setRecordEnabledState] = useLocalStorageState<boolean>("speakbold:impromptu:record", false);
  const [challengeMode, setChallengeModeState] = useLocalStorageState<boolean>("speakbold:impromptu:challenge", false);
  const [topic, setTopicState] = useState<ImpromptuTopic>(() => getRandomTopic(difficulty));

  /** Last duration set explicitly by the user — restored when drill mode ends */
  const userDurationRef = useRef(duration);

  // ── Phase ──────────────────────────────────────────────────────────────────
  const [phase, setPhaseState] = useState<SessionPhase>("setup");
  const phaseRef = useRef<SessionPhase>("setup");
  const setPhase = useCallback((p: SessionPhase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // ── Drill mode ─────────────────────────────────────────────────────────────
  /** True when in a 30-second curveball drill (not a full session) */
  const [drillMode, setDrillMode] = useState(false);

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
  /** Elapsed seconds at each detected filler event — used for review sparkline */
  const [fillerTimes, setFillerTimes] = useState<number[]>([]);
  const transcriptRef = useRef("");
  const fillerCountRef = useRef(0);
  const fillerTimesRef = useRef<number[]>([]);

  // ── Curveball ──────────────────────────────────────────────────────────────
  const [curveballText, setCurveballText] = useState<string | null>(null);
  const [curveballVisible, setCurveballVisible] = useState(false);
  const curveballFiredRef = useRef(false);
  const curveballTextRef = useRef<string | null>(null);

  // ── Review ─────────────────────────────────────────────────────────────────
  const [coachReport, setCoachReport] = useState<ImpromptuCoachReport | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(false);
  /** Final WPM frozen for the review screen. The live `wpm` is only valid during
   *  the speaking phase; this holds the figure actually computed for coaching —
   *  on mobile it comes from the server-side transcription of the recording. */
  const [reviewWpm, setReviewWpm] = useState(0);

  // ── Recording ──────────────────────────────────────────────────────────────
  const recorderStartRef = useRef<(() => void) | undefined>(undefined);
  const recorderPauseRef = useRef<(() => void) | undefined>(undefined);
  const recorderResumeRef = useRef<(() => void) | undefined>(undefined);
  const recorderStopRef = useRef<(() => void) | undefined>(undefined);
  const [autoFeedbackId, setAutoFeedbackId] = useState<string | null>(null);
  const wasRecordingRef = useRef(false);
  /** Object URL for the most recent recording blob — available during review */
  const [recordingBlobUrl, setRecordingBlobUrl] = useState<string | null>(null);
  /** True when the live (browser) transcript was empty and we're waiting on the
   *  recording so we can transcribe it server-side and still produce coaching.
   *  Common on mobile, where Web Speech recognition is weak or unsupported. */
  const awaitingRecordingTranscriptRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Feed this drill into the AI Coach's skill profile (derived from the metrics
  // we already compute — no extra AI call).
  const logImpromptuSkill = useCallback(
    (report: ImpromptuCoachReport, wpm: number, fillerCount: number, totalWords: number) => {
      const fwTotal = report.frameworkCheck?.length ?? 0;
      const fwHits = report.frameworkCheck?.filter((f) => f.hit).length ?? 0;
      logSkillEvent({
        userId: user?.id,
        source: "impromptu",
        scores: impromptuToDims({
          score: report.score,
          wpm,
          fillerCount,
          totalWords,
          frameworkHitRate: fwTotal > 0 ? fwHits / fwTotal : 0,
        }),
        overall: report.score,
        meta: { topicId: topicRef.current?.id, difficulty: topicRef.current?.difficulty },
      });
    },
    [user?.id]
  );

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
    setReviewWpm(finalWpm);

    if (finalTranscript.trim().length < 15) {
      // The browser's live transcript is empty. If we recorded audio, defer
      // coaching to server-side transcription (handled in onRecordingComplete)
      // instead of dead-ending at "No speech captured" — this is the reliable
      // path on mobile/tablet where Web Speech barely picks anything up.
      if (wasRecordingRef.current) {
        awaitingRecordingTranscriptRef.current = true;
        setLoadingCoach(true);
        // Safety net: if the recording never arrives (mic genuinely failed),
        // don't hang on the loader forever.
        if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = setTimeout(() => {
          if (awaitingRecordingTranscriptRef.current) {
            awaitingRecordingTranscriptRef.current = false;
            setLoadingCoach(false);
            setCoachReport(null);
          }
        }, 12000);
      } else {
        setCoachReport(null);
      }
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
        framework: topicRef.current.framework,
        duration: durationRef.current,
        score: report.score,
        wpm: finalWpm,
        fillerCount: finalFillers,
        totalWords: finalWords,
        verdict: report.verdict,
      });
      logImpromptuSkill(report, finalWpm, finalFillers, finalWords);
    } catch {
      setCoachReport(null);
    }
    setLoadingCoach(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          // Mobile devices need the recorder to run regardless of the toggle:
          // we can't do live Web Speech reliably there, so the recorded blob
          // is the only path to a transcript via server-side fallback.
          if (recordEnabledRef.current || isMobileDevice()) {
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
    // Skip live Web Speech on phones/tablets. The mobile engine ignores
    // `continuous = true` and auto-stops every few seconds; the restart loop
    // re-opens getUserMedia, causing the mic indicator to blink on/off and
    // conflicting with the MediaRecorder's own stream. We transcribe the
    // recorded audio server-side after the turn ends instead (handled in
    // onRecordingComplete via the awaitingRecordingTranscriptRef path).
    if (isMobileDevice()) {
      awaitingRecordingTranscriptRef.current = true;
      return;
    }
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

        // Track elapsed time of each filler event for sparkline
        const chunkFillerCount = countFillersInChunk(newFinal);
        if (chunkFillerCount > 0) {
          const elapsedNow = durationRef.current - speakSecondsLeftRef.current;
          const newTimes = Array(chunkFillerCount).fill(elapsedNow);
          fillerTimesRef.current = [...fillerTimesRef.current, ...newTimes];
          setFillerTimes([...fillerTimesRef.current]);
        }

        const fillers = countFillers(updated);
        fillerCountRef.current = fillers;
        setLiveTranscript(updated);
        setFillerCount(fillers);
      }
      setLiveInterim(interim);
    };
    recognition.onerror = (e: any) => {
      // Transient — let onend restart. Fatal (mic blocked / unavailable) — stop
      // the restart loop so we don't spin pointlessly on mobile.
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        stopped = true;
      }
    };
    recognition.onend = () => {
      if (stopped) return;
      // Mobile speech engines auto-stop on every short pause. Restart immediately
      // so words spoken right after a pause aren't dropped — the gap here is what
      // makes mobile transcription feel like it "misses" speech. Only fall back to
      // a short delay if an immediate restart throws (engine still tearing down).
      try {
        recognition.start();
      } catch {
        restartTimer = setTimeout(() => {
          if (!stopped) try { recognition.start(); } catch (_) {}
        }, 200);
      }
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
  // Mark the timer ACTIVE so the app chrome goes fullscreen (hides MobileNav,
  // drops the bottom padding) during prep + speaking. We deliberately do NOT
  // publish timer seconds: the GlobalStatusBar only renders its countdown pill
  // when duration > 0, so leaving it at 0 keeps the "0:05 · LIVE" pill off
  // during impromptu. The in-page timer already shows the countdown, and we
  // only want the global MIC indicator (driven by recordingState below) — and
  // only while actually speaking.
  useEffect(() => {
    const active = (phase === "speaking" && !isPaused) || phase === "prep";
    setTimerActive(active);
    return () => setTimerActive(false);
  }, [phase, isPaused]);

  // ── recordingState broadcast ─────────────────────────────────────────────────
  useEffect(() => {
    const active = recordEnabled && phase === "speaking" && !isPaused;
    setRecordingActive(active);
    return () => setRecordingActive(false);
  }, [recordEnabled, phase, isPaused]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const begin = useCallback(() => {
    // Revoke any previous blob URL
    setRecordingBlobUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    transcriptRef.current = "";
    fillerCountRef.current = 0;
    fillerTimesRef.current = [];
    setLiveTranscript("");
    setLiveInterim("");
    setFillerCount(0);
    setFillerTimes([]);
    setCoachReport(null);
    setReviewWpm(0);
    setAutoFeedbackId(null);
    setCurveballVisible(false);
    curveballFiredRef.current = false;
    wasRecordingRef.current = false;
    setSpeakingExpired(false);
    awaitingRecordingTranscriptRef.current = false;
    if (fallbackTimeoutRef.current) { clearTimeout(fallbackTimeoutRef.current); fallbackTimeoutRef.current = null; }

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
    if (recordEnabledRef.current || isMobileDevice()) {
      recorderStartRef.current?.();
      wasRecordingRef.current = true;
    }
  }, [setPhase]);

  /**
   * Jump directly to speaking with the curveball shown immediately.
   * Runs for 30 seconds as a focused pivot drill.
   */
  const drillCurveball = useCallback(() => {
    if (!curveballTextRef.current) return;

    // Revoke previous blob URL
    setRecordingBlobUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    transcriptRef.current = "";
    fillerCountRef.current = 0;
    fillerTimesRef.current = [];
    setLiveTranscript("");
    setLiveInterim("");
    setFillerCount(0);
    setFillerTimes([]);
    setCoachReport(null);
    setReviewWpm(0);
    setAutoFeedbackId(null);
    setSpeakingExpired(false);
    wasRecordingRef.current = false;
    awaitingRecordingTranscriptRef.current = false;
    if (fallbackTimeoutRef.current) { clearTimeout(fallbackTimeoutRef.current); fallbackTimeoutRef.current = null; }

    // Show curveball immediately
    setCurveballVisible(true);
    curveballFiredRef.current = true;

    setDrillMode(true);

    const drillDur = 30;
    setSpeakSecondsLeft(drillDur);
    speakSecondsLeftRef.current = drillDur;
    durationRef.current = drillDur;
    setDurationState(drillDur);

    setPhase("speaking");
    if (recordEnabledRef.current || isMobileDevice()) {
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
    fillerTimesRef.current = [];
    setLiveTranscript("");
    setLiveInterim("");
    setFillerCount(0);
    setFillerTimes([]);
    setCurveballText(null);
    curveballTextRef.current = null;
    setCurveballVisible(false);
    curveballFiredRef.current = false;
    setCoachReport(null);
    setReviewWpm(0);
    setLoadingCoach(false);
    setSpeakingExpired(false);
    wasRecordingRef.current = false;
    setAutoFeedbackId(null);
    awaitingRecordingTranscriptRef.current = false;
    if (fallbackTimeoutRef.current) { clearTimeout(fallbackTimeoutRef.current); fallbackTimeoutRef.current = null; }

    // Restore the user's chosen duration when exiting drill mode
    if (drillMode) {
      setDurationState(userDurationRef.current);
      durationRef.current = userDurationRef.current;
      setDrillMode(false);
    }

    // Revoke blob URL on reset
    setRecordingBlobUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    if (newTopic) setTopicState(newTopic);
  }, [setPhase, drillMode]);

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
  const setDuration = useCallback((d: number) => {
    userDurationRef.current = d;
    setDurationState(d);
  }, []);
  const setCurveballEnabled = useCallback((v: boolean) => setCurveballEnabledState(v), []);
  const setRecordEnabled = useCallback((v: boolean) => setRecordEnabledState(v), []);
  const setChallengeMode = useCallback((v: boolean) => setChallengeModeState(v), []);

  // Called by RecorderPanel after recording stops
  const onRecordingComplete = useCallback(
    async (blob: Blob, durationMs: number) => {
      markPracticed();

      // Store blob URL for in-review playback
      const url = URL.createObjectURL(blob);
      setRecordingBlobUrl(url);

      // Fallback path: the live transcript was empty, so transcribe the recorded
      // audio server-side and run the impromptu coaching off that instead. This
      // is what makes mobile/tablet sessions produce real feedback despite the
      // browser's weak on-device speech recognition.
      if (awaitingRecordingTranscriptRef.current) {
        awaitingRecordingTranscriptRef.current = false;
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
        try {
          const serverTranscript = (await transcribeAudio(blob)).trim();
          if (serverTranscript.length >= 15) {
            transcriptRef.current = serverTranscript;
            setLiveTranscript(serverTranscript);
            const words = serverTranscript.split(/\s+/).filter(Boolean).length;
            const fillers = countFillers(serverTranscript);
            fillerCountRef.current = fillers;
            setFillerCount(fillers);
            // Actual spoken time from the recording is more accurate than the timer.
            const secs = durationMs > 0 ? durationMs / 1000 : durationRef.current;
            const fbWpm = secs > 3 ? Math.round((words / secs) * 60) : 0;
            setReviewWpm(fbWpm);

            const report = await coachImpromptu(
              topicRef.current,
              serverTranscript,
              durationRef.current,
              fillers,
              fbWpm
            );
            setCoachReport(report);
            addSession({
              topicText: topicRef.current.text,
              topicId: topicRef.current.id,
              difficulty: topicRef.current.difficulty,
              framework: topicRef.current.framework,
              duration: durationRef.current,
              score: report.score,
              wpm: fbWpm,
              fillerCount: fillers,
              totalWords: words,
              verdict: report.verdict,
            });
            logImpromptuSkill(report, fbWpm, fillers, words);
          } else {
            setCoachReport(null);
          }
        } catch {
          setCoachReport(null);
        } finally {
          setLoadingCoach(false);
        }
      }

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
    [user, uploadRecording, refreshRecordings, markPracticed, addSession]
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
    drillMode,

    // Timers
    prepSecondsLeft,
    speakSecondsLeft,
    isPaused,

    // Live metrics
    liveTranscript,
    liveInterim,
    fillerCount,
    fillerTimes,
    wpm,
    totalWords,
    elapsedSecs,

    // Curveball
    curveballText,
    curveballVisible,

    // Review
    coachReport,
    loadingCoach,
    reviewWpm,
    recordingBlobUrl,

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
    drillCurveball,

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
