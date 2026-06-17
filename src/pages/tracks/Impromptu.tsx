import { useLayoutEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { AnimatePresence, motion } from "framer-motion";
import { useImpromptuSession } from "@/hooks/useImpromptuSession";
import { ImpromptuSetup } from "@/components/impromptu/ImpromptuSetup";
import { ImpromptuPrep } from "@/components/impromptu/ImpromptuPrep";
import { ImpromptuStage } from "@/components/impromptu/ImpromptuStage";
import { ImpromptuReview } from "@/components/impromptu/ImpromptuReview";
import { ImpromptuCoachExport } from "@/components/impromptu/ImpromptuCoachExport";

const Impromptu = () => {
  const { user } = useAuth();
  const session = useImpromptuSession();

  const {
    phase,
    topic,
    difficulty,
    duration,
    prepTime,
    curveballEnabled,
    recordEnabled,
    challengeMode,
    exportMode,
    drillMode,
    openingLine,
    setOpeningLine,
    prepNotes,
    setPrepNotes,
    prepSecondsLeft,
    prepTotal,
    speakSecondsLeft,
    isPaused,
    liveTranscript,
    liveInterim,
    fillerCount,
    fillerTimes,
    wpm,
    totalWords,
    elapsedSecs,
    curveballText,
    curveballVisible,
    coachReport,
    loadingCoach,
    reviewWpm,
    speechSupported,
    recordingBlobUrl,
    recordingDurationMs,
    begin,
    pause,
    resume,
    stopEarly,
    skipPrep,
    goAgain,
    newTopic,
    shuffleTopic,
    setDifficulty,
    setDuration,
    setPrepTime,
    setExportMode,
    setCurveballEnabled,
    setRecordEnabled,
    setChallengeMode,
    drillCurveball,
    history,
    stats,
    recorderStartRef,
    recorderPauseRef,
    recorderResumeRef,
    recorderStopRef,
    onRecordingComplete,
  } = session;

  // Lock body scroll while the full-screen prep/speaking overlay is visible.
  // Without this the body (TrackShell is min-h-screen and taller than viewport)
  // stays scrollable behind the fixed overlay, producing two simultaneous
  // scrollbars on the right edge of the screen.
  useLayoutEffect(() => {
    const isOverlay = phase === "prep" || phase === "speaking";
    document.body.style.overflow = isOverlay ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [phase]);

  // Shared recorder panel — rendered once, always in DOM when recording is enabled
  const recorderPanel = recordEnabled && (
    <div className="opacity-0 pointer-events-none absolute" aria-hidden="true">
      <RecorderPanel
        externalRunning={phase === "speaking" && !isPaused}
        recorderStartRef={fn => { recorderStartRef.current = fn; }}
        recorderPauseRef={fn => { recorderPauseRef.current = fn; }}
        recorderResumeRef={fn => { recorderResumeRef.current = fn; }}
        recorderStopRef={fn => { recorderStopRef.current = fn; }}
        onRecorded={async ({ blob, durationMs }) => {
          await onRecordingComplete(blob, durationMs);
        }}
      />
    </div>
  );

  return (
    <>
      {/* ── SETUP + REVIEW live inside TrackShell ──────────────────────────── */}
      <TrackShell
        eyebrow="MODULE 02 — IMPROMPTU"
        title={<>Think fast. <span className="text-primary italic">Speak bold.</span></>}
        intro="Pick a topic, prep for a few seconds, then speak until the timer ends."
        compact
      >
        <AnimatePresence mode="wait">
          {phase === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ImpromptuSetup
                topic={topic}
                difficulty={difficulty}
                duration={duration}
                prepTime={prepTime}
                curveballEnabled={curveballEnabled}
                recordEnabled={recordEnabled}
                challengeMode={challengeMode}
                exportMode={exportMode}
                stats={stats}
                recentHistory={history}
                hasUser={!!user}
                onBegin={begin}
                onShuffle={shuffleTopic}
                onSetDifficulty={setDifficulty}
                onSetDuration={setDuration}
                onSetPrepTime={setPrepTime}
                onSetCurveball={setCurveballEnabled}
                onSetRecord={setRecordEnabled}
                onSetChallenge={setChallengeMode}
                onSetExport={setExportMode}
              />
            </motion.div>
          )}

          {phase === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {exportMode ? (
                <ImpromptuCoachExport
                  topic={topic}
                  liveTranscript={liveTranscript}
                  wpm={reviewWpm}
                  totalWords={totalWords}
                  elapsedSecs={elapsedSecs}
                  duration={duration}
                  prepNotes={prepNotes}
                  openingLine={openingLine}
                  recordingBlobUrl={recordingBlobUrl}
                  recordingDurationMs={recordingDurationMs}
                  processing={loadingCoach}
                  onGoAgain={goAgain}
                  onNewTopic={() => newTopic()}
                />
              ) : (
                <ImpromptuReview
                  topic={topic}
                  duration={duration}
                  liveTranscript={liveTranscript}
                  wpm={reviewWpm}
                  totalWords={totalWords}
                  fillerCount={fillerCount}
                  fillerTimes={fillerTimes}
                  elapsedSecs={elapsedSecs}
                  coachReport={coachReport}
                  loadingCoach={loadingCoach}
                  stats={stats}
                  recordingBlobUrl={recordingBlobUrl}
                  recordingDurationMs={recordingDurationMs}
                  curveballText={curveballText}
                  drillMode={drillMode}
                  onGoAgain={goAgain}
                  onNewTopic={() => newTopic()}
                  onDrillCurveball={drillCurveball}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {recorderPanel}
      </TrackShell>

      {/* ── PREP + SPEAKING: full-screen fixed overlay ─────────────────────── */}
      <AnimatePresence>
        {(phase === "prep" || phase === "speaking") && (
          <motion.div
            key="fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-background overflow-y-auto"
          >
            <AnimatePresence mode="wait">
              {phase === "prep" && (
                <motion.div
                  key="prep"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 container"
                >
                  <ImpromptuPrep
                    topic={topic}
                    secondsLeft={prepSecondsLeft}
                    totalPrep={prepTotal}
                    challengeMode={challengeMode}
                    openingLine={openingLine}
                    onSetOpeningLine={setOpeningLine}
                    prepNotes={prepNotes}
                    onSetPrepNotes={exportMode ? setPrepNotes : undefined}
                    onSkip={skipPrep}
                  />
                </motion.div>
              )}

              {phase === "speaking" && (
                <motion.div
                  key="speaking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 container"
                >
                  <ImpromptuStage
                    topic={topic}
                    duration={duration}
                    secondsLeft={speakSecondsLeft}
                    isPaused={isPaused}
                    wpm={wpm}
                    totalWords={totalWords}
                    fillerCount={fillerCount}
                    elapsedSecs={elapsedSecs}
                    liveInterim={liveInterim}
                    speechSupported={speechSupported}
                    curveballText={curveballText}
                    curveballVisible={curveballVisible}
                    openingLine={openingLine}
                    onPause={pause}
                    onResume={resume}
                    onStop={stopEarly}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Impromptu;
