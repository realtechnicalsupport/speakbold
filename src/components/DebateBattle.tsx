import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, MicOff, Sparkles, Loader2, AlertTriangle, Volume2, ScrollText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/hooks/useRecordings";
import { toast } from "@/hooks/use-toast";
import { judgeBattle, generateAIArgument, speakWithDeepgramTTS } from "@/services/geminiService";
import { setRecordingActive } from "@/lib/recordingState";
import { MicrophoneBorder } from "@/components/MicrophoneBorder";
import { RecorderPanel } from "@/components/RecorderPanel";
import type { Duel, Gamemode, DuelPlayer } from "@/context/ArenaContext";
import { getRankColor, getRankFromElo } from "@/hooks/arenaUtils";
import { useSoundEffects } from "@/hooks/useSoundEffects";

// ─── Web Speech API typing ───────────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

// ─── Phase machine ───────────────────────────────────────────────────────────
type DebatePhase =
  | "prep"
  | "opening-user"
  | "opening-ai"
  | "rebuttal-user"
  | "rebuttal-ai"
  | "judging"
  | "results";

const PHASE_CONFIG: Record<DebatePhase, { duration: number; label: string; speaker: "user" | "ai"; round: string; }> = {
  "prep":          { duration: 5,  label: "GET READY", speaker: "user", round: "PREP" },
  "opening-user":  { duration: 45, label: "OPENING ARGUMENT", speaker: "user", round: "ROUND 1 · 1 of 4" },
  "opening-ai":    { duration: 45, label: "OPPONENT'S OPENING", speaker: "ai",  round: "ROUND 1 · 2 of 4" },
  "rebuttal-user": { duration: 30, label: "YOUR REBUTTAL", speaker: "user", round: "ROUND 2 · 3 of 4" },
  "rebuttal-ai":   { duration: 30, label: "OPPONENT'S REBUTTAL", speaker: "ai",  round: "ROUND 2 · 4 of 4" },
  "judging":       { duration: 0,  label: "AI IS DELIBERATING", speaker: "ai",  round: "VERDICT" },
  "results":       { duration: 0,  label: "VERDICT DELIVERED", speaker: "ai",  round: "FINAL" },
};

// FOR: user opens first; AGAINST: AI (who argues FOR) opens first
const PHASE_ORDER_FOR: DebatePhase[]     = ["prep", "opening-user", "opening-ai", "rebuttal-user", "rebuttal-ai", "judging", "results"];
const PHASE_ORDER_AGAINST: DebatePhase[] = ["prep", "opening-ai", "opening-user", "rebuttal-ai", "rebuttal-user", "judging", "results"];

interface DebateBattleProps {
  prompt: string;
  userStand: "FOR" | "AGAINST";
  opponent: DuelPlayer & { persona?: any };
  userElo: number;
  onClose: () => void;
  onComplete: (score: number, prompt: string, mode: Gamemode, feedback: string) => void;
  completeDuel: (duelId: string, challengerName: string, creatorScore: number, challengerScore: number, feedback: string, duelObj: Duel, explicitWinner?: string, details?: { strengths?: string, oppStrengths?: string, oppFeedback?: string, exampleSpeech?: string }) => void;
  handleForfeit?: (duelId: string, isMe: boolean, duelObj: Duel) => Promise<void>;
}

// ─── Deepgram Aura voice pool ────────────────────────────────────────────────
// Each AI persona gets a stable unique voice derived from its name.
// Voices are ordered so the more "powerful"-sounding ones come first.
const AURA_VOICES = [
  "aura-zeus-en",      // male, powerful/commanding
  "aura-perseus-en",   // male, authoritative
  "aura-orion-en",     // male, professional
  "aura-helios-en",    // male, British/refined
  "aura-orpheus-en",   // male, warm/persuasive
  "aura-arcas-en",     // male, casual/conversational
  "aura-athena-en",    // female, authoritative
  "aura-stella-en",    // female, confident
  "aura-hera-en",      // female, warm
  "aura-asteria-en",   // female, friendly
  "aura-luna-en",      // female, calm/measured
  "aura-angus-en",     // male, Irish/distinctive
];

/** Pick a consistent Aura voice for a given persona name (stable hash). */
const getPersonaVoice = (personaName?: string): string => {
  if (!personaName) return "aura-orion-en";
  const hash = personaName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AURA_VOICES[hash % AURA_VOICES.length];
};

export const DebateBattle = ({ prompt, userStand, opponent, userElo, onClose, onComplete, completeDuel, handleForfeit }: DebateBattleProps) => {
  const { user } = useAuth();
  const { upload, refresh } = useRecordings("arena");
  const sfx = useSoundEffects();

  const oppStand = userStand === "FOR" ? "AGAINST" : "FOR";
  const phaseOrder = userStand === "AGAINST" ? PHASE_ORDER_AGAINST : PHASE_ORDER_FOR;

  // ── Phase + timer (with sessionStorage persistence for tab-discard recovery) ──
  // Recoverable phases: any user/ai speaking turn. "judging" and "results" are not restored.
  const _savedPhaseRaw = sessionStorage.getItem("debate_phase") as DebatePhase | null;
  const _savedPhaseStart = sessionStorage.getItem("debate_phase_start");
  const _validSavedPhase = (
    _savedPhaseRaw !== null &&
    _savedPhaseRaw in PHASE_CONFIG &&
    _savedPhaseRaw !== "results" &&
    _savedPhaseRaw !== "judging" &&
    _savedPhaseRaw !== "prep"
  );

  const [phase, setPhase] = useState<DebatePhase>(
    _validSavedPhase ? (_savedPhaseRaw as DebatePhase) : phaseOrder[0]
  );

  // If restoring, seed phaseStartRef from storage so the timer continues correctly.
  const phaseStartRef = useRef<number>(
    _validSavedPhase && _savedPhaseStart
      ? parseInt(_savedPhaseStart, 10)
      : Date.now()
  );

  // Flag: skip the "reset" branch of the timer effect on first mount after a restore.
  const restoredFromStorageRef = useRef(_validSavedPhase);

  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (_validSavedPhase && _savedPhaseStart) {
      const elapsed = (Date.now() - parseInt(_savedPhaseStart, 10)) / 1000;
      return Math.max(0, Math.ceil(PHASE_CONFIG[_savedPhaseRaw as DebatePhase].duration - elapsed));
    }
    return PHASE_CONFIG[phaseOrder[0]].duration;
  });

  // ── Transcripts per turn ──────────────────────────────────────────────────
  const [transcripts, setTranscripts] = useState({
    userOpening: "",
    aiOpening: "",
    userRebuttal: "",
    aiRebuttal: "",
  });
  const transcriptsRef = useRef(transcripts);
  transcriptsRef.current = transcripts;

  // ── Live user transcription state ─────────────────────────────────────────
  const [liveFinal, setLiveFinal] = useState("");
  const [liveInterim, setLiveInterim] = useState("");
  const liveFinalRef = useRef("");    // always-current copy — safe inside stale closures
  const liveInterimRef = useRef("");
  useEffect(() => { liveFinalRef.current = liveFinal; }, [liveFinal]);
  useEffect(() => { liveInterimRef.current = liveInterim; }, [liveInterim]);
  const recognitionRef = useRef<any>(null);
  const speechSupported = !!getSpeechRecognition();

  // ── AI streaming state ────────────────────────────────────────────────────
  const [aiStream, setAiStream] = useState("");
  const aiStreamRef = useRef<number | null>(null);
  const aiAbortRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null); // Deepgram Aura audio element

  // ── Phase ref — prevents stale closures inside recognition callbacks ──────
  const phaseRef = useRef<DebatePhase>(phaseOrder[0]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Results state ─────────────────────────────────────────────────────────
  const [verdict, setVerdict] = useState<any>(null);
  const [analyzeText, setAnalyzeText] = useState("REVIEWING DEBATE...");
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [micError, setMicError] = useState(false);

  // ── Recording integration (for upload to user history) ────────────────────
  const [lastRecording, setLastRecording] = useState<{ blob: Blob; durationMs: number } | null>(null);
  const recorderStartRef = useRef<() => void>();
  const recorderStopRef = useRef<() => void>();
  const wasRecording = useRef(false);
  const isClosingRef = useRef(false);
  /** Set to true when autoAdvance fires while the tab is hidden — fires on tab show. */
  const pendingAutoAdvanceRef = useRef(false);

  // ── Mic permission check ──────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(s => { setMicError(false); s.getTracks().forEach(t => t.stop()); })
      .catch(() => setMicError(true));
  }, []);

  // ── Tab-visibility guard ──────────────────────────────────────────────────
  // Goal: tab switches don't restart, revert, or skip anything.
  //  - Deepgram audio keeps playing in the background (browser allows
  //    user-initiated playback to continue) so the user hears the AI argument
  //    through tab-out
  //  - Defer autoAdvance until user is back (so transcripts aren't wiped, and
  //    the next phase isn't entered while they're not looking)
  //  - Clear stale liveInterim on return (recognition was suspended)
  //  - Force-restart speech recognition on return (Chrome stops mic in bg tabs)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) return;
      // Fire any deferred phase advance (audio ended while tab was hidden)
      if (pendingAutoAdvanceRef.current) {
        pendingAutoAdvanceRef.current = false;
        advancePhaseRef.current();
        return; // phase changed — let the new effect handle the rest
      }
      // If it's the user's turn, clear stale interim and force-restart recognition
      const isUserSpeaking = PHASE_CONFIG[phaseRef.current].speaker === "user"
        && phaseRef.current !== "judging" && phaseRef.current !== "results";
      if (isUserSpeaking) {
        // Clear the dangling interim phrase (recognition is fresh now)
        setLiveInterim("");
        // Coax recognition back to life — Chrome stops the mic on tab-hide
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (_) {}
          // onend handler will restart it after 100ms
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // ── Mark recording state globally for UI border ───────────────────────────
  useEffect(() => {
    const userTurn = PHASE_CONFIG[phase].speaker === "user" && phase !== "judging" && phase !== "results" && phase !== "prep";
    setRecordingActive(userTurn);
    return () => setRecordingActive(false);
  }, [phase]);

  // ── Start user recording when user turn starts ────────────────────────────
  useEffect(() => {
    const cfg = PHASE_CONFIG[phase];
    if (cfg.speaker === "user" && phase !== "judging" && phase !== "results" && phase !== "prep") {
      if (!wasRecording.current) {
        recorderStartRef.current?.();
        wasRecording.current = true;
      }
    } else {
      if (wasRecording.current) {
        setTimeout(() => { recorderStopRef.current?.(); wasRecording.current = false; }, 100);
      }
    }
  }, [phase]);

  // ── Live transcription: start/stop with user turns ────────────────────────
  useEffect(() => {
    if (!speechSupported) return;
    const cfg = PHASE_CONFIG[phase];
    if (cfg.speaker !== "user" || phase === "judging" || phase === "results" || phase === "prep") return;

    const SpeechRecognition = getSpeechRecognition();
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    setLiveFinal("");
    setLiveInterim("");

    let restartTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false; // set true when this effect's cleanup fires

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      if (final) setLiveFinal(prev => prev + final);
      setLiveInterim(interim);
    };

    recognition.onerror = (e: any) => {
      if (!e.error || e.error === "no-speech" || e.error === "aborted") return;
      console.warn("[Debate] Recognition error:", e.error);
    };

    recognition.onend = () => {
      // Don't restart if this effect was cleaned up or we left a user turn
      if (stopped) return;
      if (PHASE_CONFIG[phaseRef.current].speaker !== "user") return;
      // Browsers need ~100 ms between stop() and start() to avoid InvalidStateError
      restartTimer = setTimeout(() => {
        if (stopped) return;
        try { recognition.start(); } catch (err) {
          console.warn("[Debate] Recognition restart failed:", err);
        }
      }, 100);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      console.log("[Debate] Recognition started for phase:", phase);
    } catch (e) {
      console.warn("[Debate] Could not start recognition:", e);
    }

    return () => {
      stopped = true;
      recognitionRef.current = null;
      if (restartTimer) clearTimeout(restartTimer);
      try { recognition.stop(); } catch (_) {}
    };
  }, [phase, speechSupported]);

  // ── Phase timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    const cfg = PHASE_CONFIG[phase];
    if (cfg.duration === 0) return;

    if (restoredFromStorageRef.current) {
      // Continuing mid-phase after tab discard — keep saved start time & seconds
      restoredFromStorageRef.current = false;
    } else {
      // Fresh phase — reset wall-clock anchor and full duration
      phaseStartRef.current = Date.now();
      setSecondsLeft(cfg.duration);
      // Persist the new phase start to storage
      sessionStorage.setItem("debate_phase", phase);
      sessionStorage.setItem("debate_phase_start", phaseStartRef.current.toString());
    }
    sfx.resetCountdown();

    const id = window.setInterval(() => {
      const elapsed = (Date.now() - phaseStartRef.current) / 1000;
      const remaining = Math.max(0, Math.ceil(cfg.duration - elapsed));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        advancePhaseRef.current(); // always the latest — no stale closure
      }
    }, 100);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Sound: countdown ticks (3, 2, 1, 0) ──────────────────────────────────
  useEffect(() => {
    if (secondsLeft <= 3 && secondsLeft >= 0 && PHASE_CONFIG[phase].duration > 0) {
      sfx.countdownTick(secondsLeft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  // ── Sound: phase-start chime ──────────────────────────────────────────────
  useEffect(() => {
    if (phase === "judging") {
      sfx.judgingStart();
    } else if (phase !== "results" && phase !== "prep") {
      sfx.phaseStart(PHASE_CONFIG[phase].speaker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Save final transcript for the user turn that's ending ─────────────────
  // Uses refs (not state) so it's always current even when called from a stale closure.
  const captureUserTurnTranscript = useCallback(() => {
    const combined = (liveFinalRef.current + " " + liveInterimRef.current).trim();
    console.log(`[Debate] Capturing transcript for ${phaseRef.current}: "${combined.slice(0, 80)}..."`);
    setTranscripts(prev => {
      const next = { ...prev };
      if (phaseRef.current === "opening-user") next.userOpening = combined;
      if (phaseRef.current === "rebuttal-user") next.userRebuttal = combined;
      return next;
    });
  }, []);

  // ── Advance phase (with side effects per transition) ──────────────────────
  // advancePhaseRef keeps the timer's setInterval from holding a stale closure.
  const advancePhaseRef = useRef<() => void>(() => {});
  const advancePhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx === -1 || idx >= phaseOrder.length - 1) return;
    const nextPhase = phaseOrder[idx + 1];

    // If we're leaving a user turn, capture their transcript
    if (PHASE_CONFIG[phase].speaker === "user" && phase !== "judging" && phase !== "results") {
      captureUserTurnTranscript();
    }

    setLiveFinal("");
    setLiveInterim("");
    aiAbortRef.current = true; // stop any ongoing AI streaming
    if (aiStreamRef.current) clearTimeout(aiStreamRef.current);
    setAiStream("");

    setPhase(nextPhase);

    if (nextPhase === "judging") {
      runJudging();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, liveFinal, liveInterim]);

  // Keep the ref pointing at the latest advancePhase so the timer doesn't go stale
  useEffect(() => { advancePhaseRef.current = advancePhase; }, [advancePhase]);

  // ── End-turn button (advance early) ───────────────────────────────────────
  const handleEndTurn = () => {
    advancePhase();
  };

  // ── AI turn: generate + stream argument ───────────────────────────────────
  useEffect(() => {
    const cfg = PHASE_CONFIG[phase];
    if (cfg.speaker !== "ai" || phase === "judging" || phase === "results") return;

    aiAbortRef.current = false;
    setAiStream("");

    const runAITurn = async () => {
      const myStand = oppStand;

      // ── Topic-aware fallback (used if generation fails) ─────────────────
      const makeFallback = (): string => {
        const stance = myStand === "FOR" ? "in favour of" : "against";
        const contrary = myStand === "FOR" ? "against" : "in favour of";
        const topicShort = prompt.replace(/^this house believes\s*/i, "").replace(/^that\s*/i, "");
        const openingPool = [
          `I stand firmly ${stance} the proposition that ${topicShort}. When you look at the evidence — historical, empirical, and practical — the conclusion is clear. Those who argue ${contrary} are working from assumptions that don't survive contact with reality.`,
          `My position is ${stance} "${topicShort}" — and the reasoning is straightforward. The alternative my opponent will offer sounds reasonable on the surface. But once you examine what it actually requires, and what it ignores, the cracks become impossible to miss.`,
          `The motion before us — ${topicShort} — is not a close call. I argue ${stance} it because the people and systems most affected by this question are consistently better off when we take this position. The data, the logic, and the real-world outcomes all point the same way.`,
        ];
        const rebuttalPool = [
          `My opponent raised some points about "${topicShort}" — but notice what they carefully avoided: the strongest version of my argument. I'll address what they said, and then I'll show you why the core of their position falls apart.`,
          `I've listened to the case ${contrary} my view on "${topicShort}". The problem is that their argument proves too much. If we accepted their logic, it would also mean accepting conclusions they would never defend. That tells us something important about where their reasoning breaks down.`,
          `The response from the other side missed the central issue. We're not debating whether "${topicShort}" has any downsides — of course it does. We're debating whether those downsides outweigh the alternative. And on that question, my opponent gave you nothing.`,
        ];
        const pool = phase === "opening-ai" ? openingPool : rebuttalPool;
        return pool[Math.floor(Math.random() * pool.length)];
      };

      // ── 1. Generate (or fall back to a topic-aware template) ────────────
      let aiPrompt = "";
      if (phase === "opening-ai") {
        aiPrompt = `${prompt}\n\n(You are arguing ${myStand} this topic. Open with a bold, direct claim about the topic — do NOT start with "My opponent", "I take the", "I stand", or any meta-commentary. State your position as a confident fact, then give 1-2 tight supporting reasons. Keep it natural and conversational. Maximum 100 words.)`;
      } else if (phase === "rebuttal-ai") {
        // FOR  order: prep → opening-user → opening-ai → rebuttal-user → rebuttal-ai
        //   → user's most recent turn before us is their REBUTTAL. We address THAT, not their opening.
        //   Falling back to userOpening would mean re-litigating Round 1, which is what the user
        //   complained about.
        // AGAINST order: prep → opening-ai → opening-user → rebuttal-ai → rebuttal-user
        //   → user has only given their opening at this point. It IS their most recent turn.
        const prevUserSpeech = userStand === "FOR"
          ? (transcriptsRef.current.userRebuttal || "")
          : (transcriptsRef.current.userOpening || "");
        const trimmedSpeech = prevUserSpeech.trim();
        // Anything under ~20 chars is silence, a single filler word, or an
        // unintelligible interim phrase — not enough to rebut. Fall back to a
        // closing statement that reinforces our own case instead of inventing
        // strawmen or re-attacking an earlier turn.
        const hasRealResponse = trimmedSpeech.length >= 20;
        console.log(`[Debate] rebuttal-ai source: userStand=${userStand}, hasRealResponse=${hasRealResponse}, len=${trimmedSpeech.length}, preview="${trimmedSpeech.slice(0, 60)}..."`);

        if (hasRealResponse) {
          aiPrompt = `${prompt}\n\n(You are arguing ${myStand} this topic. The other side just argued: "${trimmedSpeech.slice(0, 400)}". Directly address and rebut those specific points — quote or paraphrase what they actually said, then explain why it doesn't hold up. End by reinforcing your own position. Do NOT open with "My opponent", "My opponent said", or any phrase that references them by name or role. Start with your own assertion. Keep it natural and conversational. Maximum 80 words.)`;
        } else {
          aiPrompt = `${prompt}\n\n(You are arguing ${myStand} this topic. The other side gave no substantive response to rebut, so deliver a tight CLOSING STATEMENT instead: restate your strongest point in a new way, add one fresh piece of evidence or angle you haven't used yet, and close with a memorable line. Do NOT mention that they didn't respond. Do NOT open with "My opponent". Start with your own assertion. Keep it natural and conversational. Maximum 80 words.)`;
        }
      }

      let argument: string;
      try {
        argument = await generateAIArgument(aiPrompt, cfg.duration, "debate", opponent.persona);
      } catch (e) {
        console.error("[Debate] AI argument generation failed, using topic-aware fallback:", e);
        argument = makeFallback();
      }
      if (aiAbortRef.current) return;

      // Save full transcript immediately so the judge always has the text
      setTranscripts(prev => ({
        ...prev,
        ...(phase === "opening-ai" ? { aiOpening: argument } : { aiRebuttal: argument })
      }));

      // ── 2. Helpers ──────────────────────────────────────────────────────
      // Wall-clock-driven streaming: text position is computed from elapsed time,
      // not incremented per tick. This means on tab return (after Chrome throttles
      // setTimeout to 1Hz on hidden tabs), the next tick jumps the text to where it
      // SHOULD be, instead of slowly catching up — no visible "revert" effect.
      const startStreaming = (estimatedDurationMs: number) => {
        const totalChars = argument.length;
        const startedAt = Date.now();
        const tick = () => {
          if (aiAbortRef.current) return;
          const elapsed = Date.now() - startedAt;
          const fraction = Math.min(1, elapsed / Math.max(1, estimatedDurationMs));
          const i = Math.floor(totalChars * fraction);
          setAiStream(argument.slice(0, i));
          if (i < totalChars) {
            aiStreamRef.current = window.setTimeout(tick, 40); // ~25Hz when visible
          } else {
            setAiStream(argument); // ensure full text is shown at the end
          }
        };
        tick();
      };

      const autoAdvance = () => {
        // Only advance if we're still on this AI turn (not already moved on)
        if (aiAbortRef.current) return;
        if (PHASE_CONFIG[phaseRef.current].speaker !== "ai") return;
        if (phaseRef.current === "judging" || phaseRef.current === "results") return;
        // If the tab is hidden, defer until the user comes back.
        // SpeechSynthesis fires "onend" when Chrome pauses it on tab-hide — we must
        // not advance the phase then or both transcripts get wiped.
        if (document.hidden) {
          console.log(`[Debate] autoAdvance deferred (tab hidden), will fire on tab show`);
          pendingAutoAdvanceRef.current = true;
          return;
        }
        console.log(`[Debate] AI finished speaking, auto-advancing from ${phaseRef.current}`);
        advancePhaseRef.current();
      };

      // ── 3. TTS: Deepgram Aura → browser SpeechSynthesis fallback ────────
      // Cancel anything currently playing first
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      window.speechSynthesis.cancel();

      const voice = getPersonaVoice(opponent.persona?.name);
      try {
        const audio = await speakWithDeepgramTTS(argument, voice);
        if (aiAbortRef.current) { audio.pause(); return; }
        audioRef.current = audio;

        // Wait for metadata so we can match streaming pace to true audio length
        await new Promise<void>((resolve) => {
          if (audio.readyState >= 1) resolve();
          else {
            audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
            // Safety timeout — don't block forever
            setTimeout(() => resolve(), 1500);
          }
        });
        if (aiAbortRef.current) { audio.pause(); return; }

        const durationMs = (audio.duration && isFinite(audio.duration) ? audio.duration : cfg.duration) * 1000;
        startStreaming(durationMs);

        // When real audio finishes, end the AI turn immediately
        audio.addEventListener("ended", autoAdvance, { once: true });
        // Also handle play errors (e.g. autoplay blocked) so the turn doesn't stall
        audio.addEventListener("error", autoAdvance, { once: true });

        audio.play().catch(err => {
          console.warn("[Debate] audio.play() rejected (autoplay blocked?):", err);
          autoAdvance();
        });
      } catch (ttsErr) {
        console.warn("[Debate] Deepgram TTS failed, falling back to browser SpeechSynthesis:", ttsErr);

        // Estimate ~17 chars/sec for browser TTS at rate 1.05 — used only to pace text streaming
        const estimatedMs = Math.max(5000, Math.min(60000, argument.length * 60));
        startStreaming(estimatedMs);

        const utterance = new SpeechSynthesisUtterance(argument);
        utterance.rate = 1.05;
        utterance.pitch = opponent.persona?.skill === "Expert" ? 0.85 : 1.05;
        utterance.onend = autoAdvance;
        utterance.onerror = autoAdvance;
        window.speechSynthesis.speak(utterance);
      }
    };

    runAITurn();

    return () => {
      aiAbortRef.current = true;
      pendingAutoAdvanceRef.current = false; // cancel any deferred advance
      if (aiStreamRef.current) clearTimeout(aiStreamRef.current);
      // Stop Deepgram audio and fall back gracefully
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Final judging ─────────────────────────────────────────────────────────
  const runJudging = async () => {
    setAnalyzeText("ASSEMBLING DEBATE TRANSCRIPT...");
    await new Promise(r => setTimeout(r, 400));

    const t = transcriptsRef.current;
    const userFull = `OPENING:\n${t.userOpening || "(no opening)"}\n\nREBUTTAL:\n${t.userRebuttal || "(no rebuttal)"}`;
    const aiFull = `OPENING:\n${t.aiOpening || "(no opening)"}\n\nREBUTTAL:\n${t.aiRebuttal || "(no rebuttal)"}`;

    const userTotalLen = (t.userOpening + t.userRebuttal).trim().length;
    if (userTotalLen < 20) {
      setVerdict({
        score: 0, oppScore: 50,
        feedback: "We couldn't capture enough of your speech to judge. Check your microphone and try again.",
        oppFeedback: "Your opponent argued their case clearly.",
        won: false,
        strengths: "Showed up to the debate.",
        oppStrengths: "Clarity, Structure",
        exampleSpeech: "",
      });
      setPhase("results");
      return;
    }

    setAnalyzeText("AI IS WEIGHING THE ARGUMENTS...");

    const userName = user?.email?.split("@")[0] || "You";
    const oppName = opponent.name;
    const judgePrompt = `DEBATE TOPIC: "${prompt}"\n\n${userName} argued ${userStand}.\n${oppName} argued ${oppStand}.\n\nThis was a turn-based debate. Judge each speaker on the strength of their opening AND how well they engaged with the opponent's points in the rebuttal.`;

    try {
      const result = await judgeBattle(userName, userFull, judgePrompt, oppName, aiFull);
      const won = result.winner === "you";

      const synthDuel: Duel = {
        id: `debate-${Date.now()}`,
        prompt,
        gamemode: "debate",
        creator: {
          id: user?.id,
          name: userName,
          avatar: "👤",
          elo: userElo,
          rank: getRankFromElo(userElo),
          score: result.score,
        },
        challenger: {
          id: "ai",
          name: oppName,
          avatar: opponent.avatar,
          elo: 0,
          rank: opponent.rank,
          score: result.oppScore ?? 0,
        },
        status: "completed",
        winner: result.winner ?? null,
        feedback: result.feedback,
        timestamp: Date.now(),
      };

      completeDuel(
        synthDuel.id,
        userName,
        result.score,
        result.oppScore ?? 0,
        result.feedback,
        synthDuel,
        result.winner,
        {
          strengths: result.strengths,
          oppStrengths: result.oppStrengths,
          oppFeedback: result.oppFeedback,
          exampleSpeech: result.exampleSpeech,
        }
      );

      setVerdict({
        score: result.score,
        oppScore: result.oppScore,
        feedback: result.feedback,
        oppFeedback: result.oppFeedback,
        won,
        strengths: result.strengths,
        oppStrengths: result.oppStrengths,
        exampleSpeech: result.exampleSpeech,
      });
      // Play win or loss sound before showing results
      if (won) sfx.win(); else sfx.loss();
      setPhase("results");
    } catch (e: any) {
      // judgeBattle now has its own local fallback, so this branch should be very rare.
      // If we somehow still get here, show a minimal result rather than ejecting.
      console.error("[Debate] Judging failed unexpectedly:", e);
      toast({ title: "Scoring unavailable", description: "Could not reach the AI judge. Showing a participation result.", variant: "destructive" });
      setVerdict({
        score: 50, oppScore: 50, won: false,
        feedback: "The AI judge was unreachable. Both debaters receive participation credit.",
        oppFeedback: "The AI judge was unreachable.",
        strengths: "Participation", oppStrengths: "Participation", exampleSpeech: "",
      });
      sfx.loss();
      setPhase("results");
    }
  };

  // ── Clear debate storage when results are shown (battle is done) ─────────
  useEffect(() => {
    if (phase === "results") {
      sessionStorage.removeItem("debate_phase");
      sessionStorage.removeItem("debate_phase_start");
    }
  }, [phase]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    try { recognitionRef.current?.stop(); } catch (_) {}
    if (aiStreamRef.current) clearTimeout(aiStreamRef.current);
    setRecordingActive(false);
  }, []);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const cfg = PHASE_CONFIG[phase];
  const isUserTurn = cfg.speaker === "user";
  const showResults = phase === "results" && verdict;
  const showJudging = phase === "judging";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] glass overflow-y-auto overflow-x-hidden scrollbar-hide text-foreground flex flex-col"
    >
      {/* Top progress bar (per phase) */}
      {!showResults && !showJudging && phase !== "prep" && cfg.duration > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted z-20">
          <motion.div
            className={cn("h-full transition-colors", secondsLeft <= 5 ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]" : "bg-primary shadow-[0_0_20px_rgba(var(--primary),0.6)]")}
            initial={{ width: "100%" }}
            animate={{ width: `${(secondsLeft / cfg.duration) * 100}%` }}
            transition={{ duration: 0.15 }}
          />
        </div>
      )}

      {/* Header */}
      <div className="px-3 md:px-12 pt-4 lg:pt-8 pb-3 lg:pb-4 flex items-center justify-between gap-2 border-b border-border/40 backdrop-blur-md bg-background/30 sticky top-0 z-10">
        <button
          onClick={() => (showResults ? onClose() : setShowAbandonConfirm(true))}
          aria-label="Leave debate"
          className="flex items-center gap-1.5 text-xs lg:text-sm font-semibold text-foreground/60 hover:text-primary transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Leave</span>
        </button>

        <div className="text-center min-w-0 flex-1">
          <p className="text-[9px] lg:text-[10px] font-semibold text-primary/70 truncate">{cfg.round}</p>
          <p className="text-xs lg:text-sm font-bold mt-0.5 truncate">{cfg.label}</p>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] lg:text-xs font-semibold py-1 px-2 lg:px-3 rounded-full border border-border bg-background/50 shrink-0">
          {micError ? <MicOff className="h-3 w-3 text-red-500" /> : <Mic className="h-3 w-3 text-green-500 animate-pulse" />}
          <span className={micError ? "text-red-500" : "text-green-500"}>{micError ? "Off" : "Live"}</span>
        </div>
      </div>

      {/* Topic */}
      <div className="px-4 md:px-12 py-4 lg:py-6 max-w-5xl mx-auto w-full text-center">
        <p className="text-[10px] lg:text-xs font-semibold text-primary/60 mb-2 lg:mb-3">Topic</p>
        <p className="speak-serif text-lg md:text-3xl italic leading-snug tracking-tight">"{prompt}"</p>
      </div>

      {/* PREP SCREEN */}
      {phase === "prep" && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8">
          <div className="text-center space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/50">Your stance</p>
            <div className={cn(
              "inline-flex items-center gap-2 px-5 py-2 rounded-full border text-xs font-black uppercase tracking-widest",
              userStand === "FOR"
                ? "text-green-500 border-green-500/30 bg-green-500/10"
                : "text-red-500 border-red-500/30 bg-red-500/10"
            )}>
              {userStand === "FOR" ? "Arguing FOR" : "Arguing AGAINST"}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={secondsLeft}
              initial={{ scale: 1.5, opacity: 0, y: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="speak-serif leading-none font-black tabular-nums text-foreground"
              style={{ fontSize: "9rem" }}
            >
              {secondsLeft}
            </motion.div>
          </AnimatePresence>

          <button
            onClick={() => advancePhaseRef.current()}
            className="button-pill px-8 py-3 bg-primary text-white shadow-glow hover:scale-[1.02] active:scale-95 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
          >
            I&apos;m ready <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* JUDGING SCREEN */}
      {showJudging && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
          <div className="relative mb-6 md:mb-8">
            <ScrollText className="h-12 w-12 md:h-16 md:w-16 text-primary animate-pulse" />
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping" />
          </div>
          <h2 className="speak-serif text-2xl md:text-4xl italic tracking-tighter animate-pulse mb-3 text-center">{cfg.label}</h2>
          <p className="text-[10px] font-black uppercase tracking-widest md:tracking-[0.4em] text-primary text-center">{analyzeText}</p>
        </div>
      )}

      {/* RESULTS SCREEN */}
      {showResults && verdict && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto w-full px-4 md:px-8 py-6 md:py-8 space-y-4 md:space-y-6"
        >
          <div className="text-center">
            <h2 className={cn("text-xs md:text-sm font-black uppercase tracking-widest md:tracking-[0.6em] mb-4",
              verdict.score === verdict.oppScore ? "text-yellow-500" :
              verdict.won ? "text-green-500" : "text-red-500")}>
              {verdict.score === verdict.oppScore ? "TIE" : verdict.won ? "You won the debate" : "You lost the debate"}
            </h2>
            <div className="flex justify-center items-center gap-4 md:gap-8">
              <div className="text-center min-w-0">
                <p className="text-[10px] md:text-xs opacity-40 uppercase tracking-widest font-black mb-1 md:mb-2 truncate">You ({userStand})</p>
                <p className={cn("speak-serif text-5xl md:text-7xl italic", verdict.won ? "text-foreground font-black" : "opacity-40")}>{verdict.score}</p>
              </div>
              <span className="text-xs opacity-20 uppercase tracking-widest font-black shrink-0">VS</span>
              <div className="text-center min-w-0">
                <p className="text-[10px] md:text-xs opacity-40 uppercase tracking-widest font-black mb-1 md:mb-2 truncate">{opponent.name} ({oppStand})</p>
                <p className={cn("speak-serif text-5xl md:text-7xl italic", !verdict.won && verdict.score !== verdict.oppScore ? "text-foreground font-black" : "opacity-40")}>{verdict.oppScore}</p>
              </div>
            </div>
          </div>

          <div className="bg-muted/20 border border-border rounded-2xl p-4 md:p-6">
            <p className="text-[10px] md:text-sm font-black uppercase tracking-widest md:tracking-[0.4em] text-primary mb-2 md:mb-3">AI Verdict</p>
            <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap">{verdict.feedback}</p>
          </div>

          {/* Full debate transcript */}
          <div className="bg-background/30 border border-border rounded-2xl p-4 md:p-6 space-y-3 md:space-y-4">
            <p className="text-[10px] md:text-sm font-black uppercase tracking-widest md:tracking-[0.4em] text-primary">Transcript</p>
            {[
              { label: `You · Opening (${userStand})`, text: transcripts.userOpening, mine: true },
              { label: `${opponent.name} · Opening (${oppStand})`, text: transcripts.aiOpening, mine: false },
              { label: `You · Rebuttal`, text: transcripts.userRebuttal, mine: true },
              { label: `${opponent.name} · Rebuttal`, text: transcripts.aiRebuttal, mine: false },
            ].map((t, i) => (
              <div key={i} className={cn("p-3 rounded-xl border-l-2", t.mine ? "border-primary bg-primary/5" : "border-amber-500/40 bg-amber-500/5")}>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">{t.label}</p>
                <p className="text-sm opacity-80 italic leading-relaxed">{t.text || "(no speech captured)"}</p>
              </div>
            ))}
          </div>

          <button
            id="tutorial-close-drill"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("speakbold:drill-complete"));
              onComplete(verdict.score, prompt, "debate", verdict.feedback);
            }}
            className="w-full mt-2 md:mt-4 py-4 md:py-5 bg-primary text-white rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest md:tracking-[0.4em] hover:scale-[1.02] active:scale-95 transition-all shadow-glow"
          >
            Back to Arena
          </button>
        </motion.div>
      )}

      {/* DEBATE STAGE — two podiums */}
      {!showResults && !showJudging && phase !== "prep" && (() => {
        // The "previous turn" surfaces on each podium when its speaker isn't
        // active. We want it to reflect the SPEAKER'S most recent finished
        // turn, not always the opening — otherwise the rebuttal-ai screen
        // shows the user their Round 1 transcript while their just-spoken
        // rebuttal disappears.
        let userPrevText = "";
        let userPrevLabel = "Your opening";
        if (phase === "rebuttal-user") {
          userPrevText = transcripts.userOpening;
        } else if (phase === "rebuttal-ai") {
          if (userStand === "FOR" && transcripts.userRebuttal) {
            userPrevText = transcripts.userRebuttal;
            userPrevLabel = "Your rebuttal";
          } else {
            // AGAINST order: user has only spoken their opening at this point.
            // FOR order with empty rebuttal: fall back to opening for context.
            userPrevText = transcripts.userOpening;
          }
        }

        let aiPrevText = "";
        let aiPrevLabel = "Their opening";
        if (phase === "rebuttal-user" || phase === "rebuttal-ai") {
          // Mirror logic: in AGAINST order, the AI just gave their rebuttal
          // before rebuttal-user fires, so show that. In FOR order the AI's
          // only prior turn at rebuttal-user is their opening.
          if (oppStand === "FOR" && phase === "rebuttal-user" && transcripts.aiRebuttal) {
            aiPrevText = transcripts.aiRebuttal;
            aiPrevLabel = "Their rebuttal";
          } else {
            aiPrevText = transcripts.aiOpening;
          }
        }

        return (
        <div className="flex-1 px-3 md:px-12 py-3 md:py-6 max-w-6xl mx-auto w-full flex flex-col">
          <div className="grid md:grid-cols-2 gap-3 md:gap-6 flex-1">
            {/* USER PODIUM */}
            <Podium
              who="user"
              name="YOU"
              stand={userStand}
              isActive={isUserTurn}
              avatar="👤"
              previousText={userPrevText}
              previousLabel={userPrevLabel}
              liveText={isUserTurn ? liveFinal : ""}
              interimText={isUserTurn ? liveInterim : ""}
              currentText={isUserTurn ? "" : ""}
              speechSupported={speechSupported}
            />
            {/* AI PODIUM */}
            <Podium
              who="ai"
              name={opponent.name}
              stand={oppStand}
              isActive={!isUserTurn}
              avatar={opponent.avatar}
              previousText={aiPrevText}
              previousLabel={aiPrevLabel}
              liveText=""
              interimText=""
              currentText={!isUserTurn ? aiStream : ""}
              speechSupported={true}
            />
          </div>

          {/* Bottom control bar */}
          <div className="mt-4 md:mt-6 flex items-center justify-center gap-4 pb-2">
            <div className={cn(
              "speak-serif text-4xl md:text-6xl font-bold tabular-nums transition-colors duration-300",
              secondsLeft <= 5 ? "text-red-500 drop-shadow-[0_0_24px_rgba(239,68,68,0.7)]" : "text-foreground"
            )}>
              {secondsLeft}<span className="text-base md:text-lg opacity-30 ml-1">s</span>
            </div>
            {isUserTurn && (
              <button
                onClick={handleEndTurn}
                className="button-pill px-6 md:px-8 py-3 md:py-4 bg-primary text-white shadow-glow hover:scale-[1.02] active:scale-95 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                End turn
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {!isUserTurn && (
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                <Volume2 className="h-3 w-3 animate-pulse" />
                Listening…
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* Hidden recorder for uploading user audio to history */}
      {user && (
        <div className="opacity-0 pointer-events-none absolute">
          <RecorderPanel
            externalRunning={isUserTurn}
            recorderStartRef={fn => { recorderStartRef.current = fn; }}
            recorderStopRef={fn => { recorderStopRef.current = fn; }}
            onRecorded={async (rec) => {
              setLastRecording(rec);
              if (user) {
                await upload(rec.blob, {
                  promptText: `Debate (${phase}): ${prompt}`,
                  difficulty: "Debate",
                  durationMs: rec.durationMs,
                  targetSeconds: cfg.duration,
                });
                refresh();
              }
            }}
          />
        </div>
      )}

      {/* Abandon dialog */}
      <AnimatePresence>
        {showAbandonConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-muted border border-border rounded-[2rem] p-8 max-w-md w-full text-center space-y-6 shadow-2xl"
            >
              <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="speak-serif text-2xl italic">Forfeit the debate?</h3>
              <p className="text-xs font-medium opacity-50 leading-relaxed">
                Leaving mid-debate counts as a forfeit. Your AI opponent wins by default.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    isClosingRef.current = true;
                    if (handleForfeit) {
                      const userName = user?.email?.split("@")[0] || "You";
                      const duelId = `debate-forfeit-${Date.now()}`;
                      const forfeitDuel: Duel = {
                        id: duelId,
                        prompt,
                        gamemode: "debate",
                        creator: { id: user?.id, name: userName, avatar: "👤", elo: userElo, rank: getRankFromElo(userElo), score: null },
                        challenger: { id: "ai", name: opponent.name, avatar: opponent.avatar, elo: opponent.elo, rank: opponent.rank, score: null },
                        status: "open",
                        winner: null,
                        feedback: null,
                        timestamp: Date.now(),
                      };
                      await handleForfeit(duelId, true, forfeitDuel);
                    }
                    onClose();
                  }}
                  className="button-pill py-3 bg-transparent text-foreground/50 border border-border/50 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-[10px] font-black uppercase tracking-wide"
                >
                  FORFEIT
                </button>
                <button
                  onClick={() => setShowAbandonConfirm(false)}
                  className="text-[10px] font-black uppercase tracking-wide opacity-40 hover:opacity-100 transition-opacity py-2"
                >
                  STAY IN DEBATE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MicrophoneBorder />
    </motion.div>
  );
};

// ─── Podium subcomponent ─────────────────────────────────────────────────────
interface PodiumProps {
  who: "user" | "ai";
  name: string;
  stand: "FOR" | "AGAINST";
  isActive: boolean;
  avatar: string;
  previousText: string;
  previousLabel: string;
  liveText: string;       // finalized live speech (user only)
  interimText: string;    // in-progress live speech (user only)
  currentText: string;    // AI streaming text
  speechSupported: boolean;
}

const Podium = ({ who, name, stand, isActive, avatar, previousText, previousLabel, liveText, interimText, currentText, speechSupported }: PodiumProps) => {
  const standColor = stand === "FOR" ? "text-green-500 border-green-500/30 bg-green-500/5" : "text-red-500 border-red-500/30 bg-red-500/5";

  return (
    <motion.div
      animate={{
        scale: isActive ? 1 : 0.97,
        opacity: isActive ? 1 : 0.55,
      }}
      transition={{ type: "spring", stiffness: 250, damping: 25 }}
      className={cn(
        "rounded-2xl md:rounded-3xl border-2 p-4 md:p-6 flex flex-col relative overflow-hidden transition-colors duration-500 min-h-[180px] md:min-h-[380px]",
        isActive
          ? "border-primary bg-card shadow-[0_0_40px_rgba(var(--primary),0.15)]"
          : "border-border/50 bg-muted/10"
      )}
    >
      {/* Ambient mic pulse for active speaker */}
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          animate={{ boxShadow: ["inset 0 0 0 0 rgba(var(--primary),0)", "inset 0 0 40px 0 rgba(var(--primary),0.15)", "inset 0 0 0 0 rgba(var(--primary),0)"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <div className={cn(
            "h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center text-lg md:text-xl border shrink-0",
            isActive ? "border-primary" : "border-border"
          )}>
            {avatar}
          </div>
          <div>
            <p className="text-[11px] md:text-xs font-black uppercase tracking-widest">{name}</p>
            <p className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded inline-block mt-0.5 border", standColor)}>
              {stand}
            </p>
          </div>
        </div>
        {isActive ? (
          <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary">
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1, repeat: Infinity }} className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary" />
            Speaking
          </div>
        ) : (
          <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30">Waiting</div>
        )}
      </div>

      {/* Body — live transcript / streaming text / previous turn */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {isActive ? (
          who === "user" ? (
            // User active: show live transcription
            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 scrollbar-hide">
              {speechSupported ? (
                <p className="text-xs md:text-sm leading-relaxed">
                  <span className="opacity-90">{liveText}</span>
                  <span className="opacity-40 italic">{interimText}</span>
                  {!liveText && !interimText && (
                    <span className="opacity-30 italic">Start speaking — your words appear here in real time…</span>
                  )}
                </p>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  <p className="text-xs opacity-50 italic leading-relaxed">
                    Live transcription not supported in this browser. Speak now — audio is being recorded.
                  </p>
                  <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary">
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Recording
                  </div>
                </div>
              )}
            </div>
          ) : (
            // AI active: streaming text
            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 scrollbar-hide">
              <p className="text-xs md:text-sm leading-relaxed">
                <span className="opacity-90">{currentText}</span>
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-0.5 h-3.5 md:h-4 bg-primary align-middle ml-0.5"
                />
                {!currentText && (
                  <span className="opacity-30 italic">Opponent is thinking…</span>
                )}
              </p>
            </div>
          )
        ) : (
          // Inactive: show their previous turn if any
          previousText ? (
            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 scrollbar-hide space-y-1 md:space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{previousLabel}</p>
              <p className="text-xs md:text-sm opacity-60 italic leading-relaxed">"{previousText}"</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs opacity-30 italic text-center">Waiting…</p>
            </div>
          )
        )}
      </div>
    </motion.div>
  );
};
