import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Zap, Sparkles, Loader2, Radar, Target, Mic, MicOff, AlertTriangle, X, ChevronDown, ChevronUp
} from "lucide-react";
import { type Duel, type Gamemode, GAMEMODES, getRankColor, getRankFromElo } from "@/hooks/useArena";
import { FORFEIT_PENALTY } from "@/hooks/arenaUtils";
import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/hooks/useRecordings";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { toast } from "@/hooks/use-toast";
import { RecorderPanel } from "@/components/RecorderPanel";
import { MicrophoneBorder } from "@/components/MicrophoneBorder";
import { SpamButton } from "@/components/SpamButton";
import { setRecordingActive } from "@/lib/recordingState";
import { transcribeAudio, judgeBattle, generateAIArgument, generateArenaPrompt, speakWithDeepgramTTS } from "@/services/geminiService";
import { ModelSpeech } from "@/components/ModelSpeech";
import { arenaEmitter, type ArenaEvents } from "@/lib/events";
import { setTimerActive } from "@/lib/timerState";

// Filler list mirrors FILLER_WORDS in useImpromptuSession (inlined to keep this
// component self-contained). Used to feed delivery signals into the judge.
const FILLER_WORDS = ["um", "uh", "like", "you know", "so", "basically", "right", "actually", "literally", "kind of", "sort of"];
const countFillers = (text: string): number => {
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce(
    (n, w) => n + (lower.match(new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "g"))?.length ?? 0),
    0
  );
};

// Stable Deepgram Aura voice per opponent name, so an opponent always "sounds"
// the same when you play back their speech.
const ARENA_VOICES = ["aura-orion-en", "aura-luna-en", "aura-stella-en", "aura-athena-en", "aura-zeus-en", "aura-asteria-en", "aura-arcas-en"];
const voiceForName = (name?: string): string => {
  if (!name) return ARENA_VOICES[0];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return ARENA_VOICES[hash % ARENA_VOICES.length];
};

export const DuelDrill = ({
  duel, gamemode, onClose, onComplete, isCreating, sendReadyStatus, completeDuel, broadcastBattleResult, sendTranscript, broadcastAnalyzing, sendForfeit, handleForfeit, userElo
}: {
  duel: Duel | null;
  gamemode?: Gamemode;
  onClose: () => void;
  onComplete: (score: number, prompt: string, mode: Gamemode, feedback: string) => void;
  isCreating: boolean;
  userElo: number;
  sendReadyStatus: (duelId: string, isReady: boolean) => void;
  sendForfeit: (duelId: string) => void;
  handleForfeit: (duelId: string, isMe: boolean, duelObj: Duel) => void;
  completeDuel: (duelId: string, challengerName: string, creatorScore: number, challengerScore: number, feedback: string, duelObj: Duel, explicitWinner?: string, details?: { strengths?: string, oppStrengths?: string, oppFeedback?: string, exampleSpeech?: string }) => void;
  broadcastBattleResult: (duelId: string, results: any) => void;
  sendTranscript: (duelId: string, transcript: string) => void;
  broadcastAnalyzing: (duelId: string) => void;
}) => {
  const { user } = useAuth();
  const { upload, refresh } = useRecordings("arena");
  const sfx = useSoundEffects();
  const mode = duel ? duel.gamemode : (gamemode || "standard");
  const duration = GAMEMODES[mode].duration;

  const [finished, setFinished] = useState(() => sessionStorage.getItem("arena_finished") === "true");
  const [running, setRunning] = useState(() => sessionStorage.getItem("arena_running") === "true");
  const [seconds, setSeconds] = useState(() => {
    const saved = sessionStorage.getItem("arena_seconds");
    const startTime = sessionStorage.getItem("arena_start_time");
    if (saved && startTime && sessionStorage.getItem("arena_running") === "true") {
      const elapsed = (Date.now() - parseInt(startTime)) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      return Math.floor(remaining);
    }
    return saved ? parseInt(saved) : duration;
  });
  const [recordEnabled, setRecordEnabled] = useState(true);
  const idRef = useRef<number | null>(null);
  const recorderStartRef = useRef<() => void>();
  const recorderStopRef = useRef<() => void>();
  const wasRecording = useRef(false);
  const hasFiredCount = useRef(sessionStorage.getItem("arena_has_fired_count") === "true");

  const [customPrompt, setCustomPrompt] = useState("");
  const [debateStand, setDebateStand] = useState<"FOR" | "AGAINST">("FOR");
  const promptToUse = duel ? duel.prompt : customPrompt;
  const [lastRecording, setLastRecording] = useState<{ blob: Blob; durationMs: number } | null>(null);

  // Reveal + voice the opponent's actual speech on the results screen — gives
  // the AI (or peer) you "battled" real presence instead of an invisible score.
  const [showOppSpeech, setShowOppSpeech] = useState(false);
  const [oppTtsLoading, setOppTtsLoading] = useState(false);
  const [oppTtsPlaying, setOppTtsPlaying] = useState(false);
  const oppAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { oppAudioRef.current?.pause(); }, []);
  const toggleOppTts = async () => {
    const text = oppTranscriptRef.current;
    if (!text || text === "[NO_TRANSCRIPT_RECEIVED]") return;
    if (oppAudioRef.current) {
      if (!oppAudioRef.current.paused) { oppAudioRef.current.pause(); setOppTtsPlaying(false); }
      else { oppAudioRef.current.play().catch(() => {}); setOppTtsPlaying(true); }
      return;
    }
    setOppTtsLoading(true);
    try {
      const audio = await speakWithDeepgramTTS(text, voiceForName(opponent?.name));
      audio.onended = () => setOppTtsPlaying(false);
      oppAudioRef.current = audio;
      audio.play().catch(() => {});
      setOppTtsPlaying(true);
    } catch {
      toast({ title: "Voice unavailable", description: "Couldn't play your opponent's speech right now." });
    } finally {
      setOppTtsLoading(false);
    }
  };

  const opponent = duel?.creator.id === user?.id
    ? duel?.challenger
    : duel?.creator || (isCreating ? { name: "AI Debater", avatar: "🤖", rank: { name: "Adaptive", tier: "AI" } } : null);

  const [phase, setPhase] = useState<"drilling" | "analyzing" | "results">("drilling");
  const [verdictResult, setVerdictResult] = useState<{ score: number, oppScore?: number, feedback: string, won: boolean, tie?: boolean, strengths: string, oppStrengths: string, exampleSpeech?: string, byForfeit?: boolean } | null>(null);
  // Once a forfeit verdict is shown, ignore late AI-result broadcasts so the
  // victory-by-forfeit screen isn't overwritten by a losing score.
  const forfeitedRef = useRef(false);
  const [analyzeText, setAnalyzeText] = useState("EXTRACTING AUDIO...");
  const [preCount, setPreCount] = useState<number | null>(null);

  const [readyTimer, setReadyTimer] = useState(15);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const [oppTranscript, setOppTranscript] = useState<string | null>(null);
  const oppTranscriptRef = useRef<string | null>(null);
  const [aiArgument, setAiArgument] = useState<string>("");
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [searching, setSearching] = useState(false);
  const isClosingRef = useRef(false);

  const [draftingDone, setDraftingDone] = useState(() => {
    if (!isCreating) return true;
    return sessionStorage.getItem("arena_drafting_done") === "true";
  });
  const [userReady, setUserReady] = useState(() => sessionStorage.getItem("arena_user_ready") === "true");
  const [opponentReady, setOpponentReady] = useState(() => sessionStorage.getItem("arena_opponent_ready") === "true");

  // Sound: win / loss when verdict arrives
  useEffect(() => {
    if (!verdictResult) return;
    if (verdictResult.score === 0 && verdictResult.oppScore === 0) return;
    if (verdictResult.won) sfx.win(); else sfx.loss();
  }, [verdictResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Session persistence
  useEffect(() => {
    if (isClosingRef.current) return;
    if (isCreating || duel) {
      if (isCreating) sessionStorage.setItem("arena_is_creating", "true");
      sessionStorage.setItem("arena_drafting_done", draftingDone.toString());
      sessionStorage.setItem("arena_user_ready", userReady.toString());
      sessionStorage.setItem("arena_opponent_ready", opponentReady.toString());
      sessionStorage.setItem("arena_running", running.toString());
      sessionStorage.setItem("arena_finished", finished.toString());
      sessionStorage.setItem("arena_seconds", seconds.toString());
      if (running && !sessionStorage.getItem("arena_start_time")) {
        sessionStorage.setItem("arena_start_time", (Date.now() - (duration - seconds) * 1000).toString());
      }
    }
  }, [isCreating, duel, draftingDone, userReady, opponentReady, running, finished, seconds, duration]);

  // Listen for authoritative result, transcript, analyzing and forfeit from peer
  useEffect(() => {
    const handleResult = ({ duelId, score, feedback, oppFeedback, strengths, won, tie, oppScore, oppStrengths, exampleSpeech }: ArenaEvents["arena:battle-result"]) => {
      if (forfeitedRef.current) return; // forfeit verdict wins — ignore late judge results
      if (duel && duel.id === duelId && !isCreating) {
        const isHost = duel.creator.id === user?.id;
        if (!isHost) {
          setVerdictResult({
            score: isHost ? score : (oppScore || 0),
            feedback: isHost ? feedback : (oppFeedback || feedback),
            // Mirror the host's outcome: a tie is symmetric for both players,
            // otherwise the non-host's result is the inverse of the host's.
            won: tie ? false : (isHost ? !!won : !won),
            tie: !!tie,
            strengths: isHost ? strengths : (oppStrengths || "N/A"),
            oppStrengths: isHost ? (oppStrengths || "N/A") : strengths,
            oppScore: isHost ? oppScore : score,
            exampleSpeech,
          });
          setPhase("results");
        }
      }
    };

    const handleTranscript = ({ duelId, userId, transcript }: ArenaEvents["arena:battle-transcript"]) => {
      if (duel && duel.id === duelId && userId !== user?.id) {
        setOppTranscript(transcript);
        oppTranscriptRef.current = transcript;
      }
    };

    const handleAnalyzing = ({ duelId }: ArenaEvents["arena:battle-analyzing"]) => {
      if (forfeitedRef.current) return; // never re-enter analyzing after a forfeit
      if (duel && duelId === duel.id && phase !== "analyzing") {
        setPhase("analyzing");
        setAnalyzeText("THE AI IS JUDGING...");
      }
    };

    const handleOpponentForfeit = ({ duelId, userId }: ArenaEvents["arena:battle-forfeit"]) => {
      if (duel && duelId === duel.id && userId !== user?.id) {
        forfeitedRef.current = true;
        handleForfeit(duel.id, false, duel);
        toast({ title: "Opponent Forfeited", description: "You win by default! (+ELO awarded)", variant: "default" });
        // Show a victory-by-forfeit verdict screen instead of closing
        setVerdictResult({
          score: 0,
          oppScore: 0,
          feedback: `${opponent?.name ?? "Your opponent"} forfeited the match. You win by default.`,
          won: true,
          strengths: "Victory by forfeit",
          oppStrengths: "—",
          byForfeit: true,
        });
        setPhase("results");
      }
    };

    arenaEmitter.on("arena:battle-result", handleResult);
    arenaEmitter.on("arena:battle-analyzing", handleAnalyzing);
    arenaEmitter.on("arena:battle-transcript", handleTranscript);
    arenaEmitter.on("arena:battle-forfeit", handleOpponentForfeit);
    return () => {
      arenaEmitter.off("arena:battle-result", handleResult);
      arenaEmitter.off("arena:battle-analyzing", handleAnalyzing);
      arenaEmitter.off("arena:battle-transcript", handleTranscript);
      arenaEmitter.off("arena:battle-forfeit", handleOpponentForfeit);
    };
  }, [duel, isCreating, user?.id, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync ready status from opponent
  useEffect(() => {
    const handleReady = ({ duelId, userId, isReady }: ArenaEvents["arena:ready-status"]) => {
      if (duelId === duel?.id && userId !== user?.id) {
        setOpponentReady(isReady);
      }
    };
    arenaEmitter.on("arena:ready-status", handleReady);
    return () => arenaEmitter.off("arena:ready-status", handleReady);
  }, [duel?.id, user?.id]);

  const [micError, setMicError] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => { setMicError(false); stream.getTracks().forEach(t => t.stop()); })
      .catch(() => setMicError(true));
  }, []);

  useEffect(() => {
    const isActuallyRecording = running && !finished;
    setRecordingActive(isActuallyRecording);
    return () => setRecordingActive(false);
  }, [running, finished]);

  // Lock the global UI while a battle is in progress: hides the MobileNav and
  // any other layout that watches `timerActive`, so they can't poke through the
  // backdrop on mobile.
  useEffect(() => {
    setTimerActive(true);
    return () => setTimerActive(false);
  }, []);

  useEffect(() => {
    if (userReady && !opponentReady) {
      const isAI = opponent?.name.includes("(AI)") || isCreating;
      const delay = isAI ? 500 : 4000;
      const timer = setTimeout(() => setOpponentReady(true), delay);
      return () => clearTimeout(timer);
    }
  }, [userReady, opponentReady, opponent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ready-up countdown
  useEffect(() => {
    if (phase !== "drilling" || (userReady && opponentReady)) return;
    if (readyTimer <= 0) {
      toast({ title: "Session Timed Out", description: "Players did not ready up in time.", variant: "destructive" });
      onClose();
      return;
    }
    const timer = setInterval(() => setReadyTimer(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [readyTimer, userReady, opponentReady, phase, onClose, isCreating, duel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAIOpponent = duel?.id.startsWith("ai-") || isCreating;

  useEffect(() => {
    if (userReady && opponentReady && isAIOpponent && phase === "drilling"
      && !hasFiredCount.current && !running && !finished) {
      hasFiredCount.current = true;
      sessionStorage.setItem("arena_has_fired_count", "true");
      setPreCount(5);
    }
  }, [userReady, opponentReady, isAIOpponent, phase, running, finished]);

  useEffect(() => {
    if (preCount === 0 && phase === "drilling" && isAIOpponent) {
      sfx.matchStart();
      setPreCount(null);
      setRunning(true);
      generateAIArgument(promptToUse, duration, gamemode || "standard", opponent?.persona).then(arg => {
        oppTranscriptRef.current = arg;
        setOppTranscript(arg);
      }).catch(e => console.error("Silent AI gen failed:", e));
    }
  }, [preCount, phase, isAIOpponent, gamemode, promptToUse, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userReady && opponentReady && preCount === null && !running && !finished && !hasFiredCount.current && seconds === duration) {
      hasFiredCount.current = true;
      sessionStorage.setItem("arena_has_fired_count", "true");
      setPreCount(5);
    }
  }, [userReady, opponentReady, preCount, running, finished, seconds, duration]);

  useEffect(() => {
    if (preCount === null) return;
    if (preCount === 0) {
      sfx.matchStart();
      setPreCount(null);
      setRunning(true);
      return;
    }
    if (preCount <= 3) sfx.countdownTick(preCount);
    const timer = setTimeout(() => setPreCount(preCount - 1), 1000);
    return () => clearTimeout(timer);
  }, [preCount, isAIOpponent, gamemode]); // eslint-disable-line react-hooks/exhaustive-deps

  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const generateVerdict = async () => {
    if (!lastRecording) {
      toast({ title: "No recording found", description: "The session is invalid without audio.", variant: "destructive" });
      onClose();
      return;
    }

    setPhase("analyzing");

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("JUDGE_TIMEOUT")), 25000)
    );

    try {
      setAnalyzeText("TRANSCRIBING AUDIO...");

      const myTranscript = await Promise.race([transcribeAudio(lastRecording.blob), timeoutPromise]) as string;

      if (!myTranscript || myTranscript.trim().length < 5) {
        setVerdictResult({
          score: 0, oppScore: 0,
          feedback: "We couldn't hear you clearly. The recording seems to be empty or contained only background noise.",
          won: false, strengths: "N/A", oppStrengths: "N/A",
          exampleSpeech: "Ensure your microphone is active and you speak directly into it. Try to maintain a steady pace and clear articulation."
        });
        setPhase("results");
        return;
      }

      const isHost = !duel || duel.creator.id === user?.id;

      if (!isHost && duel) {
        sendTranscript(duel.id, myTranscript);
        setAnalyzeText("WAITING FOR AI RESULTS...");
        setTimeout(() => {
          // Read the live phase via the ref — the closure's `phase` is frozen at
          // "drilling" (generateVerdict is only invoked from that phase), so the
          // old `phase === "analyzing"` check was always false and this safety
          // net never fired, leaving a peer stuck forever when the host died.
          if (phaseRef.current === "analyzing") {
            toast({ title: "Sync Error", description: "Host did not return results in time.", variant: "destructive" });
            onClose();
          }
        }, 15000);
        return;
      }

      if (isHost && duel) broadcastAnalyzing(duel.id);

      let finalOppTranscript = oppTranscriptRef.current;
      if (duel && !finalOppTranscript) {
        setAnalyzeText("WAITING FOR OPPONENT...");
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 500));
          if (oppTranscriptRef.current) { finalOppTranscript = oppTranscriptRef.current; break; }
        }
        if (!oppTranscriptRef.current) finalOppTranscript = "[NO_TRANSCRIPT_RECEIVED]";
      }

      setAnalyzeText("AI IS REVIEWING...");

      const hostName = duel?.creator.name || user?.email?.split("@")[0] || "Host";
      const challengerName = duel?.challenger?.name || "Opponent";

      // Measure the user's delivery from the real audio so the judge weighs HOW
      // they spoke (pace + fillers), not just the words.
      const myWords = myTranscript.split(/\s+/).filter(Boolean).length;
      const recSecs = lastRecording?.durationMs ? lastRecording.durationMs / 1000 : duration;
      const hostWpm = recSecs > 3 ? Math.round((myWords / recSecs) * 60) : 0;
      const hostFillers = countFillers(myTranscript);

      const judgeResult = await Promise.race([
        judgeBattle(hostName, myTranscript, promptToUse, challengerName, finalOppTranscript || undefined, { hostWpm, hostFillers }),
        timeoutPromise
      ]) as any;

      const userName = user?.email?.split("@")[0] || "User";

      // Single source of truth for the outcome: the higher of the two displayed
      // scores. The AI judge returns score, oppScore AND a free-text `winner`
      // independently, so they can contradict each other — deriving the result
      // from the numbers the user actually sees keeps the banner, the scores, and
      // the ELO write in lock-step. Fall back to the judge's own call only when a
      // score is missing entirely.
      const myS: number = judgeResult.score;
      const oppS: number = judgeResult.oppScore || 0;
      const haveBothScores = typeof judgeResult.score === "number" && typeof judgeResult.oppScore === "number";
      const derivedWinner: "you" | "opponent" | "tie" = haveBothScores
        ? (myS > oppS ? "you" : oppS > myS ? "opponent" : "tie")
        : ((judgeResult.winner as "you" | "opponent" | "tie") ?? "opponent");

      const finalVerdict = {
        score: judgeResult.score,
        oppScore: judgeResult.oppScore || 0,
        feedback: judgeResult.feedback,
        oppFeedback: judgeResult.oppFeedback || judgeResult.feedback,
        won: derivedWinner === "you",
        tie: derivedWinner === "tie",
        strengths: judgeResult.strengths,
        oppStrengths: judgeResult.oppStrengths || "N/A",
        exampleSpeech: judgeResult.exampleSpeech
      };

      setVerdictResult(finalVerdict);

      const syntheticDuel: Duel = duel || {
        id: `custom-${Date.now()}`,
        prompt: promptToUse,
        gamemode: mode || "standard",
        creator: {
          id: user?.id,
          name: userName,
          avatar: "👤",
          elo: userElo,
          rank: getRankFromElo(userElo),
          score: judgeResult.score
        },
        challenger: {
          id: "ai",
          name: opponent?.name || "AI Debater",
          avatar: opponent?.avatar || "🤖",
          elo: 0,
          rank: { name: "Adaptive", tier: "AI" },
          score: judgeResult.oppScore || 0
        },
        status: "active" as any,
        winner: derivedWinner,
        feedback: judgeResult.feedback,
        timestamp: Date.now()
      };

      if (duel) broadcastBattleResult(duel.id, finalVerdict);

      completeDuel(syntheticDuel.id, userName, judgeResult.score, judgeResult.oppScore || 0, judgeResult.feedback, syntheticDuel, derivedWinner, {
        strengths: judgeResult.strengths,
        oppStrengths: judgeResult.oppStrengths,
        oppFeedback: judgeResult.oppFeedback,
        exampleSpeech: judgeResult.exampleSpeech
      });

      setPhase("results");
    } catch (err: any) {
      const isTimeout = err.message === "JUDGE_TIMEOUT";
      toast({
        title: isTimeout ? "AI Timed Out" : "Invalid Attempt",
        description: isTimeout ? "The AI took too long to analyze. Returning to lobby." : "Analysis failed or sync lost. Returning to lobby.",
        variant: "destructive"
      });
      onClose();
    }
  };

  useEffect(() => {
    if (finished && lastRecording && phase === "drilling") generateVerdict();
  }, [finished, lastRecording, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running || finished) {
      startTimeRef.current = null;
      if (idRef.current) clearInterval(idRef.current);
      return;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now() - ((duration - seconds) * 1000);
    }

    idRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setSeconds(remaining);
      if (remaining <= 0) {
        setRunning(false);
        setFinished(true);
        if (recordEnabled) {
          setTimeout(() => { recorderStopRef.current?.(); wasRecording.current = false; refresh(); }, 100);
        }
      }
    }, 100);

    return () => { if (idRef.current) clearInterval(idRef.current); };
  }, [running, finished, recordEnabled, refresh, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!recordEnabled) return;
    if (running && !wasRecording.current) { recorderStartRef.current?.(); wasRecording.current = true; }
    else if (!running && wasRecording.current && finished) {
      setTimeout(() => { recorderStopRef.current?.(); wasRecording.current = false; }, 50);
    }
  }, [running, recordEnabled, finished]);

  const pct = (seconds / duration) * 100;

  if (searching) {
    return (
      <motion.div
        id="tutorial-matchmaking-radar"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center"
      >
        <Radar className="h-24 w-24 text-primary animate-spin-slow opacity-50 mb-8" />
        <h2 className="speak-serif text-4xl italic tracking-tighter animate-pulse">Syncing AI Brain...</h2>
        <p className="text-sm font-black uppercase tracking-[0.5em] text-primary mt-4">SEEKING WORTHY ADVERSARY</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      id="tutorial-arena-battle-view"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      // Solid bg (no `glass` translucency) + dynamic viewport height so iOS
      // Safari URL-bar collapse doesn't reveal the page underneath.
      // Safe-area bottom padding keeps content above the iOS home indicator.
      // z-[180] (Z.duelActive) forces the duel screen above chat panels,
      // confirmation modals, and toasts the moment a battle is accepted.
      className="fixed inset-0 z-[180] bg-background overflow-y-auto overflow-x-hidden scrollbar-hide text-foreground flex flex-col"
      style={{
        minHeight: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {preCount === null && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted z-20">
          <motion.div
            className="h-full bg-primary shadow-[0_0_20px_rgba(var(--primary),0.8)]"
            initial={{ width: "100%" }}
            animate={{ width: `${pct}%` }}
          />
        </div>
      )}

      {opponent && phase === "drilling" && (!isCreating || draftingDone) && (
        <div className="w-full bg-muted/40 border-b border-border backdrop-blur-md p-4 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-2xl border border-border">
              {opponent.avatar}
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest opacity-40">VERSUS</p>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">{opponent.name}</p>
                  <span className={cn("text-[11px] font-black uppercase px-2 py-0.5 rounded border", getRankColor(opponent.rank))}>
                    {opponent.rank.name} {opponent.rank.tier}
                  </span>
                </div>
                {opponent.persona && (
                  <p className="text-[10px] text-primary/60 font-medium italic mt-0.5">Strengths: {opponent.persona.strengths}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        // pt-16 on mobile reserves space for the absolute "LEAVE BATTLE" button
        // so the timer never collides with it. justify-start on mobile prevents
        // tall content (timer + prompt + recorder + RecorderPanel) from being
        // vertically centred and then clipped off-screen.
        "px-4 md:container max-w-4xl mx-auto pt-16 pb-10 md:py-16 relative z-10 flex-grow flex flex-col justify-start",
        phase === "results" ? "md:justify-start" : "md:justify-center"
      )}>
        <div className="absolute top-8 left-4 md:left-0 flex items-center gap-6">
          <SpamButton
            onClick={() => {
              if (finished || phase === "results") onClose();
              else setShowAbandonConfirm(true);
            }}
            className="flex items-center gap-3 text-sm font-black uppercase tracking-wide text-foreground/40 hover:text-primary transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> LEAVE BATTLE
          </SpamButton>
          {(running || micError) && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className={cn(
                "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] py-1 px-3 rounded-full border transition-all",
                micError ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"
              )}>
                {micError ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3 animate-pulse" />}
                {micError ? "MIC ERROR" : "MIC ACTIVE"}
              </div>
            </>
          )}
        </div>

        {phase === "drilling" && (
          <>
            <div className="text-center mb-12">
              <div className="flex flex-col items-center gap-3 mb-4 md:mb-6">
                <div className="inline-flex items-center gap-2 md:gap-3 text-[10px] md:text-sm font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-primary bg-primary/10 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-primary/20">
                  <Zap className="h-3 w-3 md:h-4 md:h-4 animate-pulse" />
                  {GAMEMODES[mode].label}
                  {running && micError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest border bg-red-500/10 border-red-500 text-red-500"
                    >
                      <MicOff className="h-3 w-3" />
                      MIC OFF — CANNOT RECORD
                    </motion.div>
                  )}
                </div>
              </div>

              <div className={cn(
                "speak-serif text-6xl sm:text-7xl md:text-9xl font-bold tracking-tighter tabular-nums mx-auto transition-all duration-500",
                seconds <= 5 ? "text-primary scale-110 drop-shadow-[0_0_30px_rgba(var(--primary),0.8)]" : "text-foreground"
              )}>
                {seconds}<span className="text-2xl md:text-3xl opacity-30 ml-1 md:ml-2">s</span>
              </div>
            </div>

            <div className="bg-muted/30 border border-border rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-12 relative overflow-hidden mb-8 md:mb-12 shadow-sm">
              <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-primary mb-4 md:mb-6 flex items-center gap-2">
                <Target className="h-3 w-3 md:h-4 md:h-4" /> YOUR TOPIC
              </p>
              {isCreating && !draftingDone ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black opacity-30 tracking-widest uppercase">Draft your challenge prompt or</p>
                    <button
                      onClick={async () => {
                        setGeneratingPrompt(true);
                        try {
                          const p = await generateArenaPrompt(mode);
                          setCustomPrompt(p);
                        } catch (e) {
                          console.error("[DuelDrill] generateArenaPrompt failed:", e);
                          toast({ title: "AI unavailable", description: "All providers are down. Type your own prompt or try again.", variant: "destructive" });
                        } finally {
                          setGeneratingPrompt(false);
                        }
                      }}
                      disabled={generatingPrompt}
                      className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all border border-primary/20"
                    >
                      {generatingPrompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {generatingPrompt ? "GENERATING..." : "GENERATE PROMPT"}
                    </button>
                  </div>
                  <textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="Type here or use the generator..."
                    className="w-full bg-transparent border-b border-primary/30 focus:border-primary outline-none speak-serif text-xl md:text-3xl italic tracking-tight leading-relaxed resize-none h-32 transition-colors"
                  />
                  {mode === "debate" && (
                    <div className="flex items-center gap-4 mt-4 mb-2">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">YOUR STAND:</p>
                      <div className="flex bg-muted/50 rounded-full p-1 border border-border">
                        <button
                          onClick={() => setDebateStand("FOR")}
                          className={cn("px-4 py-1.5 rounded-full text-xs font-black tracking-widest transition-all", debateStand === "FOR" ? "bg-primary text-white" : "text-primary/50 hover:text-primary")}
                        >
                          FOR
                        </button>
                        <button
                          onClick={() => setDebateStand("AGAINST")}
                          className={cn("px-4 py-1.5 rounded-full text-xs font-black tracking-widest transition-all", debateStand === "AGAINST" ? "bg-red-500 text-white shadow-glow" : "text-red-500/50 hover:text-red-500")}
                        >
                          AGAINST
                        </button>
                      </div>
                    </div>
                  )}
                  <SpamButton
                    disabled={!customPrompt.trim()}
                    onClick={() => {
                      if (mode === "debate") {
                        setCustomPrompt(prev => `${prev}\n\n(You are arguing ${debateStand} this topic. Your opponent is arguing ${debateStand === "FOR" ? "AGAINST" : "FOR"}.)`);
                      }
                      setSearching(true);
                      setTimeout(() => { setSearching(false); setDraftingDone(true); }, 2500);
                    }}
                    className="button-pill w-full py-4 bg-primary text-white shadow-glow group flex items-center justify-center gap-4 mt-4"
                  >
                    <span className="text-sm font-black uppercase tracking-wide">FIND MATCH</span>
                    <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                  </SpamButton>
                </div>
              ) : (
                <p className="speak-serif text-xl sm:text-2xl md:text-4xl italic tracking-tight leading-relaxed text-center">"{promptToUse}"</p>
              )}
            </div>

            <div className="max-w-md mx-auto w-full">
              {!finished ? (
                !userReady && (!isCreating || draftingDone) ? (
                  <SpamButton
                    disabled={isCreating && !customPrompt.trim()}
                    onClick={() => {
                      setUserReady(true);
                      if (duel) sendReadyStatus(duel.id, true);
                    }}
                    className="button-pill w-full py-6 bg-primary text-white shadow-glow group flex items-center justify-center gap-4"
                  >
                    <span className="text-sm font-black uppercase tracking-wide">READY UP ({readyTimer}s)</span>
                    <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                  </SpamButton>
                ) : opponent && (!isCreating || draftingDone) ? (
                  <div className="bg-muted/50 border border-border rounded-2xl p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center text-sm border border-border">👤</div>
                        <span className="text-sm font-black uppercase tracking-widest opacity-60">YOU</span>
                      </div>
                      <span className="text-sm font-black uppercase tracking-[0.4em] text-green-500 animate-pulse">READY</span>
                    </div>
                    <div className="h-px bg-border w-full opacity-50" />
                    <div className="flex justify-between items-center px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center text-sm border border-border">{opponent?.avatar || "👤"}</div>
                        <span className="text-sm font-black uppercase tracking-widest opacity-60">{opponent?.name || "OPPONENT"}</span>
                      </div>
                      <span className={cn("text-sm font-black uppercase tracking-[0.4em]", opponentReady ? "text-green-500 animate-pulse" : "text-primary animate-pulse opacity-50")}>
                        {opponentReady ? "READY" : "WAITING..."}
                      </span>
                    </div>
                  </div>
                ) : null
              ) : (
                <div className="bg-muted/50 border border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-4">
                  <Radar className="h-12 w-12 text-primary animate-spin-slow opacity-20" />
                  <p className="text-sm font-black uppercase tracking-[0.4em] text-primary/40 animate-pulse">GETTING RESULTS...</p>
                </div>
              )}
            </div>
          </>
        )}

        {preCount !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 backdrop-blur-xl"
          >
            <div className="relative">
              <motion.div
                key={preCount}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-center"
              >
                <p className="text-[10px] md:text-sm font-black uppercase tracking-[1em] md:tracking-[1.5em] text-primary/40 mb-8 md:mb-12 translate-x-[0.5em] md:translate-x-[0.75em]">GET READY</p>
                <div className="relative inline-block">
                  <h2 className="speak-serif text-[8rem] sm:text-[14rem] md:text-[24rem] font-bold italic leading-none text-primary drop-shadow-[0_0_50px_rgba(var(--primary),0.5)]">
                    {preCount === 0 ? "GO!" : preCount}
                  </h2>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1, ease: "linear" }}
                    className="absolute -bottom-2 md:-bottom-4 left-0 h-1 md:h-2 bg-primary shadow-[0_0_20px_rgba(var(--primary),0.8)]"
                  />
                </div>
              </motion.div>
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.15)_0%,transparent_70%)] animate-pulse" />
            </div>
          </motion.div>
        )}

        {phase === "analyzing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[80] flex flex-col items-center justify-center py-10 md:py-20 px-4 bg-background/50 backdrop-blur-sm">
            <div className="relative mb-6 md:mb-8">
              <Radar className="h-16 w-16 md:h-24 md:w-24 text-primary animate-spin-slow opacity-50" />
              <Sparkles className="h-6 w-6 md:h-8 md:h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping" />
            </div>
            <h2 className="speak-serif text-2xl md:text-4xl italic tracking-tighter animate-pulse mb-3 md:mb-4 text-center">AI is Judging...</h2>
            <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-primary text-center">{analyzeText}</p>
          </motion.div>
        )}

        {phase === "results" && verdictResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto bg-muted/20 border border-border rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            <div className="text-center mb-12 relative z-10">
              <h2 className={cn("text-sm font-black uppercase tracking-[0.3em] md:tracking-[1em] mb-4 break-words leading-tight px-2",
                verdictResult.byForfeit ? "text-green-500" :
                (verdictResult.tie || (verdictResult.score === 0 && (verdictResult.oppScore || 0) === 0)) ? "text-yellow-500" :
                verdictResult.won ? "text-green-500" : "text-red-500")}>
                {verdictResult.byForfeit ? "VICTORY BY FORFEIT" :
                  (verdictResult.tie || (verdictResult.score === 0 && (verdictResult.oppScore || 0) === 0)) ? "TIE" :
                  verdictResult.won ? "YOU WON" : "YOU LOST"}
              </h2>
              {verdictResult.byForfeit ? (
                <p className="text-base md:text-lg opacity-70 mt-2">
                  <span className="text-primary font-bold">{opponent?.name ?? "Opponent"}</span> forfeited the match.
                </p>
              ) : (
                <div className="flex justify-center items-center gap-8">
                  <div className="text-center">
                    <p className="text-sm opacity-40 uppercase tracking-widest font-black mb-2">YOU</p>
                    <p className={cn("speak-serif text-6xl md:text-7xl italic", verdictResult.won ? "text-foreground font-black" : "opacity-40")}>{verdictResult.score}</p>
                  </div>
                  {opponent && verdictResult.oppScore !== undefined && (
                    <>
                      <span className="text-sm opacity-20 uppercase tracking-widest font-black">VS</span>
                      <div className="text-center">
                        <p className="text-sm opacity-40 uppercase tracking-widest font-black mb-2">THEM</p>
                        <p className={cn("speak-serif text-6xl md:text-7xl italic", (!verdictResult.won && !verdictResult.tie) ? "text-foreground font-black" : "opacity-40")}>{verdictResult.oppScore}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6 relative z-10">
              <div className="bg-background/50 border border-border rounded-2xl p-6">
                <p className="text-sm font-black uppercase tracking-[0.4em] text-primary mb-3">AI VERDICT</p>
                <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap break-words">{verdictResult.feedback}</p>
              </div>

              {verdictResult.exampleSpeech && (
                <ModelSpeech text={verdictResult.exampleSpeech} />
              )}

              {/* Opponent reveal — see (and hear) what you actually battled */}
              {oppTranscript && oppTranscript.trim() && oppTranscript !== "[NO_TRANSCRIPT_RECEIVED]" && !verdictResult.byForfeit && (
                <div className="bg-background/40 border border-border rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 gap-3">
                    <button
                      onClick={() => setShowOppSpeech(!showOppSpeech)}
                      className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-500 truncate">
                        What {opponent?.name ?? "your opponent"} said
                      </p>
                      {showOppSpeech ? <ChevronUp className="h-4 w-4 text-orange-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-orange-500 shrink-0" />}
                    </button>
                    <button
                      onClick={toggleOppTts}
                      disabled={oppTtsLoading}
                      className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/10 transition-all disabled:opacity-50"
                    >
                      {oppTtsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic className="h-3 w-3" />}
                      {oppTtsLoading ? "Loading" : oppTtsPlaying ? "Stop" : "Hear it"}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showOppSpeech && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 pb-6"
                      >
                        <p className="speak-serif text-base italic leading-relaxed opacity-70 whitespace-pre-wrap break-words">"{oppTranscript}"</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-background/30 border border-border rounded-xl p-3 md:p-4 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-green-500 mb-2 break-words">YOUR STRENGTHS</p>
                  <div className="space-y-1">
                    {(typeof verdictResult.strengths === 'string'
                      ? verdictResult.strengths.split(',')
                      : (Array.isArray(verdictResult.strengths) ? verdictResult.strengths : [])
                    ).filter(s => s && String(s).trim()).map((s, i) => (
                      <p key={i} className="text-[11px] opacity-70 leading-tight flex gap-2 break-words min-w-0">
                        <span className="text-green-500 shrink-0">•</span> {String(s).trim()}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="bg-background/30 border border-border rounded-xl p-3 md:p-4 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-500 mb-2 break-words">OPPONENT NOTE</p>
                  <div className="space-y-1">
                    {verdictResult.oppStrengths.split(',').filter(s => s.trim()).map((s, i) => (
                      <p key={i} className="text-[11px] opacity-70 leading-tight flex gap-2 break-words min-w-0">
                        <span className="text-orange-500 shrink-0">•</span> {s.trim()}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <SpamButton
              onClick={() => onComplete(verdictResult.score, promptToUse, mode, verdictResult.feedback)}
              className="w-full mt-8 py-5 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-glow"
            >
              RETURN TO ARENA
            </SpamButton>
          </motion.div>
        )}

        {user && (
          <div className="opacity-0 pointer-events-none absolute">
            <RecorderPanel
              externalRunning={running}
              recorderStartRef={fn => { recorderStartRef.current = fn; }}
              recorderStopRef={fn => { recorderStopRef.current = fn; }}
              onRecorded={async (rec) => {
                setLastRecording(rec);
                if (user) {
                  await upload(rec.blob, {
                    promptText: `Arena Battle: ${promptToUse}`,
                    difficulty: "Arena",
                    durationMs: rec.durationMs,
                    targetSeconds: duration
                  });
                  refresh();
                }
              }}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAbandonConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-muted border border-border rounded-[2rem] p-8 md:p-12 max-w-md w-full text-center space-y-8 shadow-2xl"
            >
              <div className="h-20 w-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <div className="space-y-4">
                <h3 className="speak-serif text-3xl italic">Abandon Battle?</h3>
                <p className="text-sm font-medium opacity-40 leading-relaxed">
                  Leaving now will result in an automatic forfeit and a <span className="text-red-500 font-bold">-{FORFEIT_PENALTY} ELO penalty</span>.
                  Are you sure you want to concede?
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <SpamButton
                  onClick={() => {
                    isClosingRef.current = true;
                    if (duel) {
                      sendForfeit(duel.id);
                      handleForfeit(duel.id, true, duel);
                    } else if (isCreating) {
                      handleForfeit(`ai-forfeit-${Date.now()}`, true, {
                        creator: { id: user?.id, elo: 0, rank: { name: "Bronze", tier: "I" } },
                        challenger: { id: "ai", elo: 0, rank: { name: "Bronze", tier: "I" } }
                      } as any);
                    }
                    onClose();
                  }}
                  className="button-pill py-4 bg-transparent text-foreground/40 border border-border/50 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-xs font-black uppercase tracking-widest"
                >
                  FORFEIT & LEAVE (-{FORFEIT_PENALTY} ELO)
                </SpamButton>
                <SpamButton
                  onClick={() => setShowAbandonConfirm(false)}
                  className="text-xs font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity py-2"
                >
                  STAY IN BATTLE
                </SpamButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <MicrophoneBorder />
    </motion.div>
  );
};
