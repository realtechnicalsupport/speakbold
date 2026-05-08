import { useState, useRef, useEffect } from "react";
import { useArena, type Duel, type Gamemode, GAMEMODES, getRankColor, getRankFromElo } from "@/hooks/useArena";
import { SiteHeader } from "@/components/SiteHeader";
import { RecorderPanel } from "@/components/RecorderPanel";
import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/hooks/useRecordings";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Swords, Play, Pause, ArrowLeft, Trophy, User as UserIcon, 
  Zap, Flame, Swords as SwordsIcon, Sparkles, Loader2, Radar, Target, Mic, MicOff, AlertTriangle, X,
  ChevronDown, ChevronUp, Users
} from "lucide-react";
import { setRecordingActive } from "@/lib/recordingState";
import { MicrophoneBorder } from "@/components/MicrophoneBorder";
import { transcribeAudio, judgeBattle, generateAIArgument, generateArenaPrompt } from "@/services/geminiService";

/* ── Duel Drill Modal ──────────────────────────────────── */
const DuelDrill = ({
  duel, gamemode, onClose, onComplete, isCreating, sendReadyStatus, completeDuel, broadcastBattleResult, sendTranscript, broadcastAnalyzing, sendForfeit, handleForfeit
}: {
  duel: Duel | null;
  gamemode?: Gamemode;
  onClose: () => void;
  onComplete: (score: number, prompt: string, mode: Gamemode, feedback: string) => void;
  isCreating: boolean;
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
  const mode = duel ? duel.gamemode : (gamemode || "standard");
  const duration = GAMEMODES[mode].duration;
  
  const [seconds, setSeconds] = useState(duration);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [recordEnabled, setRecordEnabled] = useState(true);
  const idRef = useRef<number | null>(null);
  const recorderStartRef = useRef<() => void>();
  const recorderStopRef = useRef<() => void>();
  const wasRecording = useRef(false);
  const hasFiredCount = useRef(false);

  const [customPrompt, setCustomPrompt] = useState("");
  const promptToUse = duel ? duel.prompt : customPrompt;
  const [lastRecording, setLastRecording] = useState<{ blob: Blob; durationMs: number } | null>(null);
  const [showModelSpeech, setShowModelSpeech] = useState(false);

  const opponent = duel?.creator.id === user?.id ? duel?.challenger : duel?.creator;

  const [phase, setPhase] = useState<"drilling" | "ai-turn" | "analyzing" | "results">("drilling");
  const [verdictResult, setVerdictResult] = useState<{ score: number, oppScore?: number, feedback: string, won: boolean, strengths: string, oppStrengths: string, exampleSpeech?: string } | null>(null);
  const [analyzeText, setAnalyzeText] = useState("EXTRACTING AUDIO...");
  const [preCount, setPreCount] = useState<number | null>(null);
  
  const [userReady, setUserReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [readyTimer, setReadyTimer] = useState(15);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const [oppTranscript, setOppTranscript] = useState<string | null>(null);
  const oppTranscriptRef = useRef<string | null>(null);
  const [aiArgument, setAiArgument] = useState<string>("");
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [spokenCharIndex, setSpokenCharIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);

  // Listen for authoritative result from host or transcript from peer
  useEffect(() => {
    const handleResult = (e: any) => {
      const { duelId, score, feedback, oppFeedback, strengths, won, oppScore, oppStrengths } = e.detail;
      if (duel && duel.id === duelId && !isCreating) {
        const isHost = duel.creator.id === user?.id;
        console.log("[Judge] Received authoritative verdict. I am Host:", isHost);
        
        // Ensure we don't set this twice if we are the host (we already set it in generateVerdict)
        if (!isHost) {
          setVerdictResult({ 
            score: isHost ? score : oppScore, 
            feedback: isHost ? feedback : oppFeedback,
            won: isHost ? won : !won,
            strengths: isHost ? strengths : oppStrengths,
            oppStrengths: isHost ? oppStrengths : strengths,
            oppScore: isHost ? oppScore : score,
            exampleSpeech: e.detail.exampleSpeech
          });
          setPhase("results");
        }
      }
    };

    const handleTranscript = (e: any) => {
      const { duelId, userId, transcript } = e.detail;
      if (duel && duel.id === duelId && userId !== user?.id) {
        console.log("[Judge] Received transcript from opponent:", userId);
        setOppTranscript(transcript);
        oppTranscriptRef.current = transcript;
      }
    };

    const handleAnalyzing = (e: any) => {
      const { duelId } = e.detail;
      if (duel && duelId === duel.id && phase !== "analyzing") {
        console.log("[Duel] Opponent signaled analyzing phase. Syncing UI...");
        setPhase("analyzing");
        setAnalyzeText("THE AI IS JUDGING...");
      }
    };

    const handleOpponentForfeit = (e: any) => {
      const { duelId, userId } = e.detail;
      if (duel && duelId === duel.id && userId !== user?.id) {
        console.log("[Duel] Opponent forfeited. Auto-winning...");
        handleForfeit(duel.id, false, duel);
        toast({ title: "Opponent Forfeited", description: "You win by default! (+ELO awarded)", variant: "default" });
        onClose();
      }
    };

    window.addEventListener("arena-battle-result", handleResult);
    window.addEventListener("arena-battle-analyzing", handleAnalyzing);
    window.addEventListener("arena-battle-transcript", handleTranscript);
    window.addEventListener("arena-battle-forfeit", handleOpponentForfeit);
    return () => {
      window.removeEventListener("arena-battle-result", handleResult);
      window.removeEventListener("arena-battle-analyzing", handleAnalyzing);
      window.removeEventListener("arena-battle-transcript", handleTranscript);
      window.removeEventListener("arena-battle-forfeit", handleOpponentForfeit);
    };
  }, [duel, isCreating, user?.id, phase]);

  // Sync ready status from opponent
  useEffect(() => {
    const handleReady = (e: any) => {
      const { duelId, userId, isReady } = e.detail;
      if (duelId === duel?.id && userId !== user?.id) {
        setOpponentReady(isReady);
      }
    };
    window.addEventListener("arena-ready-status", handleReady);
    return () => window.removeEventListener("arena-ready-status", handleReady);
  }, [duel?.id, user?.id]);

  // Timer starts only after preCount hits 0 (handled in the preCount effect)
  const [micError, setMicError] = useState(false);

  useEffect(() => {
    // Check mic permission on mount
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setMicError(false))
      .catch(() => setMicError(true));
  }, []);

  useEffect(() => {
    const isActuallyRecording = running && !finished;
    setRecordingActive(isActuallyRecording);
    return () => setRecordingActive(false);
  }, [running, finished]);

  useEffect(() => {
    if (userReady && !opponentReady) {
      const isAI = opponent?.name.includes("(AI)") || false;
      const delay = isAI ? 500 : 4000;
      const timer = setTimeout(() => {
        setOpponentReady(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [userReady, opponentReady, opponent]);

  // Ready-up Countdown
  useEffect(() => {
    if (phase !== "drilling" || (userReady && opponentReady) || isCreating) return;
    if (readyTimer <= 0) {
      toast({ title: "Session Timed Out", description: "Players did not ready up in time.", variant: "destructive" });
      onClose();
      return;
    }
    const timer = setInterval(() => setReadyTimer(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [readyTimer, userReady, opponentReady, phase, onClose]);

  // For AI opponents, trigger the ai-turn phase before the user's countdown
  const isAIOpponent = duel?.id.startsWith("ai-") || false;

  useEffect(() => {
    if (userReady && opponentReady && isAIOpponent && phase === "drilling" && !hasFiredCount.current) {
      // Start the match countdown first
      hasFiredCount.current = true;
      setPreCount(5);
    }
  }, [userReady, opponentReady, isAIOpponent, phase]);

  useEffect(() => {
    if (preCount === 0 && phase === "drilling" && isAIOpponent) {
      if (gamemode === "debate" || gamemode === "pitch") {
        // Interactive modes: AI speaks first
        setPreCount(null);
        setPhase("ai-turn");
      } else {
        // Parallel modes: user speaks immediately, AI generates in background
        setPreCount(null);
        setRunning(true);
        generateAIArgument(promptToUse, duration, gamemode || "standard", opponent?.persona).then(arg => {
          oppTranscriptRef.current = arg;
          setOppTranscript(arg);
        }).catch(e => console.error("Silent AI gen failed:", e));
      }
    }
  }, [preCount, phase, isAIOpponent, gamemode, promptToUse, duration]);

  // Handle the AI's turn: generate speech, speak it, then start user countdown
  useEffect(() => {
    if (phase !== "ai-turn" || !promptToUse) return;
    let cancelled = false;

    const runAITurn = async () => {
      setAiSpeaking(true);
      setSpokenCharIndex(0);
      setAiArgument("The AI is formulating its argument...");

      try {
        const argument = await generateAIArgument(promptToUse, duration, gamemode || "standard", opponent?.persona);
        if (cancelled) return;

        setAiArgument(argument);
        // Store the AI argument as the opponent transcript for judging
        oppTranscriptRef.current = argument;
        setOppTranscript(argument);

        // Speak it via browser TTS
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(argument);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Premium") || v.name.includes("Google")));
        if (preferred) utterance.voice = preferred;

        utteranceRef.current = utterance;

        // Enhanced sync logic: Use boundary events + a smooth interpolation timer
        let lastCharIndex = 0;
        let syncTimer: number | null = null;
        
        const startInterpolation = (startIndex: number) => {
          if (syncTimer) clearInterval(syncTimer);
          let currentPos = startIndex;
          // Approximate speaking speed (chars per ms)
          // 150 wpm is roughly 12.5 chars per second (including spaces)
          const charsPerMs = 0.015; 
          
          syncTimer = window.setInterval(() => {
            currentPos += charsPerMs * 50; // Update every 50ms
            // Don't overshoot too far past the last known boundary
            const maxOvershoot = 20; 
            if (currentPos < argument.length && currentPos < lastCharIndex + maxOvershoot) {
              setSpokenCharIndex(Math.floor(currentPos));
            }
          }, 50);
        };

        utterance.onstart = () => {
          setAiSpeaking(true);
          startInterpolation(0);
        };

        utterance.onboundary = (e) => {
          if (e.name === "word") {
            const index = e.charIndex;
            lastCharIndex = index;
            // Find word end for cleaner highlighting
            const nextSpace = argument.indexOf(" ", index);
            const wordEnd = nextSpace === -1 ? argument.length : nextSpace;
            setSpokenCharIndex(wordEnd);
            // Restart interpolation from the authoritative boundary
            startInterpolation(wordEnd);
          }
        };

        utterance.onend = () => {
          if (syncTimer) clearInterval(syncTimer);
          if (cancelled) return;
          setSpokenCharIndex(argument.length);
          setAiSpeaking(false);
          setTimeout(() => {
            if (cancelled) return;
            setPhase("drilling");
            setPreCount(3);
          }, 1000);
        };

        utterance.onerror = (e) => {
          if (syncTimer) clearInterval(syncTimer);
          console.error("[AI TTS] Error:", e);
          if (cancelled) return;
          setSpokenCharIndex(argument.length);
          setAiSpeaking(false);
          setPhase("drilling");
          setPreCount(3);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("[AI Turn] Failed to generate argument:", err);
        if (!cancelled) {
          setAiSpeaking(false);
          hasFiredCount.current = true;
          setPhase("drilling");
          setPreCount(5);
        }
      }
    };

    runAITurn();
    return () => {
      cancelled = true;
      window.speechSynthesis.cancel();
    };
  }, [phase]);

  useEffect(() => {
    if (userReady && opponentReady && preCount === null && !running && !finished && !hasFiredCount.current && seconds === duration) {
       hasFiredCount.current = true;
       setPreCount(5);
    }
  }, [userReady, opponentReady, preCount, running, finished, seconds, duration]);

  useEffect(() => {
    if (preCount === null) return;
    if (preCount === 0) {
      // For AI opponents in interactive modes (debate/pitch), let the AI routing effect
      // handle the transition to "ai-turn". Don't auto-start the user timer here.
      if (isAIOpponent && (gamemode === "debate" || gamemode === "pitch")) {
        return;
      }
      setPreCount(null);
      setRunning(true);
      return;
    }
    const timer = setTimeout(() => setPreCount(preCount - 1), 1000);
    return () => clearTimeout(timer);
  }, [preCount, isAIOpponent, gamemode]);

  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const generateVerdict = async () => {
    if (!lastRecording) {
      console.warn("[Judge] No recording found to judge.");
      toast({ title: "No recording found", description: "The session is invalid without audio.", variant: "destructive" });
      onClose();
      return;
    }

    setPhase("analyzing");
    
    // Create a timeout promise to prevent getting stuck
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("JUDGE_TIMEOUT")), 25000)
    );

    try {
      setAnalyzeText("TRANSCRIBING AUDIO...");
      
      const transcribePromise = transcribeAudio(lastRecording.blob);
      const myTranscript = await Promise.race([transcribePromise, timeoutPromise]) as string;
      
      console.log("[Judge] Transcription result:", myTranscript);

      if (!myTranscript || myTranscript.trim().length < 5) {
        console.warn("[Judge] Empty or too short transcript. Invalid attempt.");
        setVerdictResult({
          score: 0,
          oppScore: 0,
          feedback: "We couldn't hear you clearly. The recording seems to be empty or contained only background noise.",
          won: false,
          strengths: "N/A",
          oppStrengths: "N/A",
          exampleSpeech: "Ensure your microphone is active and you speak directly into it. Try to maintain a steady pace and clear articulation."
        });
        setPhase("results");
        return;
      }
      const isHost = !duel || duel.creator.id === user?.id;
      
      if (!isHost && duel) {
        console.log("[Judge] Challenger sending transcript to Host...");
        sendTranscript(duel.id, myTranscript);
        setAnalyzeText("WAITING FOR AI RESULTS...");
        
        // Timeout for waiting for host results
        setTimeout(() => {
          if (phase === "analyzing") {
             toast({ title: "Sync Error", description: "Host did not return results in time.", variant: "destructive" });
             onClose();
          }
        }, 15000);
        return;
      }

      // If Host, wait for challenger transcript if it's a real duel
      if (isHost && duel) {
        broadcastAnalyzing(duel.id);
      }
      
      let finalOppTranscript = oppTranscriptRef.current;
      if (duel && !finalOppTranscript) {
        setAnalyzeText("WAITING FOR OPPONENT...");
        console.log("[Judge] Host waiting for Challenger transcript...");
        // Wait up to 10 seconds for transcript
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 500));
          if (oppTranscriptRef.current) {
             finalOppTranscript = oppTranscriptRef.current;
             break;
          }
        }
        
        if (!oppTranscriptRef.current) {
          throw new Error("OPPONENT_MISSING_TRANSCRIPT");
        }
      }

      setAnalyzeText("AI IS REVIEWING...");
      console.log("[Judge] Consulting AI for dual verdict...");
      
      const hostName = duel?.creator.name || user?.email?.split("@")[0] || "Host";
      const challengerName = duel?.challenger?.name || "Opponent";
      
      // Pass BOTH transcripts and names to the judge for comparison
      const judgePromise = judgeBattle(hostName, myTranscript, promptToUse, challengerName, finalOppTranscript || undefined);
      const judgeResult = await Promise.race([judgePromise, timeoutPromise]) as any;
      
      const userName = user?.email?.split("@")[0] || "User";
      
      console.log("[Judge] Consultation complete. Results:", judgeResult);
      
      const finalVerdict = {
        score: judgeResult.score,
        oppScore: judgeResult.oppScore || 0,
        feedback: judgeResult.feedback,
        oppFeedback: judgeResult.oppFeedback || judgeResult.feedback,
        won: judgeResult.winner === "you",
        strengths: judgeResult.strengths,
        oppStrengths: judgeResult.oppStrengths || "N/A",
        exampleSpeech: judgeResult.exampleSpeech
      };

      setVerdictResult(finalVerdict);
      
      if (duel) {
        console.log("[Judge] Broadcasting sync results to peer...");
        broadcastBattleResult(duel.id, finalVerdict);
        // Pass the explicit winner from the judge to ensure ELO correctly reflects the outcome
        completeDuel(duel.id, userName, judgeResult.score, judgeResult.oppScore || 0, judgeResult.feedback, duel, judgeResult.winner, {
          strengths: judgeResult.strengths,
          oppStrengths: judgeResult.oppStrengths,
          oppFeedback: judgeResult.oppFeedback,
          exampleSpeech: judgeResult.exampleSpeech
        });
      }
      
      setPhase("results");
    } catch (err: any) {
      console.error("[Judge] FATAL JUDGE ERROR:", err);
      const isTimeout = err.message === "JUDGE_TIMEOUT";
      const isMissing = err.message === "OPPONENT_MISSING_TRANSCRIPT";
      
      toast({ 
        title: isTimeout ? "AI Timed Out" : "Invalid Attempt", 
        description: isTimeout ? "The AI took too long to analyze. Returning to lobby." : "Analysis failed or sync lost. Returning to lobby.", 
        variant: "destructive" 
      });
      onClose();
    }
  };

  useEffect(() => {
    if (finished && lastRecording && phase === "drilling") {
      generateVerdict();
    }
  }, [finished, lastRecording, phase]);

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
          setTimeout(() => {
            recorderStopRef.current?.(); 
            wasRecording.current = false; 
            refresh(); 
          }, 100);
        }
      }
    }, 100); // Higher frequency for smoother sync
    
    return () => { if (idRef.current) clearInterval(idRef.current); };
  }, [running, finished, recordEnabled, refresh, duration]);

  useEffect(() => {
    if (!recordEnabled) return;
    if (running && !wasRecording.current) { recorderStartRef.current?.(); wasRecording.current = true; }
    else if (!running && wasRecording.current && finished) {
      setTimeout(() => { recorderStopRef.current?.(); wasRecording.current = false; }, 50);
    }
  }, [running, recordEnabled, finished]);

  const pct = (seconds / duration) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] glass overflow-y-auto overflow-x-hidden scrollbar-hide text-foreground flex flex-col"
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

      {!isCreating && opponent && phase === "drilling" && (
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
          <div className="text-right">
            <p className="text-sm font-black uppercase tracking-widest text-primary">TARGET SCORE</p>
            <p className="text-3xl font-black">{opponent.score}</p>
          </div>
        </div>
      )}

      <div className={cn(
        "px-4 md:container max-w-4xl mx-auto py-6 md:py-16 relative z-10 flex-grow flex flex-col min-h-[auto] md:min-h-0",
        phase === "results" ? "justify-start" : "justify-center"
      )}>
        <div className="absolute top-8 left-4 md:left-0 flex items-center gap-6">
          <button 
            onClick={() => {
              if (finished || phase === "results") onClose();
              else setShowAbandonConfirm(true);
            }} 
            className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.3em] text-foreground/40 hover:text-primary transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> LEAVE BATTLE
          </button>
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
            <MicrophoneBorder />
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
              {isCreating && !running && !finished ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black opacity-30 tracking-widest uppercase">Draft your challenge prompt or</p>
                    <button 
                      onClick={async () => {
                        setGeneratingPrompt(true);
                        try {
                          const p = await generateArenaPrompt(mode);
                          setCustomPrompt(p);
                        } catch (e) {}
                        setGeneratingPrompt(false);
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
                    <button
                      disabled={!customPrompt.trim()}
                      onClick={() => {
                        setUserReady(true);
                        // For solo custom mode, we set opponent ready immediately
                        setOpponentReady(true);
                      }}
                      className="button-pill w-full py-4 bg-primary text-white shadow-glow group flex items-center justify-center gap-4 mt-4"
                    >
                      <span className="text-sm font-black uppercase tracking-[0.3em]">START CHALLENGE</span>
                      <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                    </button>
                  </div>
              ) : (
                <p className="speak-serif text-xl sm:text-2xl md:text-4xl italic tracking-tight leading-relaxed text-center">"{promptToUse}"</p>
              )}
            </div>

            <div className="max-w-md mx-auto w-full">
              {!finished ? (
                !userReady && !isCreating ? (
                  <button
                    disabled={isCreating && !customPrompt.trim()}
                    onClick={() => {
                      setUserReady(true);
                      if (duel) sendReadyStatus(duel.id, true);
                    }}
                    className="button-pill w-full py-6 bg-primary text-white shadow-glow group flex items-center justify-center gap-4"
                  >
                    <span className="text-sm font-black uppercase tracking-[0.3em]">READY UP ({readyTimer}s)</span>
                    <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                  </button>
                ) : !isCreating ? (
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
        {phase === "ai-turn" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center gap-4 px-4 md:px-8 py-4 border-b border-border/50 shrink-0">
              <div className="relative">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xl md:text-2xl">
                  🤖
                </div>
                {aiSpeaking && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-ping" />
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">
                  {opponent?.name || "AI OPPONENT"}
                </p>
                <p className="text-[10px] opacity-40 uppercase tracking-widest">
                  {aiSpeaking ? "SPEAKING NOW" : "GENERATING ARGUMENT..."}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {aiSpeaking && (
                  <>
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="h-3 w-3 rounded-full bg-green-500/70 animate-pulse delay-75" />
                    <span className="h-4 w-4 rounded-full bg-green-500/50 animate-pulse delay-150" />
                  </>
                )}
                <span className={cn("text-[10px] font-black uppercase tracking-widest", aiSpeaking ? "text-green-400" : "text-primary/40")}>
                  {aiSpeaking ? "LIVE" : "LOADING"}
                </span>
              </div>
            </div>

            {/* AI Speech Transcript */}
            <div className="flex-1 overflow-y-auto px-4 md:px-12 py-4 md:py-10">
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-primary/40 mb-3 md:mb-6">OPPONENT ARGUMENT</p>
              {aiArgument === "The AI is formulating its argument..." ? (
                <div className="flex items-center gap-3 opacity-40">
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  <span className="text-[10px] md:text-sm font-black uppercase tracking-widest animate-pulse">Generating argument...</span>
                </div>
              ) : (
                <p className="speak-serif text-base md:text-xl lg:text-2xl italic leading-relaxed tracking-tight text-foreground/90">
                  <span className="text-foreground">{aiArgument.substring(0, spokenCharIndex)}</span>
                  <span className="opacity-30">{aiArgument.substring(spokenCharIndex)}</span>
                </p>
              )}
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 px-4 md:px-8 py-4 border-t border-border/50 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                YOUR TURN IS NEXT
              </p>
              {!aiSpeaking && aiArgument !== "The AI is formulating its argument..." && (
                <button
                  onClick={() => {
                    window.speechSynthesis.cancel();
                    setAiSpeaking(false);
                    hasFiredCount.current = true;
                    setPhase("drilling");
                    setPreCount(5);
                  }}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-primary text-white hover:scale-105 active:scale-95 transition-all shadow-glow"
                >
                  SKIP & START →
                </button>
              )}
            </div>
          </motion.div>
        )}

        {preCount !== null && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
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
                 <h2 className={cn("text-sm font-black uppercase tracking-[1em] mb-4", verdictResult.won ? "text-green-500" : "text-red-500")}>
                    {verdictResult.won ? "YOU WON" : "YOU LOST"}
                 </h2>
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
                             <p className={cn("speak-serif text-6xl md:text-7xl italic", !verdictResult.won ? "text-foreground font-black" : "opacity-40")}>{verdictResult.oppScore}</p>
                          </div>
                        </>
                     )}
                 </div>
              </div>

              <div className="space-y-6 relative z-10">
                 <div className="bg-background/50 border border-border rounded-2xl p-6">
                    <p className="text-sm font-black uppercase tracking-[0.4em] text-primary mb-3">AI VERDICT</p>
                    <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap">{verdictResult.feedback}</p>
                 </div>

                 {verdictResult.exampleSpeech && (
                   <div className="bg-primary/5 border border-primary/20 rounded-2xl overflow-hidden">
                      <button 
                        onClick={() => setShowModelSpeech(!showModelSpeech)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-primary/5 transition-colors"
                      >
                         <p className="text-sm font-black uppercase tracking-[0.4em] text-primary">MODEL SPEECH</p>
                         {showModelSpeech ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
                      </button>
                      
                      <AnimatePresence>
                        {showModelSpeech && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-6 pb-6"
                          >
                            <p className="speak-serif text-lg italic leading-relaxed opacity-80 whitespace-pre-wrap">"{verdictResult.exampleSpeech}"</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 mt-4 italic">Note: This is a high-level example incorporating all coach feedback.</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                 )}
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background/30 border border-border rounded-xl p-4">
                       <p className="text-[11px] font-black uppercase tracking-[0.3em] text-green-500 mb-2">YOUR STRENGTHS</p>
                       <div className="space-y-1">
                          {(typeof verdictResult.strengths === 'string' 
                             ? verdictResult.strengths.split(',') 
                             : (Array.isArray(verdictResult.strengths) ? verdictResult.strengths : [])
                           ).filter(s => s && String(s).trim()).map((s, i) => (
                              <p key={i} className="text-[11px] opacity-70 leading-tight flex gap-2">
                                 <span className="text-green-500">•</span> {String(s).trim()}
                              </p>
                           ))}
                       </div>
                    </div>
                    <div className="bg-background/30 border border-border rounded-xl p-4">
                       <p className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-500 mb-2">OPPONENT NOTE</p>
                       <div className="space-y-1">
                          {verdictResult.oppStrengths.split(',').filter(s => s.trim()).map((s, i) => (
                             <p key={i} className="text-[11px] opacity-70 leading-tight flex gap-2">
                                <span className="text-orange-500">•</span> {s.trim()}
                             </p>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => onComplete(verdictResult.score, promptToUse, mode, verdictResult.feedback)}
                className="w-full mt-8 py-5 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-95 transition-all shadow-glow"
              >
                RETURN TO ARENA
              </button>
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
                  Leaving now will result in an automatic forfeit and a <span className="text-red-500 font-bold">-30 ELO penalty</span>. 
                  Are you sure you want to concede?
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    if (duel) {
                      sendForfeit(duel.id);
                      handleForfeit(duel.id, true, duel);
                    }
                    onClose();
                  }}
                  className="button-pill py-4 bg-red-500 text-white border-red-500 hover:bg-red-600 transition-colors text-xs font-black uppercase tracking-widest"
                >
                  FORFEIT & LEAVE (-30 ELO)
                </button>
                <button 
                  onClick={() => setShowAbandonConfirm(false)}
                  className="text-xs font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity py-2"
                >
                  STAY IN BATTLE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ── Main Arena Page ───────────────────────────────────── */
const Arena = () => {
  const { 
    duels, profile, loading: arenaLoading, completeDuel, findMatch, completedDuels, refresh: refreshArena,
    onlineUsers, incomingRequests, setIncomingRequests, sendDuelRequest, acceptDuelRequest, sendReadyStatus,
    broadcastBattleResult, broadcastAnalyzing, sendTranscript, sendForfeit, handleForfeit
  } = useArena();
  const { user } = useAuth();
  
  const [activeDrill, setActiveDrill] = useState<Duel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<Gamemode>("standard");
  
  const [matchmaking, setMatchmaking] = useState(false);
  const [matchFound, setMatchFound] = useState<Duel | null>(null);
  const [eloUpdate, setEloUpdate] = useState<{ change: number; newElo: number } | null>(null);
  const pendingUpdate = useRef<{ change: number; newElo: number } | null>(null);
  
  // Kill any residual AI speech on mount/unmount
  useEffect(() => {
    window.speechSynthesis.cancel();
    return () => window.speechSynthesis.cancel();
  }, []);

  // Global ELO update listener for the lobby
  useEffect(() => {
    const handleEloUpdate = (e: any) => {
      console.log("[Arena] Received ELO update event:", e.detail);
      // If we're currently in a drill, buffer the update until they return to lobby
      if (activeDrill) {
        console.log("[Arena] Buffering ELO update until lobby return...");
        pendingUpdate.current = e.detail;
      } else {
        console.log("[Arena] Firing ELO update animation immediately.");
        setEloUpdate(e.detail);
        setTimeout(() => setEloUpdate(null), 4000);
      }
    };
    window.addEventListener("elo-updated", handleEloUpdate);
    return () => window.removeEventListener("elo-updated", handleEloUpdate);
  }, [activeDrill]);

  // Debug command for developers
  useEffect(() => {
    (window as any).debugWin = () => {
      if (!activeDrill) {
        console.error("[Debug] No active battle to win! Enter a match first.");
        return;
      }
      console.log("[Debug] Auto-winning battle:", activeDrill.id);
      completeDuel(
        activeDrill.id, 
        user?.email?.split("@")[0] || "User", 
        100, // Perfect score
        0,   // Opponent loss
        "Victory achieved via divine debug intervention.", 
        activeDrill
      );
      
      // Simulate return to lobby
      setActiveDrill(null);
      setIsCreating(false);
      
      // Fire animation (completeDuel handles the event dispatch)
      console.log("[Debug] Rank adjustment triggered.");
    };
    
    return () => { delete (window as any).debugWin; };
  }, [activeDrill, completeDuel, user]);

  const [challengeTarget, setChallengeTarget] = useState<{ id: string, name: string } | null>(null);
  const [challengeMode, setChallengeMode] = useState<Gamemode>("standard");
  const [challengePrompt, setChallengePrompt] = useState("");
  const [generatingPrompt, setGeneratingPrompt] = useState(false);

  const handleAcceptRequest = (request: any) => {
    if (!request) return;
    
    // If we are the one who RECEIVED the request, we need to notify the sender
    if (!request.isAcceptedChallenge) {
      acceptDuelRequest(request);
    }

    const duel: Duel = {
      id: request.id,
      prompt: request.prompt,
      gamemode: request.gamemode,
      creator: {
        id: request.senderId,
        name: request.senderName,
        avatar: "👤",
        rank: request.senderRank,
        elo: 0,
        score: null
      },
      challenger: {
        id: request.targetId || user?.id, 
        name: request.targetName || user?.email?.split("@")[0] || "Challenger",
        avatar: "👤",
        rank: request.targetRank || getRankFromElo(profile.elo),
        elo: 0,
        score: null
      },
      status: "active",
      winner: null,
      feedback: null,
      timestamp: Date.now()
    };
    
    if (request.isAcceptedChallenge) {
      toast({ 
        title: "Challenge Accepted!", 
        description: `${request.targetName} has entered the Arena. Prepare yourself.`,
      });
    }

    // Remove from inbox
    setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
    
    // Clear any other states to ensure drill shows up
    setMatchmaking(false);
    setMatchFound(null);
    setIsCreating(false);
    
    setActiveDrill(duel);
  };

  // Effect to handle accepted challenges for the original sender
  useEffect(() => {
    const accepted = incomingRequests.find(r => r.isAcceptedChallenge);
    if (accepted && activeDrill?.id !== accepted.id) {
      toast({ title: "Peer Accepted!", description: "Synchronizing combat start..." });
      handleAcceptRequest(accepted);
      // Clear it from inbox after processing so it doesn't re-trigger
      setIncomingRequests(prev => prev.filter(r => r.id !== accepted.id));
    }
  }, [incomingRequests, activeDrill?.id]);

  const currentRank = getRankFromElo(profile.elo);
  const userName = user?.email?.split("@")[0] || "Operator";
  const currentUser = { name: userName, avatar: "👤", rank: currentRank, elo: profile.elo };

  const handleFindMatch = async (mode: Gamemode) => {
    setMatchmaking(true);
    const match = await findMatch(mode);
    setMatchmaking(false);
    setMatchFound(match);
    
    setTimeout(() => {
      setMatchFound(null);
      setActiveDrill(match);
    }, 3000);
  };

  const [selectedDuel, setSelectedDuel] = useState<Duel | null>(null);

  if (arenaLoading && !activeDrill) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <Radar className="h-12 w-12 text-primary animate-spin-slow mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-[0.5em] text-primary/40 animate-pulse">SYNCHRONIZING COMBAT RECORDS...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-screen bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <SiteHeader />

      <AnimatePresence>
        {selectedDuel && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card border border-border rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-muted/30">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1">SESSION ARCHIVE</p>
                  <h3 className="speak-serif text-2xl font-bold italic">{selectedDuel.gamemode.toUpperCase()} BATTLE</h3>
                </div>
                <button onClick={() => setSelectedDuel(null)} className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-10">
                {/* Scoreboard */}
                <div className="flex items-center justify-center gap-8 md:gap-12 py-6 bg-muted/20 rounded-[2rem] border border-border">
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-black mb-2">{selectedDuel.creator.score}</div>
                    <div className="flex items-center gap-2 justify-center">
                      <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] border", getRankColor(selectedDuel.creator.rank))}>{selectedDuel.creator.avatar}</div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{selectedDuel.creator.name}</span>
                    </div>
                  </div>
                  <div className="speak-serif text-3xl opacity-20 italic">vs</div>
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-black mb-2">{selectedDuel.challenger?.score}</div>
                    <div className="flex items-center gap-2 justify-center">
                      <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] border", getRankColor(selectedDuel.challenger?.rank || currentRank))}>{selectedDuel.challenger?.avatar || "🤖"}</div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{selectedDuel.challenger?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Prompt */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2">
                    <Target className="h-3 w-3" /> THE CHALLENGE
                  </p>
                  <p className="speak-serif text-xl md:text-2xl italic leading-relaxed border-l-4 border-primary/20 pl-6 py-2">
                    "{selectedDuel.prompt}"
                  </p>
                </div>

                {/* Feedback */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2">
                        <Sparkles className="h-3 w-3" /> COACH'S VERDICT
                      </p>
                      <p className="text-sm leading-relaxed opacity-70 italic font-medium">
                        "{selectedDuel.feedback}"
                      </p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2">
                        <Trophy className="h-3 w-3" /> CORE STRENGTHS
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDuel.strengths?.split(',').map((s, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest">
                            {s.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Example Speech */}
                {selectedDuel.exampleSpeech && (
                  <div className="space-y-4 p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Mic className="h-3 w-3" /> HOW AN EXPERT WOULD SAY IT
                    </p>
                    <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap">
                      {selectedDuel.exampleSpeech}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-border bg-muted/10 flex justify-end">
                <button 
                  onClick={() => setSelectedDuel(null)}
                  className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-glow"
                >
                  CLOSE ARCHIVE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchmaking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center">
            <Radar className="h-24 w-24 text-primary animate-spin-slow opacity-50 mb-8" />
            <h2 className="speak-serif text-4xl italic tracking-tighter animate-pulse">Scanning Arena...</h2>
            <p className="text-sm font-black uppercase tracking-[0.5em] text-primary mt-4">SEEKING WORTHY OPPONENT</p>
          </motion.div>
        )}
        
        {matchFound && (() => {
           const isCreator = matchFound.creator.id === user?.id;
           const opp = isCreator ? matchFound.challenger : matchFound.creator;
           const me = isCreator ? matchFound.creator : matchFound.challenger;
           
           return (
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55] bg-background flex flex-col items-center justify-center">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 to-background pointer-events-none" />
               <h2 className="text-sm font-black uppercase tracking-[1em] text-primary mb-12 animate-pulse">MATCH SECURED</h2>
               <div className="flex flex-col md:flex-row items-center gap-12 z-10 px-4">
                 <div className="text-center">
                   <div className={cn("h-24 w-24 md:h-32 md:w-32 rounded-full border-4 flex items-center justify-center text-4xl md:text-5xl mb-4 bg-muted shadow-2xl", getRankColor(me.rank))}>
                     {me.avatar || "👤"}
                   </div>
                   <p className="text-xl md:text-2xl font-bold truncate max-w-[150px] mx-auto">{me.name}</p>
                   <p className={cn("text-[10px] md:text-sm font-black uppercase tracking-widest mt-1", getRankColor(me.rank))}>{me.rank.name} {me.rank.tier}</p>
                 </div>
                 
                 <div className="speak-serif text-4xl md:text-6xl italic opacity-20">VS</div>
                 
                 <div className="text-center">
                   <div className={cn("h-24 w-24 md:h-32 md:w-32 rounded-full border-4 flex items-center justify-center text-4xl md:text-5xl mb-4 bg-muted shadow-2xl", getRankColor(opp.rank))}>
                     {opp.avatar || "🤖"}
                   </div>
                   <p className="text-xl md:text-2xl font-bold truncate max-w-[150px] mx-auto">{opp.name}</p>
                   <p className={cn("text-[10px] md:text-sm font-black uppercase tracking-widest mt-1", getRankColor(opp.rank))}>{opp.rank.name} {opp.rank.tier}</p>
                 </div>
               </div>
               <p className="mt-16 text-sm opacity-40 uppercase tracking-[0.3em] font-black">PREPARE FOR BATTLE</p>
             </motion.div>
           );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {eloUpdate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none bg-background/80 backdrop-blur-md"
          >
            <h2 className={cn(
              "text-sm font-black uppercase tracking-[1em] mb-8 animate-pulse",
              eloUpdate.change > 0 ? "text-primary" : eloUpdate.change < 0 ? "text-red-500" : "text-slate-500"
            )}>
              {eloUpdate.change > 0 ? "RANK ADVANCEMENT" : eloUpdate.change < 0 ? "RATING PENALTY" : "RATING UNCHANGED"}
            </h2>
            <motion.div 
              initial={{ scale: eloUpdate.change < 0 ? 1.2 : 0.8, y: eloUpdate.change < 0 ? -50 : 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", bounce: eloUpdate.change < 0 ? 0.2 : 0.5 }}
              className={cn(
                "px-12 py-8 rounded-[3rem] text-7xl md:text-9xl font-black shadow-2xl border-4 flex items-baseline gap-4 bg-background",
                eloUpdate.change > 0 
                  ? "text-green-500 border-green-500/50 shadow-green-500/20" 
                  : eloUpdate.change < 0 
                    ? "text-red-500 border-red-500/50 shadow-red-500/20"
                    : "text-slate-500 border-slate-500/50 shadow-slate-500/20"
              )}
            >
              <span className="leading-none">{eloUpdate.change >= 0 ? "+" : ""}{eloUpdate.change}</span>
              <span className="text-2xl md:text-4xl opacity-50 tracking-widest">ELO</span>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xl md:text-2xl font-bold mt-8 opacity-60"
            >
              New Rating: <span className="text-foreground">{eloUpdate.newElo}</span>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="px-4 md:container pt-32 pb-16 relative z-10">
        <div id="arena-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          <div className="lg:col-span-6 space-y-12">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-black uppercase tracking-[0.4em]">
                <Users className="h-3 w-3" /> PEER LEARNING SESSION
              </div>
              <h1 className="speak-serif text-5xl md:text-8xl tracking-tighter leading-[0.8] italic">
                Practice <span className="text-primary">Lounge.</span>
              </h1>
              <p className="text-lg opacity-40 leading-relaxed max-w-md">
                Improve through peer feedback. Match with other learners, get AI-powered insights, and grow your skills with every session.
              </p>

              {/* Desktop Decorative Stats */}
              <div className="hidden lg:grid grid-cols-3 gap-6 pt-8">
                 {[
                   { label: "Active Duels", val: "24", icon: Swords },
                   { label: "Global ELO", val: "1,240", icon: Trophy },
                   { label: "AI Analyzed", val: "8.4k", icon: Zap }
                 ].map((stat, i) => (
                   <div key={i} className="p-4 rounded-3xl bg-muted/10 border border-border/50 backdrop-blur-md hover:bg-muted/20 transition-colors group">
                      <stat.icon className="h-4 w-4 text-primary mb-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30">{stat.label}</p>
                      <p className="speak-serif text-xl italic">{stat.val}</p>
                   </div>
                 ))}
              </div>
            </motion.div>

            <div className={cn(
              "relative overflow-hidden p-8 rounded-[2.5rem] border backdrop-blur-xl flex items-center gap-8 group transition-all duration-500",
              getRankColor(currentRank)
            )}>
               <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
               <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Trophy className="h-40 w-40" />
               </div>
               
               <div className="relative h-24 w-24 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full border-4 border-current opacity-20 animate-spin-slow" />
                  <div className="absolute inset-2 rounded-full border border-current opacity-40" />
                  <div className="h-16 w-16 rounded-full bg-background flex items-center justify-center text-4xl shadow-2xl relative z-10 border border-current/20">
                    👤
                  </div>
               </div>

               <div className="relative z-10 flex-grow space-y-2">
                 <div className="flex items-center gap-2">
                    <span className="h-[1px] w-4 bg-current opacity-30" />
                    <p className="text-sm font-black uppercase tracking-[0.4em] opacity-60">MASTERY RANK</p>
                 </div>
                 <div className="flex items-baseline gap-3">
                    <h2 className="speak-serif text-5xl font-black italic tracking-tighter" style={{ color: 'inherit' }}>{currentRank.name}</h2>
                    <span className="text-sm font-black uppercase tracking-widest opacity-30">{currentRank.tier}</span>
                 </div>
                 <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
                       <span>{Math.max(0, profile.elo)} ELO</span>
                       <span>{Math.floor(Math.max(0, profile.elo) / 400) * 400 + 400} ELO</span>
                    </div>
                    <div className="w-full bg-current/10 h-1.5 rounded-full overflow-hidden p-[1px]">
                       <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(Math.max(0, profile.elo) % 400) / 400 * 100}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full rounded-full bg-current shadow-[0_0_10px_currentColor]" 
                       />
                    </div>
                    <p className="text-sm font-black italic tracking-tight opacity-40">
                       {400 - (Math.max(0, profile.elo) % 400)} Points until <span className="text-foreground font-black">THE NEXT RANK</span>
                    </p>
                 </div>
               </div>
            </div>

            <div className="space-y-8 p-8 rounded-[2.5rem] bg-muted/20 border border-border relative overflow-hidden">
              <p className="text-sm font-black uppercase tracking-[0.4em] text-primary mb-6">SELECT PRACTICE MODE</p>
              
              <div id="arena-gamemodes" className="grid grid-cols-2 gap-3 relative z-10">
                {(Object.entries(GAMEMODES) as [Gamemode, typeof GAMEMODES.standard][]).map(([mode, data]) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all text-left group relative overflow-hidden",
                      selectedMode === mode 
                        ? "bg-primary border-primary text-white" 
                        : "bg-background border-border text-foreground/40 hover:border-primary/50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <Zap className={cn("h-4 w-4", selectedMode === mode ? "text-white" : "text-primary/40")} />
                      <span className="text-[11px] font-black opacity-40">{data.duration}S</span>
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest leading-tight relative z-10">{data.label}</p>
                    {selectedMode === mode && <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button 
                   onClick={() => handleFindMatch(selectedMode)}
                   className="w-full py-6 bg-primary text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-glow flex items-center justify-center gap-3"
                 >
                   <Radar className="h-5 w-5" /> FIND PARTNER
                 </button>
                 <button 
                   onClick={() => setIsCreating(true)}
                   className="w-full py-6 bg-muted/50 border border-border text-foreground rounded-2xl text-sm font-black uppercase tracking-[0.3em] hover:bg-muted transition-all flex items-center justify-center gap-3"
                 >
                   <Zap className="h-4 w-4" /> NEW SESSION
                 </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-12">
            {/* Online Combatants */}
            <div className="space-y-8">
               <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.4em] opacity-30">ACTIVE LEARNERS</h2>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                  <span className="text-sm font-black opacity-30 uppercase tracking-widest">{onlineUsers.length} ACTIVE</span>
                </div>
              </div>
              <div id="arena-online-users" className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                {onlineUsers.length === 0 ? (
                  <div className="col-span-full border border-dashed border-border/60 rounded-3xl p-8 text-center opacity-20">
                    <p className="text-sm font-black uppercase tracking-widest italic">Awaiting Peers...</p>
                  </div>
                ) : (
                  onlineUsers.map((u) => (
                    <motion.div 
                      key={u.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-3xl bg-muted/20 border border-border flex items-center justify-between group hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-xl border", getRankColor(u.rank))}>
                          {u.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[80px]">{u.name}</p>
                          <p className="text-[11px] font-black opacity-30">{u.elo} ELO</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setChallengeTarget({ id: u.id, name: u.name })}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95 shadow-glow"
                      >
                        INVITE
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-8 mt-12 lg:mt-0">
               <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.4em] opacity-30">PRACTICE HISTORY</h2>
                <div className="h-px bg-border flex-grow ml-8" />
              </div>
              <div className="space-y-3">
                {completedDuels.map(duel => {
                   return (
                  <div 
                    key={duel.id} 
                    onClick={() => setSelectedDuel(duel)}
                    className="p-4 rounded-2xl bg-muted/10 border border-border flex items-center gap-6 group hover:bg-muted/20 transition-all cursor-pointer"
                  >
                    <div className="flex-grow min-w-0">
                      <p className="speak-serif text-sm italic opacity-60 truncate">"{duel.prompt}"</p>
                      {duel.feedback && (
                        <p className="text-sm opacity-40 mt-1 line-clamp-1 italic">"{duel.feedback}"</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                         <span className="text-[11px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">{duel.gamemode}</span>
                         <span className={cn("text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-muted/20 text-foreground/40 group-hover:bg-primary/20 group-hover:text-primary transition-colors")}>
                           VIEW DETAILS →
                         </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 bg-muted/50 p-2 rounded-xl border border-border">
                       <div className="text-right flex items-center gap-2">
                          <span className="text-xl font-black opacity-60">{duel.creator.score}</span>
                          <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-sm border bg-background", getRankColor(duel.creator.rank))}>{duel.creator.avatar}</div>
                       </div>
                       <span className="text-[11px] font-black text-primary">WITH</span>
                       <div className="text-left flex items-center gap-2">
                          <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-sm border bg-background", getRankColor(currentRank))}>👤</div>
                          <span className={cn("text-xl font-black opacity-60")}>{duel.challenger?.score}</span>
                       </div>
                    </div>
                  </div>
                )})}
                {completedDuels.length === 0 && (
                   <p className="text-sm opacity-30 text-center py-12 italic text-foreground">No practice history recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {(isCreating || activeDrill) && (
          <DuelDrill
            key={activeDrill?.id || "creating"}
            duel={activeDrill}
            gamemode={selectedMode}
            isCreating={isCreating}
            sendReadyStatus={sendReadyStatus}
            completeDuel={completeDuel}
            broadcastBattleResult={broadcastBattleResult}
            sendTranscript={sendTranscript}
            broadcastAnalyzing={broadcastAnalyzing}
            sendForfeit={sendForfeit}
            handleForfeit={handleForfeit}
            onClose={() => { setActiveDrill(null); setIsCreating(false); }}
            onComplete={(score, prompt, mode, feedback) => {
              console.log("[Arena] User returning to lobby from battle.");
              if (isCreating) {
                toast({ title: "Custom Challenge Live", description: "Your challenge is waiting for a victim." });
              }
              setActiveDrill(null);
              setIsCreating(false);

              // If we have a buffered update, fire it now
              if (pendingUpdate.current) {
                console.log("[Arena] Firing buffered ELO update:", pendingUpdate.current);
                setTimeout(() => {
                  setEloUpdate(pendingUpdate.current);
                  pendingUpdate.current = null;
                  setTimeout(() => setEloUpdate(null), 4000);
                }, 500); // Small delay for layout transition
              }
            }}
          />
        )}
      </AnimatePresence>
       <AnimatePresence>
         {incomingRequests.filter(r => !r.isAcceptedChallenge).length > 0 && (
           <motion.div 
             initial={{ opacity: 0, y: 100 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 100 }}
             className="fixed bottom-12 right-12 z-[100] w-full max-w-sm"
           >
             <div className="bg-background/80 backdrop-blur-2xl border border-primary/20 rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-primary/5">
                   <p className="text-sm font-black uppercase tracking-[0.4em] text-primary flex items-center gap-2">
                     <Mic className="h-4 w-4" /> CHALLENGE INBOX
                   </p>
                   <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">{incomingRequests.filter(r => !r.isAcceptedChallenge).length}</span>
                </div>
                <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                   {incomingRequests.filter(r => !r.isAcceptedChallenge).map(req => (
                     <div key={req.id} className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center border border-border">👤</div>
                               <p className="text-sm font-bold">{req.senderName}</p>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                              <Zap className="h-3 w-3 text-primary animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary">{GAMEMODES[req.gamemode as Gamemode]?.label || req.gamemode}</span>
                            </div>
                         </div>
                         {req.prompt && (
                           <p className="speak-serif text-xs italic opacity-70 border-l-2 border-primary/30 pl-2">"{req.prompt}"</p>
                         )}
                         <div className="flex gap-2 mt-2">
                           <button 
                             onClick={() => setIncomingRequests(prev => prev.filter(r => r.id !== req.id))}
                             className="flex-1 py-2 rounded-xl bg-muted text-[10px] font-black uppercase tracking-widest hover:bg-muted/80"
                           >
                             IGNORE
                           </button>
                           <button 
                             onClick={() => handleAcceptRequest(req)}
                             className="flex-1 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-glow"
                           >
                             ACCEPT
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>

       <AnimatePresence>
         {challengeTarget && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
           >
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
               className="bg-background border border-border rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
             >
                <button onClick={() => setChallengeTarget(null)} className="absolute top-6 right-6 text-foreground/40 hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-xl font-bold mb-2">Challenge {challengeTarget.name}</h3>
                <p className="text-sm opacity-60 mb-6">Select a gamemode and optional custom prompt.</p>
                
                <div className="space-y-6">
                   <div>
                     <label className="text-xs font-black uppercase tracking-widest opacity-40 mb-3 block">Gamemode</label>
                     <div className="grid grid-cols-2 gap-3">
                       {(Object.entries(GAMEMODES) as [Gamemode, any][]).map(([mode, data]) => (
                         <button
                           key={mode}
                           onClick={() => setChallengeMode(mode)}
                           className={cn(
                             "p-3 rounded-xl border text-left transition-all flex flex-col gap-1",
                             challengeMode === mode 
                               ? "border-primary bg-primary/10" 
                               : "border-border hover:border-primary/40 bg-muted/20"
                           )}
                         >
                           <span className="text-xs font-bold uppercase tracking-wider">{data.label}</span>
                           <span className="text-[10px] opacity-60 line-clamp-1">{data.desc}</span>
                         </button>
                       ))}
                     </div>
                   </div>

                   <div>
                     <div className="flex justify-between items-center mb-3">
                       <label className="text-xs font-black uppercase tracking-widest opacity-40 block">Custom Prompt (Optional)</label>
                       <button 
                         onClick={async () => {
                           setGeneratingPrompt(true);
                           try {
                             const p = await generateArenaPrompt(challengeMode);
                             setChallengePrompt(p);
                           } catch (e) {}
                           setGeneratingPrompt(false);
                         }}
                         disabled={generatingPrompt}
                         className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest"
                       >
                         {generatingPrompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                         GENERATE
                       </button>
                     </div>
                     <textarea 
                       value={challengePrompt}
                       onChange={e => setChallengePrompt(e.target.value)}
                       placeholder="Leave blank for random prompt..."
                       className="w-full bg-muted/30 border border-border rounded-xl p-3 text-sm resize-none h-24 focus:border-primary focus:outline-none transition-colors"
                     />
                   </div>

                   <button 
                     onClick={async () => {
                        let finalPrompt = challengePrompt.trim();
                        if (!finalPrompt) {
                          setGeneratingPrompt(true);
                          try {
                            finalPrompt = await generateArenaPrompt(challengeMode);
                          } catch (e) {
                            finalPrompt = "Surprise me with your eloquence.";
                          }
                          setGeneratingPrompt(false);
                        }
                        sendDuelRequest(challengeTarget.id, challengeMode, finalPrompt);
                        setChallengeTarget(null);
                        setChallengePrompt("");
                        setChallengeMode("standard");
                     }}
                     className="w-full py-4 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-glow"
                     disabled={generatingPrompt}
                   >
                     {generatingPrompt ? (
                       <span className="flex items-center gap-2">
                         <Loader2 className="h-4 w-4 animate-spin" /> GENERATING PROMPT...
                       </span>
                     ) : "SEND CHALLENGE"}
                   </button>
                </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
    </main>
  );
};

export default Arena;
