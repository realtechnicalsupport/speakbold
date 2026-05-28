import { useAuth } from "@/context/AuthContext";
import { TrackShell } from "@/components/TrackShell";
import { RecorderPanel } from "@/components/RecorderPanel";
import { RecordingFeedbackModal } from "@/components/RecordingFeedback";
import { AnimatePresence, motion } from "framer-motion";
import { useImpromptuSession } from "@/hooks/useImpromptuSession";
import { ImpromptuSetup } from "@/components/impromptu/ImpromptuSetup";
import { ImpromptuPrep } from "@/components/impromptu/ImpromptuPrep";
import { ImpromptuStage } from "@/components/impromptu/ImpromptuStage";
import { ImpromptuReview } from "@/components/impromptu/ImpromptuReview";

const Impromptu = () => {
  const { user } = useAuth();
  const session = useImpromptuSession();

  const {
    phase,
    topic,
    difficulty,
    duration,
    curveballEnabled,
    recordEnabled,
    challengeMode,
    drillMode,
    prepSecondsLeft,
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
    speechSupported,
    autoFeedbackId,
    clearAutoFeedback,
    recordingBlobUrl,
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
                curveballEnabled={curveballEnabled}
                recordEnabled={recordEnabled}
                challengeMode={challengeMode}
                stats={stats}
                recentHistory={history}
                hasUser={!!user}
                onBegin={begin}
                onShuffle={shuffleTopic}
                onSetDifficulty={setDifficulty}
                onSetDuration={setDuration}
                onSetCurveball={setCurveballEnabled}
                onSetRecord={setRecordEnabled}
                onSetChallenge={setChallengeMode}
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
              <ImpromptuReview
                topic={topic}
                duration={duration}
                liveTranscript={liveTranscript}
                wpm={wpm}
                totalWords={totalWords}
                fillerCount={fillerCount}
                fillerTimes={fillerTimes}
                elapsedSecs={elapsedSecs}
                coachReport={coachReport}
                loadingCoach={loadingCoach}
                stats={stats}
                recordingBlobUrl={recordingBlobUrl}
                curveballText={curveballText}
                drillMode={drillMode}
                onGoAgain={goAgain}
                onNewTopic={() => newTopic()}
                onDrillCurveball={drillCurveball}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {recorderPanel}

        {autoFeedbackId && (
          <RecordingFeedbackModal
            recordingId={autoFeedbackId}
            defaultOpen={true}
            onClose={clearAutoFeedback}
          />
        )}
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
                    challengeMode={challengeMode}
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
