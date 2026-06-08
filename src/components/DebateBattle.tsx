import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, MicOff, Sparkles, Loader2, AlertTriangle, Volume2, ScrollText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/hooks/useRecordings";
import { toast } from "@/hooks/use-toast";
import { judgeDebate, generateAIArgument, speakWithDeepgramTTS, onAIStatus, transcribeAudio } from "@/services/geminiService";
import { setRecordingActive } from "@/lib/recordingState";
import { setTimerActive } from "@/lib/timerState";
import { isMobileDevice } from "@/lib/isMobileDevice";
import { MicrophoneBorder } from "@/components/MicrophoneBorder";
import { RecorderPanel } from "@/components/RecorderPanel";
import { SpamButton } from "@/components/SpamButton";
import type { Duel, Gamemode, DuelPlayer } from "@/context/ArenaContext";
import { getRankColor, getRankFromElo, FORFEIT_PENALTY } from "@/hooks/arenaUtils";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { arenaEmitter, type ArenaEvents } from "@/lib/events";
import {
  type DebatePhase,
  phaseOrderFor,
  turnNameOf,
  speakerOf,
  speakingOrder,
  turnLabel as turnLabelOf,
  userOpensFirst as userOpensFirstOf,
} from "@/lib/debateSync";

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
// DebatePhase, the FOR/AGAINST phase orders, and the pure turn/label/sync
// helpers now live in @/lib/debateSync (unit-tested). PHASE_CONFIG stays here
// because it carries UI-only data (durations + display labels).
const PHASE_CONFIG: Record<DebatePhase, { duration: number; label: string; speaker: "user" | "ai"; round: string; }> = {
  "prep":          { duration: 5,  label: "GET READY", speaker: "user", round: "PREP" },
  "opening-user":  { duration: 45, label: "OPENING ARGUMENT", speaker: "user", round: "ROUND 1 · 1 of 4" },
  "opening-ai":    { duration: 45, label: "OPPONENT'S OPENING", speaker: "ai",  round: "ROUND 1 · 2 of 4" },
  "rebuttal-user": { duration: 30, label: "YOUR REBUTTAL", speaker: "user", round: "ROUND 2 · 3 of 4" },
  "rebuttal-ai":   { duration: 30, label: "OPPONENT'S REBUTTAL", speaker: "ai",  round: "ROUND 2 · 4 of 4" },
  "judging":       { duration: 0,  label: "AI IS DELIBERATING", speaker: "ai",  round: "VERDICT" },
  "results":       { duration: 0,  label: "VERDICT DELIVERED", speaker: "ai",  round: "FINAL" },
};

interface DebateBattleProps {
  prompt: string;
  userStand: "FOR" | "AGAINST";
  opponent: DuelPlayer & { persona?: any };
  userElo: number;
  onClose: () => void;
  onComplete: (score: number, prompt: string, mode: Gamemode, feedback: string) => void;
  completeDuel: (duelId: string, challengerName: string, creatorScore: number, challengerScore: number, feedback: string, duelObj: Duel, explicitWinner?: string, details?: { strengths?: string, oppStrengths?: string, oppFeedback?: string, exampleSpeech?: string }) => void;
  handleForfeit?: (duelId: string, isMe: boolean, duelObj: Duel) => Promise<void>;
  /**
   * Where this debate is being played.
   * - "arena" (default): ranked match. Forfeit costs ELO, completion records
   *   a duel row + moves ELO via completeDuel.
   * - "pathway": curriculum drill. No ELO movement either way. Forfeit just
   *   closes the drill (no penalty), judging skips completeDuel and only
   *   fires onComplete so usePathway marks the lesson as done.
   */
  mode?: "arena" | "pathway";
  /**
   * Present ONLY for a live PvP debate (two humans). When absent the debate is
   * PvE (vs an AI persona) and behaves exactly as before — every PvP code path
   * is guarded by the presence of this object, so the AI flow is untouched.
   *
   * The host (challenge sender / duel creator) argues FOR and opens; the peer
   * argues AGAINST. The opponent's turns are driven by realtime broadcasts
   * instead of AI generation: the watcher reads the speaker's streamed
   * transcript and both clients advance on the speaker's `turn-end` signal. The
   * host runs the judge and broadcasts the verdict; the peer mirrors it — the
   * same host-authoritative pattern DuelDrill uses for standard PvP duels.
   */
  peer?: {
    duelId: string;
    isHost: boolean;
    opponentId: string;
    sendDebateLive: (duelId: string, turn: "opening" | "rebuttal", text: string) => void;
    sendDebateTurnEnd: (duelId: string, turn: "opening" | "rebuttal", transcript: string) => void;
    broadcastBattleResult: (duelId: string, results: any) => void;
    sendForfeit: (duelId: string) => void;
  };
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

/**
 * Persisted debate state lives under these keys. Centralised so forfeit,
 * intentional close, and the natural results path all clear the same set
 * — previously the forfeit path only zeroed some of them, and the next
 * battle would resume mid-rebuttal on the wrong topic.
 */
const DEBATE_STORAGE_KEYS = [
  "debate_phase",
  "debate_phase_start",
  "debate_transcripts",
  "debate_identity", // prompt|opponent fingerprint — used to reject stale restores
] as const;

function clearDebateStorage() {
  for (const k of DEBATE_STORAGE_KEYS) sessionStorage.removeItem(k);
}

/** Stable fingerprint for a debate session — used to detect stale storage from a previous match. */
function debateIdentity(prompt: string, opponentName: string): string {
  return `${prompt}|${opponentName}`;
}

export const DebateBattle = ({ prompt, userStand, opponent, userElo, onClose, onComplete, completeDuel, handleForfeit, mode = "arena", peer }: DebateBattleProps) => {
  const isPathway = mode === "pathway";
  const isPeer = !!peer;
  const { user } = useAuth();
  const { upload, refresh } = useRecordings("arena");
  const sfx = useSoundEffects();

  const oppStand = userStand === "FOR" ? "AGAINST" : "FOR";
  const phaseOrder = phaseOrderFor(userStand);

  // ── Phase + timer (with sessionStorage persistence for tab-discard recovery) ──
  // Recoverable phases: any user/ai speaking turn. "judging" and "results" are not restored.
  // We also require the persisted identity to match the current debate — otherwise
  // a stale match from a tab-close hijacks the next one (different topic, same
  // restore → user lands mid-rebuttal on a debate they never started).
  const _currentIdentity = debateIdentity(prompt, opponent.name);
  const _savedIdentity = sessionStorage.getItem("debate_identity");
  const _identityMatches = _savedIdentity === _currentIdentity;
  const _savedPhaseRaw = _identityMatches
    ? (sessionStorage.getItem("debate_phase") as DebatePhase | null)
    : null;
  const _savedPhaseStart = _identityMatches
    ? sessionStorage.getItem("debate_phase_start")
    : null;
  const _validSavedPhase = (
    _savedPhaseRaw !== null &&
    _savedPhaseRaw in PHASE_CONFIG &&
    _savedPhaseRaw !== "results" &&
    _savedPhaseRaw !== "judging" &&
    _savedPhaseRaw !== "prep"
  );
  // If the persisted state is for a different debate, wipe it so the rest of
  // this mount + the persist effects below start from a clean slate.
  if (_savedIdentity && !_identityMatches) {
    clearDebateStorage();
  }

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
  // Hydrate from sessionStorage so a mid-debate refresh doesn't wipe the
  // turns that have already happened. The phase/start refs above are already
  // restored from storage — without restoring transcripts too, the judge
  // would score an empty case at the end.
  const [transcripts, setTranscripts] = useState(() => {
    const empty = { userOpening: "", aiOpening: "", userRebuttal: "", aiRebuttal: "" };
    if (!_validSavedPhase) return empty;
    try {
      const raw = sessionStorage.getItem("debate_transcripts");
      if (!raw) return empty;
      const parsed = JSON.parse(raw);
      return {
        userOpening: typeof parsed.userOpening === "string" ? parsed.userOpening : "",
        aiOpening: typeof parsed.aiOpening === "string" ? parsed.aiOpening : "",
        userRebuttal: typeof parsed.userRebuttal === "string" ? parsed.userRebuttal : "",
        aiRebuttal: typeof parsed.aiRebuttal === "string" ? parsed.aiRebuttal : "",
      };
    } catch { return empty; }
  });
  const transcriptsRef = useRef(transcripts);
  transcriptsRef.current = transcripts;

  // Persist transcripts whenever they change so refresh-during-debate works.
  // Cleared together with phase/phase_start in the results-effect below and
  // in the cleanup helper used by forfeit + intentional close.
  useEffect(() => {
    try { sessionStorage.setItem("debate_transcripts", JSON.stringify(transcripts)); } catch { /* ignore */ }
  }, [transcripts]);

  // ── Live user transcription state ─────────────────────────────────────────
  const [liveFinal, setLiveFinal] = useState("");
  const [liveInterim, setLiveInterim] = useState("");
  const liveFinalRef = useRef("");    // always-current copy — safe inside stale closures
  const liveInterimRef = useRef("");
  useEffect(() => { liveFinalRef.current = liveFinal; }, [liveFinal]);
  useEffect(() => { liveInterimRef.current = liveInterim; }, [liveInterim]);
  const recognitionRef = useRef<any>(null);
  // On phones/tablets the Web Speech engine ignores `continuous = true` and
  // auto-stops every few seconds; the restart loop cycles getUserMedia and
  // makes the mic indicator visibly blink. We treat speech as unsupported on
  // mobile so the live-transcript UI shows the "Recording" fallback, and the
  // user's words get transcribed server-side from the recorded blob after
  // each turn (see onRecorded handler).
  const speechSupported = !!getSpeechRecognition() && !isMobileDevice();

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
  // Brief, non-blocking "Round 2 · Rebuttals" announcement. Previously the
  // debate jumped straight from the openings into the rebuttals with no beat,
  // so users missed that the format had moved on.
  const [showRoundBanner, setShowRoundBanner] = useState(false);

  // ── Recording integration (for upload to user history) ────────────────────
  const [lastRecording, setLastRecording] = useState<{ blob: Blob; durationMs: number } | null>(null);
  const recorderStartRef = useRef<() => void>();
  const recorderStopRef = useRef<() => void>();
  const wasRecording = useRef(false);
  const isClosingRef = useRef(false);
  /** Set to true when autoAdvance fires while the tab is hidden — fires on tab show. */
  const pendingAutoAdvanceRef = useRef(false);
  /** Which user phase the in-progress recording belongs to. Captured when the
   *  recorder starts, since by the time onRecorded fires the phase has already
   *  advanced. Used to route the mobile server-side transcript into the right
   *  transcripts slot. */
  const recordingPhaseRef = useRef<DebatePhase | null>(null);
  /** Outstanding server-side transcription promises for mobile turns. The
   *  judge must await these before scoring, or it'll see empty user turns. */
  const pendingTranscriptionsRef = useRef<Promise<void>[]>([]);

  // ── Mic permission check ──────────────────────────────────────────────────
  // Prefer the Permissions API — it tells us the current state without
  // opening a stream. The previous implementation called getUserMedia just to
  // immediately stop the tracks, which (combined with the recorder + the
  // MicrophoneBorder visualizer) meant three simultaneous mic streams and
  // intermittent NotReadableError on macOS/Windows.
  useEffect(() => {
    let cancelled = false;
    const probe = () => {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(s => {
          s.getTracks().forEach(t => t.stop());
          if (!cancelled) setMicError(false);
        })
        .catch(() => { if (!cancelled) setMicError(true); });
    };

    const perms = (navigator as any).permissions;
    if (perms && typeof perms.query === "function") {
      perms.query({ name: "microphone" as PermissionName })
        .then((status: PermissionStatus) => {
          if (cancelled) return;
          // Only flag an error on outright denial. "prompt" means the browser
          // will ask the user when we actually start recording — no need to
          // open a stream here just to learn that.
          setMicError(status.state === "denied");
        })
        .catch(() => probe());
    } else {
      probe();
    }
    return () => { cancelled = true; };
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

  // Hide MobileNav (and anything else that watches `timerActive`) while the
  // debate is open so it can't bleed through the backdrop on mobile.
  useEffect(() => {
    setTimerActive(true);
    return () => setTimerActive(false);
  }, []);

  // ── Start user recording when user turn starts ────────────────────────────
  useEffect(() => {
    const cfg = PHASE_CONFIG[phase];
    if (cfg.speaker === "user" && phase !== "judging" && phase !== "results" && phase !== "prep") {
      if (!wasRecording.current) {
        // Remember which turn this recording belongs to — by the time the
        // recorder stops and `onRecorded` fires, `phase` has already advanced.
        recordingPhaseRef.current = phase;
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
  // `speechSupported` is false on mobile/tablet (see definition above), which
  // skips this effect entirely and routes transcription through the recorded
  // blob in the onRecorded handler below.
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
    let stopped = false;   // set true when this effect's cleanup fires
    let blocked = false;   // set true when mic permission is revoked / blocked
                           // — prevents the onend handler from restarting the
                           //   recognition into a permanent retry loop with no
                           //   transcript visible to the user.

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
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        blocked = true;
        setMicError(true);
        toast({
          title: "Microphone blocked",
          description: "Your browser is blocking mic access. Unblock it in the address-bar lock icon and try again.",
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      // Don't restart if this effect was cleaned up, the mic was revoked, or
      // we've left a user turn.
      if (stopped || blocked) return;
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
      // Persist the new phase start to storage + identity fingerprint so
      // a later mount can reject this state if it belongs to a different debate.
      sessionStorage.setItem("debate_phase", phase);
      sessionStorage.setItem("debate_phase_start", phaseStartRef.current.toString());
      sessionStorage.setItem("debate_identity", _currentIdentity);
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
    return combined;
  }, []);

  // ── Advance phase (with side effects per transition) ──────────────────────
  // advancePhaseRef keeps the timer's setInterval from holding a stale closure.
  const advancePhaseRef = useRef<() => void>(() => {});
  // Guard against a phase being advanced twice — in PvP the watcher can receive
  // the speaker's `turn-end` AND hit its own timer fallback for the same turn.
  // Reset in resetDebate so a "try again" replay can re-advance the same phases.
  const advancedFromRef = useRef<DebatePhase | null>(null);
  const advancePhase = useCallback(() => {
    if (advancedFromRef.current === phase) return;
    const idx = phaseOrder.indexOf(phase);
    if (idx === -1 || idx >= phaseOrder.length - 1) return;
    advancedFromRef.current = phase;
    const nextPhase = phaseOrder[idx + 1];

    // If we're leaving a user turn, capture their transcript — and in PvP,
    // broadcast it as the `turn-end` signal both clients advance on.
    if (PHASE_CONFIG[phase].speaker === "user" && phase !== "judging" && phase !== "results") {
      const combined = captureUserTurnTranscript();
      if (isPeer && peer) {
        const turn = turnNameOf(phase);
        if (turn) peer.sendDebateTurnEnd(peer.duelId, turn, combined);
      }
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
  // PvE only. In a live PvP debate the opponent is a human: their turn is driven
  // by realtime broadcasts (debate-live for the streamed transcript, turn-end to
  // advance), so this AI-generation/TTS engine is skipped entirely.
  useEffect(() => {
    const cfg = PHASE_CONFIG[phase];
    if (isPeer) return;
    if (cfg.speaker !== "ai" || phase === "judging" || phase === "results") return;

    aiAbortRef.current = false;
    setAiStream("");

    const runAITurn = async () => {
      const myStand = oppStand;

      // ── Topic-aware fallback (used if generation fails) ─────────────────
      // The previous fallback was a single confident-orator template — picking
      // a Beginner persona and hitting a network error would still hand the
      // user a Cicero. Pools are now tiered by persona.skill so an offline
      // Echo really does sound like a hesitant beginner.
      const makeFallback = (): string => {
        const stance = myStand === "FOR" ? "in favour of" : "against";
        const contrary = myStand === "FOR" ? "against" : "in favour of";
        const topicShort = prompt.replace(/^this house believes\s*/i, "").replace(/^that\s*/i, "");
        const skill = (opponent.persona?.skill || "Intermediate") as "Beginner" | "Intermediate" | "Advanced" | "Expert";

        const beginnerOpening = [
          `Okay, so — I'm ${stance} ${topicShort}. I mean, it just makes sense to me. You see it everywhere, right? Like, the people who actually deal with this know what I'm talking about. That's pretty much my point.`,
          `Honestly? I'm ${stance} this. I know that sounds simple, but — when I think about ${topicShort}, the other side just doesn't add up for me. I've seen it play out. That's enough for me to be ${stance} it.`,
          `So, ${topicShort}. I'm ${stance} it. My main reason is — well, it just works that way in real life. You can argue all you want, but at the end of the day, people who try the opposite usually end up wishing they hadn't.`,
        ];
        const intermediateOpening = [
          `I think the case for being ${stance} ${topicShort} is pretty solid. To be fair, the other side has a point or two — but the bigger picture lines up with my position. The trade-offs just make more sense this way.`,
          `My position is ${stance} ${topicShort}. The reason is straightforward: when you look at how this plays out in practice, the alternative tends to create more problems than it solves. I'll admit it's not airtight, but it holds up.`,
          `I'll keep this simple — I'm ${stance} ${topicShort}. The evidence I find most convincing is real-world: places that try the opposite end up dealing with consequences my side avoids. That asymmetry matters.`,
        ];
        const advancedOpening = [
          `I stand firmly ${stance} the proposition that ${topicShort}. When you look at the evidence — historical, empirical, and practical — the conclusion is clear. Those who argue ${contrary} are working from assumptions that don't survive contact with reality.`,
          `My position is ${stance} "${topicShort}" — and the reasoning is straightforward. The alternative my opponent will offer sounds reasonable on the surface. But once you examine what it actually requires, and what it ignores, the cracks become impossible to miss.`,
          `The motion before us — ${topicShort} — is not a close call. I argue ${stance} it because the people and systems most affected by this question are consistently better off when we take this position. The data, the logic, and the real-world outcomes all point the same way.`,
        ];
        const expertOpening = advancedOpening; // expert sharpens prose, but the topic-aware fallback can't fabricate that — keep parity.

        const beginnerRebuttal = [
          `Yeah, I hear what they're saying — but I still think I'm right about ${topicShort}. The thing is, their reason kind of falls apart when you actually try it. So I'm still ${stance} it.`,
          `Okay, my opponent made some points. I'll be honest, one of them sounded okay. But the rest? Not really. I'm sticking with being ${stance} ${topicShort} because the real-world bit still matters more.`,
          `I listened. I get it. But — same as before — being ${stance} ${topicShort} is the one that actually works. The other side keeps talking around the part that matters.`,
        ];
        const intermediateRebuttal = [
          `My opponent's case has one decent reason, I'll give them that. But the rest leans on assumptions I don't think hold up — and when you remove those, the ${contrary} position falls apart. That's why I'm still ${stance} ${topicShort}.`,
          `I'd push back on the strongest version of their argument: even granting it, it doesn't get them where they need to go. ${topicShort} still cuts in my favour because the outcomes track with my side.`,
          `Honestly, the response from the other side missed the central issue. We're not debating whether ${topicShort} has any downsides — of course it does. We're debating whether those downsides outweigh the alternative. And on that question, I think the answer's still clear.`,
        ];
        const advancedRebuttal = [
          `My opponent raised some points about "${topicShort}" — but notice what they carefully avoided: the strongest version of my argument. I'll address what they said, and then I'll show you why the core of their position falls apart.`,
          `I've listened to the case ${contrary} my view on "${topicShort}". The problem is that their argument proves too much. If we accepted their logic, it would also mean accepting conclusions they would never defend. That tells us something important about where their reasoning breaks down.`,
          `The response from the other side missed the central issue. We're not debating whether "${topicShort}" has any downsides — of course it does. We're debating whether those downsides outweigh the alternative. And on that question, my opponent gave you nothing.`,
        ];
        const expertRebuttal = advancedRebuttal;

        const openingPools = {
          Beginner: beginnerOpening,
          Intermediate: intermediateOpening,
          Advanced: advancedOpening,
          Expert: expertOpening,
        };
        const rebuttalPools = {
          Beginner: beginnerRebuttal,
          Intermediate: intermediateRebuttal,
          Advanced: advancedRebuttal,
          Expert: expertRebuttal,
        };
        const pools = phase === "opening-ai" ? openingPools : rebuttalPools;
        const pool = pools[skill] ?? pools.Intermediate;
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
      //
      // estimatedDurationMs can be mutated mid-stream (via the ref) when real
      // audio.duration becomes known after a `durationchange` event — avoids
      // the old desync where Infinity-duration streams paced text over 45s
      // while the audio actually finished in 8s.
      const durationRef = { current: 1 };
      const startStreaming = (estimatedDurationMs: number) => {
        durationRef.current = Math.max(1, estimatedDurationMs);
        const totalChars = argument.length;
        const startedAt = Date.now();
        const tick = () => {
          if (aiAbortRef.current) return;
          const elapsed = Date.now() - startedAt;
          const fraction = Math.min(1, elapsed / durationRef.current);
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

      // Read-the-last-line delay so users see the closing words for a beat
      // before the phase advances. 350ms matches the typical end-of-sentence pause.
      const READ_AFTER_END_MS = 350;

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
        // Force-flush the full text so the closing sentence is fully on screen
        // before we move on. Without this, an early `ended` event (Infinity
        // duration → streaming paced too slowly → audio finishes first) would
        // jump the phase while half the AI's closing line was still hidden.
        setAiStream(argument);
        setTimeout(() => {
          if (aiAbortRef.current) return;
          console.log(`[Debate] AI finished speaking, auto-advancing from ${phaseRef.current}`);
          advancePhaseRef.current();
        }, READ_AFTER_END_MS);
      };

      // ── 3. TTS chain ────────────────────────────────────────────────────
      // Single-shot fallback flag — both `audio.play().catch` AND audio's
      // `error` event can fire for the same failure, and the cleanup of the
      // Deepgram element happens around the same time. Without this guard
      // we'd speakViaBrowser() twice, queueing two utterances over each
      // other and racing two streaming ticks against one another.
      let fallbackFired = false;

      // Tear down any Deepgram element + its listeners cleanly before we
      // hand off to the browser TTS fallback. Otherwise a lingering
      // durationchange listener keeps mutating durationRef while the
      // fallback's own startStreaming is the one actually driving the text.
      let detachDeepgram: (() => void) | null = null;

      // Browser SpeechSynthesis fallback — used when Deepgram TTS request
      // itself fails OR Deepgram loaded but autoplay was blocked / element
      // errored mid-playback. Previously the autoplay-blocked branch called
      // autoAdvance() instantly, so the user neither heard nor read the AI's
      // turn — the phase just skipped.
      const speakViaBrowser = () => {
        if (aiAbortRef.current) return;
        if (fallbackFired) return;
        fallbackFired = true;
        detachDeepgram?.();
        // Cancel any in-flight streaming tick from the Deepgram path — we're
        // about to restart with a new pace from the browser-TTS estimate.
        if (aiStreamRef.current) { clearTimeout(aiStreamRef.current); aiStreamRef.current = null; }
        const estimatedMs = Math.max(5000, Math.min(60000, argument.length * 60));
        startStreaming(estimatedMs);
        const utterance = new SpeechSynthesisUtterance(argument);
        utterance.rate = 1.05;
        utterance.pitch = opponent.persona?.skill === "Expert" ? 0.85 : 1.05;
        utterance.onend = autoAdvance;
        utterance.onerror = autoAdvance;
        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("[Debate] speechSynthesis.speak threw:", e);
          autoAdvance();
        }
      };

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

        const initialDurationMs = (audio.duration && isFinite(audio.duration) ? audio.duration : cfg.duration) * 1000;
        startStreaming(initialDurationMs);

        // Some streamed audio sources only learn their real duration mid-playback
        // (initial duration is Infinity). When the browser fires durationchange
        // with a finite value, re-pace the text streaming to match — otherwise
        // the text crawls at 45s pace while the audio finishes in 8s and the
        // user sees the AI's closing words pop in *after* the phase advances.
        //
        // GUARD: only re-pace *forward* (shorter than current estimate). If the
        // new real duration is longer than what we estimated, leaving the pace
        // alone is fine — full text will sit visible until audio ends. Without
        // this guard a longer-than-estimate duration would shrink the streamed
        // text fraction and visibly REWIND what the user has read.
        const onDurationChange = () => {
          if (!audio.duration || !isFinite(audio.duration) || audio.duration <= 0) return;
          const newDurationMs = audio.duration * 1000;
          if (newDurationMs < durationRef.current) {
            durationRef.current = newDurationMs;
          }
        };
        audio.addEventListener("durationchange", onDurationChange);

        const onAudioError = () => {
          console.warn("[Debate] audio element errored mid-playback — falling back to SpeechSynthesis");
          speakViaBrowser();
        };
        audio.addEventListener("ended", autoAdvance, { once: true });
        audio.addEventListener("error", onAudioError, { once: true });

        // Wire up the detach so speakViaBrowser can sever the Deepgram element
        // before installing its own streaming tick.
        detachDeepgram = () => {
          try {
            audio.removeEventListener("durationchange", onDurationChange);
            audio.removeEventListener("ended", autoAdvance);
            audio.removeEventListener("error", onAudioError);
            audio.pause();
          } catch { /* element already torn down */ }
          if (audioRef.current === audio) audioRef.current = null;
        };

        audio.play().catch(err => {
          // Autoplay blocked OR another play() interruption. Don't skip the
          // turn — the user should still hear (or at least see) the argument.
          console.warn("[Debate] audio.play() rejected (autoplay blocked?), falling back to SpeechSynthesis:", err);
          speakViaBrowser();
        });
      } catch (ttsErr) {
        console.warn("[Debate] Deepgram TTS failed, falling back to browser SpeechSynthesis:", ttsErr);
        speakViaBrowser();
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

    // PvP: only the HOST judges (authoritative). The peer waits for the host's
    // broadcast verdict, which the battle-result listener mirrors — exactly the
    // pattern DuelDrill uses. Return before any judging/ELO work runs here.
    if (isPeer && peer && !peer.isHost) {
      setAnalyzeText("OPPONENT'S JUDGE IS DELIBERATING...");
      return;
    }

    await new Promise(r => setTimeout(r, 400));

    // On mobile, user turns are transcribed server-side after each recording
    // finishes. Wait for those before reading transcriptsRef, otherwise the
    // judge sees empty user turns and the user gets a fake 0–50 loss.
    if (pendingTranscriptionsRef.current.length > 0) {
      setAnalyzeText("TRANSCRIBING YOUR SPEECH...");
      try { await Promise.all(pendingTranscriptionsRef.current); } catch { /* individual failures already logged */ }
      pendingTranscriptionsRef.current = [];
    }

    // PvP host: give a late corrected transcript from a peer on mobile (whose
    // server-side transcription lands shortly after their turn-end) a moment to
    // arrive before we read the transcripts for scoring.
    if (isPeer && peer?.isHost) {
      setAnalyzeText("COLLECTING BOTH CASES...");
      await new Promise(r => setTimeout(r, 2500));
    }

    const t = transcriptsRef.current;
    const userTotalLen = (t.userOpening + t.userRebuttal).trim().length;
    const oppTotalLen = (t.aiOpening + t.aiRebuttal).trim().length;
    // Void only when there's genuinely nothing to judge:
    //  - PvE: the user's own speech is empty (don't penalise a broken mic).
    //  - PvP: BOTH sides are empty — otherwise whoever DID speak should win, so
    //    we let the judge score the silent side near 0 instead of voiding.
    const nothingToJudge = isPeer ? (userTotalLen < 20 && oppTotalLen < 20) : (userTotalLen < 20);
    if (nothingToJudge) {
      // Voided match — don't fabricate a fake loss, don't call completeDuel,
      // don't move ELO.
      setVerdict({
        voided: true,
        voidReason:
          "We couldn't capture enough speech to judge this match. Check your microphone, allow access in your browser settings, then try again — your ELO is unchanged.",
      });
      setPhase("results");
      return;
    }

    setAnalyzeText("AI IS WEIGHING THE ARGUMENTS...");

    const userName = user?.email?.split("@")[0] || "You";
    const oppName = opponent.name;

    // Surface provider chain progress so the screen never looks frozen for
    // 15+ seconds while Groq → OpenRouter → Cerebras → Gemini fall through.
    let triedCount = 0;
    const unsubscribe = onAIStatus(s => {
      if (s.type === "trying") {
        triedCount++;
        if (triedCount === 1) setAnalyzeText("AI IS WEIGHING THE ARGUMENTS...");
        else setAnalyzeText(`TRYING BACKUP PROVIDER (${triedCount})…`);
      }
    });

    try {
      const result = await judgeDebate({
        motion: prompt,
        userName,
        userStand,
        userOpening: t.userOpening,
        userRebuttal: t.userRebuttal,
        oppName,
        oppStand,
        oppOpening: t.aiOpening,
        oppRebuttal: t.aiRebuttal,
      });
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
          // PvP: the real peer's id so submit-battle-result rates BOTH players
          // and pushes the peer their elo-sync. PvE: the sentinel "ai".
          id: isPeer && peer ? peer.opponentId : "ai",
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

      // Pathway debate drills SKIP completeDuel. completeDuel records the
      // match in arena_battles AND moves ELO via submitBattleResult — neither
      // of which should happen for curriculum drills. The lesson completion
      // is handled separately by the onComplete callback (see Back to
      // Pathway / Back to Arena button below).
      if (!isPathway) {
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
      }

      // PvP host: broadcast the verdict (host's perspective) so the peer mirrors
      // it. The peer flips score↔oppScore and won, exactly like DuelDrill.
      if (isPeer && peer?.isHost) {
        peer.broadcastBattleResult(peer.duelId, {
          score: result.score,
          oppScore: result.oppScore,
          feedback: result.feedback,
          oppFeedback: result.oppFeedback,
          strengths: result.strengths,
          oppStrengths: result.oppStrengths,
          won,
          tie: result.winner === "tie",
        });
      }

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
      // If we somehow still get here, void the match — the user DID speak, but our
      // AI couldn't score them, so we won't fabricate a 50-50 tie or move ELO.
      console.error("[Debate] Judging failed unexpectedly:", e);
      toast({
        title: "Scoring unavailable",
        description: "Could not reach the AI judge. Your match wasn't recorded.",
        variant: "destructive",
      });
      setVerdict({
        voided: true,
        voidReason:
          "Our AI judge was unreachable, so this match wasn't recorded. Your ELO is unchanged — try again in a moment.",
      });
      setPhase("results");
    } finally {
      unsubscribe();
    }
  };

  // ── PvP: receive the opponent's live transcript + turn-end signal ──────────
  // The opponent is a human here; their words arrive as broadcasts. `debate-live`
  // streams their in-progress text into their podium; `debate-turn-end` carries
  // the final transcript and is the signal to advance both clients in lockstep.
  useEffect(() => {
    if (!isPeer || !peer) return;
    const onLive = (p: ArenaEvents["arena:debate-live"]) => {
      if (p.duelId !== peer.duelId || p.userId !== peer.opponentId) return;
      setAiStream(p.text);
    };
    const onTurnEnd = (p: ArenaEvents["arena:debate-turn-end"]) => {
      if (p.duelId !== peer.duelId || p.userId !== peer.opponentId) return;
      // From our perspective the opponent occupies the "ai*" transcript slots.
      // We store on EVERY turn-end (even a late mobile correction that arrives
      // after we've moved on) so the host always judges the real text.
      setTranscripts(prev => ({
        ...prev,
        ...(p.turn === "opening" ? { aiOpening: p.transcript } : { aiRebuttal: p.transcript }),
      }));
      setAiStream(p.transcript);
      // Only advance if we're currently watching this exact turn (a late
      // correction for an already-finished turn must NOT skip a phase).
      const watchingPhase = p.turn === "opening" ? "opening-ai" : "rebuttal-ai";
      if (phaseRef.current === watchingPhase) advancePhaseRef.current();
    };
    arenaEmitter.on("arena:debate-live", onLive);
    arenaEmitter.on("arena:debate-turn-end", onTurnEnd);
    return () => {
      arenaEmitter.off("arena:debate-live", onLive);
      arenaEmitter.off("arena:debate-turn-end", onTurnEnd);
    };
  }, [isPeer, peer]);

  // ── PvP: stream MY live transcript to the opponent while I speak ───────────
  // Derive "is it my turn" from `phase` (declared up top) rather than the
  // render-section `isUserTurn` const — listing isUserTurn in the dep array
  // evaluated it DURING render before its declaration, a TDZ that blanked the
  // whole debate screen (PvE and PvP alike).
  const lastLiveSentRef = useRef(0);
  useEffect(() => {
    if (!isPeer || !peer) return;
    const turn = turnNameOf(phase);
    if (!turn || PHASE_CONFIG[phase].speaker !== "user") return; // only my speaking turns
    const now = Date.now();
    if (now - lastLiveSentRef.current < 450) return; // throttle ~2/sec
    lastLiveSentRef.current = now;
    const text = (liveFinal + " " + liveInterim).trim();
    peer.sendDebateLive(peer.duelId, turn, text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPeer, peer, phase, liveFinal, liveInterim]);

  // ── PvP peer: mirror the host's broadcast verdict ─────────────────────────
  // Same host-authoritative mirroring DuelDrill uses: flip score↔oppScore and
  // the win flag, since the host broadcasts from its own perspective.
  useEffect(() => {
    if (!isPeer || !peer || peer.isHost) return;
    const onResult = (p: ArenaEvents["arena:battle-result"]) => {
      if (p.duelId !== peer.duelId) return;
      const tie = !!p.tie || p.score === p.oppScore;
      const iWon = tie ? false : !p.won;
      setVerdict({
        score: p.oppScore ?? 0,            // my score is the host's oppScore
        oppScore: p.score,                 // host's score
        feedback: p.oppFeedback || p.feedback,
        oppFeedback: p.feedback,
        won: iWon,
        strengths: p.oppStrengths || "N/A",
        oppStrengths: p.strengths || "N/A",
      });
      if (iWon) sfx.win(); else sfx.loss();
      setPhase("results");
    };
    arenaEmitter.on("arena:battle-result", onResult);
    return () => arenaEmitter.off("arena:battle-result", onResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPeer, peer]);

  // ── PvP: opponent forfeited (left the debate) → I win ─────────────────────
  useEffect(() => {
    if (!isPeer || !peer) return;
    const onForfeit = (p: ArenaEvents["arena:battle-forfeit"]) => {
      if (p.duelId !== peer.duelId || p.userId !== peer.opponentId) return;
      aiAbortRef.current = true;
      setVerdict({
        score: 100, oppScore: 0, won: true, byForfeit: true,
        feedback: `${opponent.name} left the debate. You win by forfeit.`,
        strengths: "Held the floor", oppStrengths: "N/A",
      });
      sfx.win();
      setPhase("results");
    };
    arenaEmitter.on("arena:battle-forfeit", onForfeit);
    return () => arenaEmitter.off("arena:battle-forfeit", onForfeit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPeer, peer]);

  // ── Round-transition banner ───────────────────────────────────────────────
  // Announce the start of Round 2 (rebuttals) with a short, non-blocking beat
  // when this client enters whichever side rebuts first. Purely cosmetic — the
  // phase timer + recording keep running underneath, and both PvP clients hit
  // their respective first-rebuttal phase together, so it never desyncs them.
  useEffect(() => {
    const firstRebuttal = speakingOrder(phaseOrder)[2]; // index 2 = opens Round 2
    if (phase === firstRebuttal) {
      setShowRoundBanner(true);
      const t = setTimeout(() => setShowRoundBanner(false), 1700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Clear debate storage when results are shown (battle is done) ─────────
  useEffect(() => {
    if (phase === "results") clearDebateStorage();
  }, [phase]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    try { recognitionRef.current?.stop(); } catch (_) {}
    if (aiStreamRef.current) clearTimeout(aiStreamRef.current);
    setRecordingActive(false);
    // Only clear the persisted debate state if the user intentionally left
    // (forfeit / close). For a plain refresh-during-debate, the component
    // unmounts but we WANT the next mount to restore — so keep the keys.
    if (isClosingRef.current) clearDebateStorage();
  }, []);

  // ── Reset everything back to a fresh debate on the SAME topic ────────────
  // Used by "Try again" on a voided result, so the user doesn't have to walk
  // back to the lobby and re-pick everything when their own mic failed (or
  // when our AI judge timed out).
  const resetDebate = useCallback(() => {
    clearDebateStorage();
    aiAbortRef.current = true;
    pendingAutoAdvanceRef.current = false;
    if (aiStreamRef.current) clearTimeout(aiStreamRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis.cancel();
    try { recognitionRef.current?.stop(); } catch (_) {}
    setTranscripts({ userOpening: "", aiOpening: "", userRebuttal: "", aiRebuttal: "" });
    setLiveFinal("");
    setLiveInterim("");
    setAiStream("");
    setVerdict(null);
    setAnalyzeText("REVIEWING DEBATE...");
    restoredFromStorageRef.current = false;
    wasRecording.current = false;
    advancedFromRef.current = null; // allow the replay to advance the same phases again
    phaseStartRef.current = Date.now();
    setSecondsLeft(PHASE_CONFIG[phaseOrder[0]].duration);
    aiAbortRef.current = false;
    setPhase(phaseOrder[0]);
  }, [phaseOrder]);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const cfg = PHASE_CONFIG[phase];
  const isUserTurn = cfg.speaker === "user";

  // Turn order / labels come from the unit-tested helpers. `turnLabel` is derived
  // from the REAL order so AGAINST debates label their turns correctly (the
  // static PHASE_CONFIG strings assumed the FOR sequence).
  const speakingSeq = speakingOrder(phaseOrder);
  const turnLabel = turnLabelOf(phase, phaseOrder, cfg.round);
  const userOpensFirst = userOpensFirstOf(phaseOrder);
  const showResults = phase === "results" && verdict;
  const showJudging = phase === "judging";
  const isVoided = !!verdict?.voided;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      // Solid bg + dynamic viewport height + safe-area bottom padding — same
      // mobile-stability fix applied to DuelDrill.
      // z-[180] (Z.duelActive) forces the screen above chat panels and modals.
      className="fixed inset-0 z-[180] bg-background overflow-y-auto overflow-x-hidden scrollbar-hide text-foreground flex flex-col"
      style={{
        minHeight: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
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
        <SpamButton
          onClick={() => (showResults ? onClose() : setShowAbandonConfirm(true))}
          aria-label="Leave debate"
          className="flex items-center gap-1.5 text-xs lg:text-sm font-semibold text-foreground/60 hover:text-primary transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Leave</span>
        </SpamButton>

        <div className="text-center min-w-0 flex-1">
          <p className="text-[9px] lg:text-[10px] font-semibold text-primary/70 truncate">{turnLabel}</p>
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

          {/* Turn order — make who speaks first (and the full sequence)
              unmistakable. Previously the stance silently decided this and the
              user just watched the AI start with no explanation. */}
          <div className="w-full max-w-sm space-y-3">
            <p className="text-center text-xs font-black uppercase tracking-widest">
              {userOpensFirst
                ? <span className="text-primary">You speak first</span>
                : <><span className="text-primary">{opponent.name}</span> speaks first — you respond</>}
            </p>
            <div className="space-y-1.5">
              {speakingSeq.map((p, i) => {
                const mine = PHASE_CONFIG[p].speaker === "user";
                const kind = p.startsWith("opening") ? "Opening" : "Rebuttal";
                return (
                  <div
                    key={p}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-xl border text-xs font-bold",
                      mine ? "border-primary/40 bg-primary/5" : "border-border/50 bg-muted/10 opacity-70"
                    )}
                  >
                    <span className="h-5 w-5 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-black tabular-nums shrink-0">{i + 1}</span>
                    <span className="truncate">{mine ? "You" : opponent.name}</span>
                    <span className="ml-auto text-[10px] font-black uppercase tracking-widest opacity-50">{kind}</span>
                  </div>
                );
              })}
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

          {/* PvE lets you skip prep early. PvP must keep both clients in step,
              so the round starts automatically when the shared prep timer ends. */}
          {isPeer ? (
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
              First speaker begins automatically…
            </p>
          ) : (
            <SpamButton
              onClick={() => advancePhaseRef.current()}
              className="button-pill px-8 py-3 bg-primary text-white shadow-glow hover:scale-[1.02] active:scale-95 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              I&apos;m ready <ChevronRight className="h-4 w-4" />
            </SpamButton>
          )}
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

      {/* RESULTS SCREEN — voided variant */}
      {showResults && verdict && isVoided && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto w-full px-4 md:px-8 py-6 md:py-8 space-y-4 md:space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 mx-auto">
              <AlertTriangle className="h-7 w-7 text-yellow-500" />
            </div>
            <h2 className="text-xs md:text-sm font-black uppercase tracking-widest md:tracking-[0.6em] text-yellow-500">
              Match voided
            </h2>
            <p className="text-sm md:text-base leading-relaxed opacity-70 max-w-xl mx-auto">
              {verdict.voidReason}
            </p>
          </div>

          {/* Transcript so the user can see exactly what was/wasn't captured */}
          <div className="bg-background/30 border border-border rounded-2xl p-4 md:p-6 space-y-3 md:space-y-4">
            <p className="text-[10px] md:text-sm font-black uppercase tracking-widest md:tracking-[0.4em] text-primary">Captured transcript</p>
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

          <div className="flex flex-col gap-2 mt-2 md:mt-4">
            {/* "Try again" replays the local phase machine on the same topic —
                valid for PvE / pathway, but in a live PvP debate the opponent
                has already left, so resetting solo just bugs out. Hide it there. */}
            {!isPeer && (
              <SpamButton
                onClick={resetDebate}
                className="w-full py-4 md:py-5 bg-primary text-white rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest md:tracking-[0.4em] hover:scale-[1.02] active:scale-95 transition-all shadow-glow"
              >
                Try again
              </SpamButton>
            )}
            <SpamButton
              onClick={onClose}
              className="w-full py-3 md:py-4 bg-transparent border border-border/60 text-foreground/70 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-muted/20 transition-all"
            >
              {isPathway ? "Back to Pathway" : "Back to Arena"}
            </SpamButton>
          </div>
        </motion.div>
      )}

      {/* RESULTS SCREEN — judged variant */}
      {showResults && verdict && !isVoided && (
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

          <SpamButton
            id="tutorial-close-drill"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("speakbold:drill-complete"));
              onComplete(verdict.score, prompt, "debate", verdict.feedback);
            }}
            className="w-full mt-2 md:mt-4 py-4 md:py-5 bg-primary text-white rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest md:tracking-[0.4em] hover:scale-[1.02] active:scale-95 transition-all shadow-glow"
          >
            {isPathway ? "Back to Pathway" : "Back to Arena"}
          </SpamButton>
        </motion.div>
      )}

      {/* DEBATE STAGE — two podiums */}
      {!showResults && !showJudging && phase !== "prep" && (() => {
        // Each inactive podium surfaces its speaker's most recently COMPLETED
        // turn, so you can read what your opponent just said while you respond
        // (and review your own last turn while they speak). Derived from the
        // real speaking order rather than hard-coded per phase: the previous
        // implementation only populated this during rebuttal phases, so the
        // second opener (every AGAINST / PvP-peer client) saw a BLANK opponent
        // podium right after the opponent finished their opening — their
        // transcript only reappeared once a rebuttal phase began. This walks
        // backwards from the current phase to the latest finished turn by that
        // speaker, which is correct for both FOR and AGAINST orders.
        //
        // Order-driven (not emptiness-driven) on purpose: on mobile the final
        // transcript for a turn lands a beat late via server-side transcription,
        // so keying off emptiness would briefly flash the earlier turn before
        // the latest one arrives.
        const prevTurnFor = (speaker: "user" | "ai"): { text: string; label: string } => {
          const curIdx = phaseOrder.indexOf(phase);
          for (let i = curIdx - 1; i >= 0; i--) {
            const p = phaseOrder[i];
            if (speakerOf(p) !== speaker) continue;
            if (p === "opening-user") return { text: transcripts.userOpening, label: "Your opening" };
            if (p === "rebuttal-user") return { text: transcripts.userRebuttal, label: "Your rebuttal" };
            if (p === "opening-ai") return { text: transcripts.aiOpening, label: "Their opening" };
            if (p === "rebuttal-ai") return { text: transcripts.aiRebuttal, label: "Their rebuttal" };
          }
          return { text: "", label: speaker === "user" ? "Your opening" : "Their opening" };
        };
        const { text: userPrevText, label: userPrevLabel } = prevTurnFor("user");
        const { text: aiPrevText, label: aiPrevLabel } = prevTurnFor("ai");

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
              <SpamButton
                onClick={handleEndTurn}
                className="button-pill px-6 md:px-8 py-3 md:py-4 bg-primary text-white shadow-glow hover:scale-[1.02] active:scale-95 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                End turn
                <ChevronRight className="h-4 w-4" />
              </SpamButton>
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

              // Mobile transcript fallback: Web Speech is disabled on phones/
              // tablets (it cycles the mic), so the recorded blob is our only
              // source of truth for the user's words. Transcribe server-side
              // and slot the text into the correct turn. The judge awaits
              // these promises before scoring.
              const recordedPhase = recordingPhaseRef.current;
              recordingPhaseRef.current = null;
              if (isMobileDevice() && recordedPhase) {
                const key =
                  recordedPhase === "opening-user" ? "userOpening" :
                  recordedPhase === "rebuttal-user" ? "userRebuttal" : null;
                if (key) {
                  const p = (async () => {
                    try {
                      const text = (await transcribeAudio(rec.blob)).trim();
                      if (text) {
                        setTranscripts(prev => ({ ...prev, [key]: text }));
                        // PvP: a mobile speaker's live turn-end carried empty/rough
                        // text (no Web Speech). Now that the server transcript is
                        // ready, re-broadcast it so the host re-stores the real
                        // text before judging (its runJudging waits a settle window).
                        if (isPeer && peer) {
                          peer.sendDebateTurnEnd(peer.duelId, key === "userOpening" ? "opening" : "rebuttal", text);
                        }
                      }
                    } catch (err) {
                      console.warn("[Debate] Mobile server transcription failed:", err);
                    }
                  })();
                  pendingTranscriptionsRef.current.push(p);
                }
              }

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
              <div className={cn(
                "h-16 w-16 rounded-full border flex items-center justify-center mx-auto",
                isPathway
                  ? "bg-foreground/5 border-border text-foreground/60"
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              )}>
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="speak-serif text-2xl italic">
                {isPathway ? "Leave this drill?" : "Forfeit the debate?"}
              </h3>
              <p className="text-xs font-medium opacity-50 leading-relaxed">
                {isPathway ? (
                  // Pathway debate drills are part of the curriculum, not a
                  // ranked match. Leaving simply discards this attempt — no
                  // ELO penalty, no forfeit log. The lesson stays available
                  // to retry whenever they're ready.
                  <>This is a practice drill, not a ranked match. Leaving discards this attempt — your ELO is unchanged and you can try again any time.</>
                ) : (
                  <>
                    Leaving mid-debate counts as a forfeit. You'll lose{" "}
                    <span className="font-black text-red-500">{FORFEIT_PENALTY} ELO</span>{" "}
                    and your {isPeer ? "" : "AI "}opponent wins by default.
                  </>
                )}
              </p>
              <div className="flex flex-col gap-2">
                <SpamButton
                  onClick={async () => {
                    isClosingRef.current = true;
                    // Defence in depth: nuke persisted state up-front so even
                    // if onClose causes some race that swallows the unmount
                    // cleanup, the next debate won't restore into this one.
                    clearDebateStorage();
                    // Pathway drills SKIP the ELO-moving forfeit handler —
                    // they're curriculum, not ranked play. Closing the modal
                    // is enough; usePathway leaves the lesson unfinished.
                    // PvP: tell the peer first so they get their win-by-forfeit
                    // even if our ELO call is slow. Use the live duelId so the
                    // peer's forfeit listener matches.
                    if (isPeer && peer) {
                      peer.sendForfeit(peer.duelId);
                    }
                    if (!isPathway && handleForfeit) {
                      const userName = user?.email?.split("@")[0] || "You";
                      const duelId = isPeer && peer ? peer.duelId : `debate-forfeit-${Date.now()}`;
                      const forfeitDuel: Duel = {
                        id: duelId,
                        prompt,
                        gamemode: "debate",
                        creator: { id: user?.id, name: userName, avatar: "👤", elo: userElo, rank: getRankFromElo(userElo), score: null },
                        // PvP routes the loss/win ELO to the real peer; PvE uses the AI sentinel.
                        challenger: { id: isPeer && peer ? peer.opponentId : "ai", name: opponent.name, avatar: opponent.avatar, elo: opponent.elo, rank: opponent.rank, score: null },
                        status: "open",
                        winner: null,
                        feedback: null,
                        timestamp: Date.now(),
                      };
                      await handleForfeit(duelId, true, forfeitDuel);
                    }
                    onClose();
                  }}
                  className={cn(
                    "button-pill py-3 bg-transparent border transition-all text-[10px] font-black uppercase tracking-wide",
                    isPathway
                      ? "text-foreground/70 border-border/60 hover:bg-foreground/5 hover:text-foreground"
                      : "text-foreground/50 border-border/50 hover:bg-red-500 hover:text-white hover:border-red-500"
                  )}
                >
                  {isPathway ? "LEAVE DRILL" : "FORFEIT"}
                </SpamButton>
                <SpamButton
                  onClick={() => setShowAbandonConfirm(false)}
                  className="text-[10px] font-black uppercase tracking-wide opacity-40 hover:opacity-100 transition-opacity py-2"
                >
                  {isPathway ? "KEEP PRACTISING" : "STAY IN DEBATE"}
                </SpamButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round-transition banner — a centered pill (no full backdrop, so the
          stage stays visible) that fades in/out. pointer-events-none keeps it
          from intercepting taps on the active podium / End-turn button. */}
      <AnimatePresence>
        {showRoundBanner && phase !== "results" && phase !== "judging" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.85, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 1.05, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="bg-background/90 backdrop-blur-md border border-primary/30 rounded-3xl px-10 py-6 text-center shadow-glow"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-1">Round 2</p>
              <p className="speak-serif text-3xl md:text-4xl italic leading-none">Rebuttals</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mt-3">
                {PHASE_CONFIG[speakingOrder(phaseOrder)[2]].speaker === "user"
                  ? "You respond first"
                  : `${opponent.name} responds first`}
              </p>
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
