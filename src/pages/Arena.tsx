import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useArena, type Duel, type Gamemode, GAMEMODES, getRankColor, getRankFromElo, AI_PERSONAS } from "@/hooks/useArena";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { isInPlacement, getMatchesPlayed, getSeasonInfo, estimateEloAtStake, getNextRankInfo, ELO_FLOOR } from "@/hooks/arenaUtils";
import { SiteHeader } from "@/components/SiteHeader";
import { ArenaLeaderboardPreview } from "@/components/ArenaLeaderboardPreview";
import { RankEmblem } from "@/components/RankEmblem";
import { DebateBattle } from "@/components/DebateBattle";
import { DuelDrill } from "@/components/DuelDrill";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence, animate } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Swords, Trophy, Zap, Flame, Sparkles, Loader2, Radar, Target, Mic, X, Users, Calendar, Lock, ArrowRight
} from "lucide-react";
import { generateArenaPrompt } from "@/services/geminiService";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { arenaEmitter, type ArenaEvents } from "@/lib/events";

/* ── Animated Number — smoothly tweens between values ─── */
const AnimatedNumber = ({ value, duration = 0.45 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const controls = animate(display, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: v => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display}</>;
};

/* ── Main Arena Page ───────────────────────────────────── */
const Arena = () => {
  const { 
    duels, profile, loading: arenaLoading, completeDuel, findMatch, completedDuels, refresh: refreshArena,
    onlineUsers, incomingRequests, setIncomingRequests, sendDuelRequest, acceptDuelRequest, sendReadyStatus,
    broadcastBattleResult, broadcastAnalyzing, sendTranscript, sendForfeit, handleForfeit, requestCooldown,
    sendDebateLive, sendDebateTurnEnd
  } = useArena();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const arenasfx = useSoundEffects();

  const [activeDrill, setActiveDrill] = useState<Duel | null>(() => {
    try { const s = sessionStorage.getItem("arena_active_drill"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [isCreating, setIsCreating] = useState(() => sessionStorage.getItem("arena_is_creating") === "true");

  useEffect(() => {
    if (activeDrill) sessionStorage.setItem("arena_active_drill", JSON.stringify(activeDrill));
    else sessionStorage.removeItem("arena_active_drill");
  }, [activeDrill]);

  useEffect(() => {
    sessionStorage.setItem("arena_is_creating", isCreating.toString());
  }, [isCreating]);
  // Selected battle mode persists across refresh — picking "debate" once should
  // not have to be re-selected every visit.
  const [selectedMode, setSelectedMode] = useLocalStorageState<Gamemode>("speakbold:arena:mode", "standard");

  // Turn-based debate flow (replaces parallel debate in DuelDrill)
  const [debateSetupOpen, setDebateSetupOpen] = useState(false);
  const [debateConfig, setDebateConfig] = useState<{ prompt: string; stand: "FOR" | "AGAINST"; opponent: any; roundFormat: "standard" | "extended" } | null>(() => {
    try {
      const s = sessionStorage.getItem("arena_debate_config");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  // Persist debateConfig so DebateBattle survives tab discards
  useEffect(() => {
    if (debateConfig) sessionStorage.setItem("arena_debate_config", JSON.stringify(debateConfig));
    else sessionStorage.removeItem("arena_debate_config");
  }, [debateConfig]);

  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftStand, setDraftStand] = useState<"FOR" | "AGAINST">("FOR");
  const [draftExtended, setDraftExtended] = useState(false);
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [challengeExtended, setChallengeExtended] = useState(false);

  const [matchmaking, setMatchmaking] = useState(false);
  const [matchFound, setMatchFound] = useState<Duel | null>(null);
  const [eloUpdate, setEloUpdate] = useState<{ change: number; newElo: number; outcome?: "win" | "loss" | "tie" } | null>(null);
  const pendingUpdate = useRef<{ change: number; newElo: number; outcome?: "win" | "loss" | "tie" } | null>(null);
  
  // Kill any residual AI speech on mount/unmount
  useEffect(() => {
    window.speechSynthesis.cancel();
    return () => window.speechSynthesis.cancel();
  }, []);

  // Global ELO update listener for the lobby.
  // Buffer the update whenever a battle overlay (drill OR debate) is open
  // so the animation fires on the lobby page after the overlay closes.
  useEffect(() => {
    const handleEloUpdate = ({ change, newElo, outcome }: ArenaEvents["elo:updated"]) => {
      if (activeDrill || debateConfig) {
        pendingUpdate.current = { change, newElo, outcome };
      } else {
        setEloUpdate({ change, newElo, outcome });
        setTimeout(() => setEloUpdate(null), 8000);
      }
    };
    arenaEmitter.on("elo:updated", handleEloUpdate);
    return () => arenaEmitter.off("elo:updated", handleEloUpdate);
  }, [activeDrill, debateConfig]);

  // ── Sound: ELO gain / loss when the banner appears ───────────────────────
  useEffect(() => {
    if (!eloUpdate) return;
    // Sound follows the match outcome (matching the VICTORY/DEFEAT headline),
    // falling back to the delta sign when no outcome was supplied.
    const outcome = eloUpdate.outcome ?? (eloUpdate.change > 0 ? "win" : eloUpdate.change < 0 ? "loss" : "tie");
    if (outcome === "win") arenasfx.eloGain();
    else if (outcome === "loss") arenasfx.eloLoss();
  }, [eloUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debug command — DEV ONLY. Previously shipped to production, which let
  // anyone with devtools auto-win battles and forge ELO. Vite strips this
  // entire effect at build time when import.meta.env.DEV is false.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
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
  // The challenger's chosen stance for a DEBATE challenge (they argue this; the
  // accepter argues the opposite). Mirrors the Debate Hall's FOR/AGAINST picker.
  const [challengeStand, setChallengeStand] = useState<"FOR" | "AGAINST">("FOR");

  // Challenge ids whose acceptance we've ALREADY acted on. Makes accept-handling
  // idempotent: a duplicate/late "request-accepted", or an effect re-running once
  // a duel ends, can never re-toast "accepted" or restart a finished duel.
  const processedAcceptedRef = useRef<Set<string>>(new Set());

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
      timestamp: Date.now(),
      // Debate stance chosen by the challenge sender (creator); accepter takes
      // the opposite. Carried on both the original request and the acceptance.
      stance: request.stance,
      extendedRounds: request.extendedRounds ?? false,
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

  useEffect(() => {
    // A peer accepted our challenge. Act on each accepted entry EXACTLY ONCE.
    // NOTE: deliberately NOT depending on activeDrill?.id — that was the bug:
    // when a duel ended (activeDrill → null) this effect re-ran and re-fired the
    // stale acceptance, restarting the finished duel.
    const accepted = incomingRequests.find(
      r => r.isAcceptedChallenge && !processedAcceptedRef.current.has(r.id)
    );
    if (accepted) {
      processedAcceptedRef.current.add(accepted.id);
      toast({ title: "Peer Accepted!", description: "Synchronizing combat start..." });
      handleAcceptRequest(accepted);
    }
    // Purge any already-handled accepted entries so a duplicate can't linger and
    // resurface as a stale notification after the duel is over.
    if (incomingRequests.some(r => r.isAcceptedChallenge && processedAcceptedRef.current.has(r.id))) {
      setIncomingRequests(prev =>
        prev.filter(r => !(r.isAcceptedChallenge && processedAcceptedRef.current.has(r.id)))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingRequests]);

  // Handle a request accepted from OUTSIDE the arena page (recipient tapped
  // ACCEPT in the header notification, then navigated here with router state).
  useEffect(() => {
    const request = location.state?.acceptRequest;
    if (request && !processedAcceptedRef.current.has(request.id)) {
      processedAcceptedRef.current.add(request.id);
      console.log("[Arena] Handling accepted request from navigation state:", request.id);
      handleAcceptRequest(request);
      // Clear router state via navigate — window.history.replaceState does NOT
      // update React Router's location.state, so without this the request would
      // replay on a later re-render (e.g. once the duel ends).
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const currentRank = getRankFromElo(profile.elo);
  const userName = user?.email?.split("@")[0] || "You";
  const currentUser = { name: userName, avatar: "👤", rank: currentRank, elo: profile.elo };

  // A live PvP debate: an accepted peer challenge whose gamemode is "debate".
  // The challenge sender (duel creator) is the host and argues FOR (opens first);
  // the accepter is the peer and argues AGAINST. AI/custom debates never match
  // here — they run through the Debate Hall (debateConfig) path instead.
  const pvpDebateConfig = (() => {
    if (!activeDrill || isCreating) return null;
    if (activeDrill.gamemode !== "debate") return null;
    if (typeof activeDrill.id === "string" && activeDrill.id.startsWith("ai-")) return null;
    const isHost = activeDrill.creator?.id === user?.id;
    const oppPlayer = isHost ? activeDrill.challenger : activeDrill.creator;
    if (!oppPlayer) return null;
    // The creator (challenge sender) argues the stance they picked; the accepter
    // argues the opposite. Defaults to FOR if an older request carried no stance.
    const hostStand: "FOR" | "AGAINST" = activeDrill.stance === "AGAINST" ? "AGAINST" : "FOR";
    const myStand: "FOR" | "AGAINST" = isHost ? hostStand : (hostStand === "FOR" ? "AGAINST" : "FOR");
    return {
      duelId: activeDrill.id,
      isHost,
      prompt: activeDrill.prompt,
      userStand: myStand,
      opponent: oppPlayer,
      opponentId: oppPlayer.id || "peer",
      roundFormat: activeDrill.extendedRounds ? "extended" : "standard" as "standard" | "extended",
    };
  })();

  // ── Phase 3: derived competitive stats ──────────────────────────────────
  const inPlacement = isInPlacement(profile);
  const matchesPlayed = getMatchesPlayed(profile);
  const winRate = matchesPlayed > 0 ? Math.round((profile.wins / matchesPlayed) * 100) : 0;
  const season = getSeasonInfo();
  // Pre-match preview: pass the selected gamemode + matchesPlayed so the estimate
  // reflects the real mode multiplier and placement K-factor boost.
  const eloAtStake = estimateEloAtStake(profile.elo, profile.elo, selectedMode, matchesPlayed);

  // Compute current win/loss streak from completedDuels (newest first).
  // Primary source: winner_id column (set by completeDuel / handleForfeit).
  // Fallback: score comparison (for older rows where winner_id wasn't stored).
  const streak = (() => {
    let count = 0;
    let type: "win" | "loss" | null = null;
    for (const d of completedDuels) {
      const isMine = d.creator.id === user?.id;
      const myScore  = isMine ? (d.creator.score  ?? 0) : (d.challenger?.score ?? 0);
      const oppScore = isMine ? (d.challenger?.score ?? 0) : (d.creator.score  ?? 0);

      let result: "win" | "loss" | null;
      if (d.winner === user?.id) {
        result = "win";
      } else if (d.winner && d.winner !== user?.id) {
        result = "loss";
      } else if (myScore > oppScore) {
        result = "win";
      } else if (oppScore > myScore) {
        result = "loss";
      } else {
        break; // tie or unknown — streak ends
      }

      if (type === null) type = result;
      if (result !== type) break;
      count++;
    }
    return { count, type };
  })();

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

  // Never flash the loading screen while a battle is in progress — it would unmount the
  // battle component and wipe all in-memory state. Loading flashes are caused by Supabase
  // JWT token auto-rotation triggering a re-render; the context now silences those, but
  // this guard is the final safety net.
  if (arenaLoading && !activeDrill && !debateConfig) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <Radar className="h-12 w-12 text-primary animate-spin-slow mb-4 opacity-20" />
                <p className="text-sm font-medium text-primary/60 animate-pulse">Loading your battles…</p>
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
              // max-h uses dvh (not vh) so on mobile the footer button isn't
              // pushed below the visible viewport / behind the bottom nav, which
              // happens with vh (it measures the LARGE viewport incl. browser UI).
              className="bg-card border border-border rounded-[2rem] md:rounded-[2.5rem] w-full max-w-2xl max-h-[88dvh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 md:p-8 border-b border-border flex justify-between items-center gap-3 bg-muted/30">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1">SESSION ARCHIVE</p>
                  <h3 className="speak-serif text-xl md:text-2xl font-bold italic truncate">{selectedDuel.gamemode.toUpperCase()} BATTLE</h3>
                </div>
                <button onClick={() => setSelectedDuel(null)} className="h-10 w-10 shrink-0 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-5 md:p-8 space-y-6 md:space-y-10">
                {/* Scoreboard — each side is flex-1 + min-w-0 so a long username
                    shrinks/truncates inside the box instead of overflowing it. */}
                <div className="flex items-center justify-center gap-3 md:gap-12 py-6 px-3 md:px-6 bg-muted/20 rounded-[2rem] border border-border">
                  <div className="text-center min-w-0 flex-1">
                    <div className="text-4xl md:text-5xl font-black mb-2">{selectedDuel.creator.score}</div>
                    <div className="flex items-center gap-2 justify-center min-w-0">
                      <div className={cn("h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] border", getRankColor(selectedDuel.creator.rank))}>{selectedDuel.creator.avatar}</div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40 truncate">{selectedDuel.creator.name}</span>
                    </div>
                  </div>
                  <div className="speak-serif text-2xl md:text-3xl opacity-20 italic shrink-0 self-center">vs</div>
                  <div className="text-center min-w-0 flex-1">
                    <div className="text-4xl md:text-5xl font-black mb-2">{selectedDuel.challenger?.score}</div>
                    <div className="flex items-center gap-2 justify-center min-w-0">
                      <div className={cn("h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] border", getRankColor(selectedDuel.challenger?.rank || currentRank))}>{selectedDuel.challenger?.avatar || "🤖"}</div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40 truncate">{selectedDuel.challenger?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Prompt */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2">
                    <Target className="h-3 w-3" /> THE CHALLENGE
                  </p>
                  <p className="speak-serif text-xl md:text-2xl italic leading-relaxed border-l-4 border-primary/20 pl-4 md:pl-6 py-2 break-words">
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
                      <p className="text-sm leading-relaxed opacity-70 italic font-medium break-words">
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
                  <div className="space-y-4 p-4 md:p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Mic className="h-3 w-3 shrink-0" /> HOW AN EXPERT WOULD SAY IT
                    </p>
                    <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap break-words">
                      {selectedDuel.exampleSpeech}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 md:p-8 border-t border-border bg-muted/10 flex justify-end">
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
          <motion.div id="tutorial-matchmaking-radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center">
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
             <motion.div id="tutorial-match-found" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55] bg-background flex flex-col items-center justify-center px-4">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 to-background pointer-events-none" />
               <h2 className="text-sm font-semibold text-primary mb-8 lg:mb-12 animate-pulse">Match found</h2>
               <div className="flex items-center gap-6 md:gap-12 z-10">
                 <div className="text-center">
                   <div className={cn("h-20 w-20 md:h-32 md:w-32 rounded-full border-4 flex items-center justify-center text-3xl md:text-5xl mb-3 bg-muted shadow-2xl", getRankColor(me.rank))}>
                     {me.avatar || "👤"}
                   </div>
                   <p className="text-base md:text-2xl font-bold truncate max-w-[110px] md:max-w-[150px] mx-auto">{me.name}</p>
                   <p className={cn("text-[10px] md:text-sm font-semibold mt-1", getRankColor(me.rank))}>{me.rank.name} {me.rank.tier}</p>
                 </div>

                 <div className="speak-serif text-3xl md:text-6xl italic opacity-30">vs</div>

                 <div className="text-center">
                   <div className={cn("h-20 w-20 md:h-32 md:w-32 rounded-full border-4 flex items-center justify-center text-3xl md:text-5xl mb-3 bg-muted shadow-2xl", getRankColor(opp.rank))}>
                     {opp.avatar || "🤖"}
                   </div>
                   <p className="text-base md:text-2xl font-bold truncate max-w-[110px] md:max-w-[150px] mx-auto">{opp.name}</p>
                   <p className={cn("text-[10px] md:text-sm font-semibold mt-1", getRankColor(opp.rank))}>{opp.rank.name} {opp.rank.tier}</p>
                 </div>
               </div>
               <p className="mt-10 lg:mt-16 text-sm opacity-60 font-medium">Get ready…</p>
             </motion.div>
           );
        })()}
      </AnimatePresence>

      {/* ── ELO Result Screen ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {eloUpdate && (() => {
          // Headline VICTORY/DEFEAT/DRAW follows the MATCH outcome (what the
          // verdict + match history say), NOT the sign of the ELO change. A real
          // win can carry a non-positive delta (sub-30 "near-silent" win, or a
          // placement landing below the seed) — that used to flash DEFEAT over a
          // match the user won. Fall back to the delta's sign only when the
          // emitter didn't supply an outcome (legacy/edge paths).
          const outcome = eloUpdate.outcome ?? (eloUpdate.change > 0 ? "win" : eloUpdate.change < 0 ? "loss" : "tie");
          const gained = outcome === "win";
          const lost   = outcome === "loss";
          // Rank movement tracks the actual rating change, independent of the
          // win/loss label, so we never claim "Rank Up" on a delta that fell.
          const eloRose = eloUpdate.change > 0;
          const eloFell = eloUpdate.change < 0;
          const oldRank = getRankFromElo(eloUpdate.newElo - eloUpdate.change);
          const newRank = getRankFromElo(eloUpdate.newElo);
          const rankChanged = newRank.name !== oldRank.name || newRank.tier !== oldRank.tier;
          const rankUp   = eloRose && rankChanged;
          const rankDown = eloFell && rankChanged;

          const accent = gained ? "#22c55e" : lost ? "#ef4444" : "#eab308";

          return (
            <motion.div
              id="tutorial-elo-update"
              key="elo-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 cursor-pointer"
              style={{ backgroundColor: "rgba(0,0,0,0.82)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
              onClick={() => setEloUpdate(null)}
            >
              {/* Ambient radial glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at center, ${accent}1a 0%, transparent 65%)` }}
              />

              <motion.div
                initial={{ scale: 0.82, opacity: 0, y: 32 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", stiffness: 230, damping: 22 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-sm rounded-[2.5rem] border-2 p-10 flex flex-col items-center text-center overflow-hidden"
                style={{ borderColor: `${accent}50`, backgroundColor: `${accent}08` }}
              >
                {/* Pulsing shimmer */}
                <motion.div
                  animate={{ opacity: [0, 0.07, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-[2.5rem] pointer-events-none"
                  style={{ backgroundColor: accent }}
                />

                {/* VICTORY / DEFEAT / DRAW */}
                <motion.p
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="relative z-10 text-[11px] font-black uppercase tracking-[0.5em] mb-8"
                  style={{ color: accent }}
                >
                  {gained ? "VICTORY" : lost ? "DEFEAT" : "DRAW"}
                </motion.p>

                {/* Big ELO delta */}
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.14, type: "spring", stiffness: 260, damping: 18 }}
                  className="relative z-10 speak-serif font-black italic leading-none tabular-nums"
                  style={{ fontSize: "clamp(5rem, 22vw, 9rem)", color: accent }}
                >
                  {eloUpdate.change > 0 ? "+" : ""}{eloUpdate.change}
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  transition={{ delay: 0.22 }}
                  className="relative z-10 text-[10px] font-black uppercase tracking-[0.5em] mt-2 mb-8"
                >
                  ELO
                </motion.p>

                {/* Old → New ELO */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="relative z-10 flex items-center gap-3 text-sm font-black tabular-nums text-foreground/50"
                >
                  <span>{eloUpdate.newElo - eloUpdate.change}</span>
                  <ArrowRight className="h-4 w-4 opacity-30" />
                  <span style={{ color: accent }}>{eloUpdate.newElo}</span>
                </motion.div>

                {/* Rank-up celebration — the loud 3D moment is earned here. The
                    new emblem punches in with a haptic scale-pop (overshoot
                    bounce) behind a radiating ring burst. Rank-downs stay
                    subdued (badge only, below). */}
                {rankUp && (
                  <div className="relative z-10 mt-8 h-20 flex items-center justify-center">
                    {[0, 1].map((i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0.45, opacity: 0.55 }}
                        animate={{ scale: 2.6 + i, opacity: 0 }}
                        transition={{ delay: 0.42 + i * 0.14, duration: 1 + i * 0.2, ease: "easeOut" }}
                        className="absolute inset-0 m-auto h-16 w-16 rounded-full pointer-events-none"
                        style={{ border: `2px solid ${accent}` }}
                      />
                    ))}
                    <motion.div
                      initial={{ scale: 0, rotate: -25 }}
                      animate={{ scale: [0, 1.35, 0.92, 1.08, 1], rotate: [-25, 8, -4, 3, 0] }}
                      transition={{ delay: 0.42, duration: 0.75, ease: "easeOut" }}
                    >
                      <RankEmblem rank={newRank} size="xl" />
                    </motion.div>
                  </div>
                )}

                {/* Rank change badge */}
                {rankChanged && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: rankUp ? 0.95 : 0.42, type: "spring", stiffness: 300 }}
                    className="relative z-10 mt-6 px-5 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest"
                    style={{ borderColor: `${accent}40`, backgroundColor: `${accent}12`, color: accent }}
                  >
                    {rankUp ? "↑ Rank Up" : "↓ Rank Down"} · {newRank.name} {newRank.tier}
                  </motion.div>
                )}

                {/* Dismiss hint */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  onClick={() => setEloUpdate(null)}
                  className="relative z-10 mt-10 text-[10px] font-black uppercase tracking-[0.4em] opacity-25 hover:opacity-60 transition-opacity"
                >
                  Tap to continue
                </motion.button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <section className="px-4 md:container pt-20 lg:pt-32 pb-32 lg:pb-16 relative z-10">
        <div id="arena-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">

          <div className="lg:col-span-6 space-y-6 lg:space-y-12">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 lg:space-y-6">
              {/* Season banner */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                  <Users className="h-3 w-3" /> Practice with peers
                </div>
                <motion.div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold"
                  animate={season.daysRemaining <= 7 ? {
                    boxShadow: ["0 0 0 0 rgba(245,158,11,0)", "0 0 0 6px rgba(245,158,11,0.15)", "0 0 0 0 rgba(245,158,11,0)"],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Calendar className="h-3 w-3" />
                  Season {season.seasonNumber} · {season.daysRemaining}d left
                </motion.div>
              </div>

              <h1 className="speak-serif text-4xl sm:text-5xl md:text-8xl tracking-tighter leading-[0.85] italic">
                Practice <span className="text-primary">Lounge.</span>
              </h1>
              <p className="text-base lg:text-lg opacity-60 leading-relaxed max-w-md">
                Match with other learners, get AI-powered feedback, and grow your skills.
              </p>

              {/* Real competitive stats */}
              <div className="hidden lg:grid grid-cols-3 gap-6 pt-8">
                 <motion.div
                   whileHover={{ y: -3 }}
                   transition={{ type: "spring", stiffness: 400, damping: 25 }}
                   className="p-4 rounded-3xl bg-muted/10 border border-border/50 backdrop-blur-md group cursor-default"
                 >
                    <Swords className="h-4 w-4 text-primary mb-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">RECORD</p>
                    <p className="speak-serif text-xl italic tabular-nums">
                      <AnimatedNumber value={profile.wins} /><span className="opacity-30">W</span>·<AnimatedNumber value={profile.losses} /><span className="opacity-30">L</span>
                    </p>
                    <p className="text-[10px] font-black opacity-40 mt-1">{winRate}% WIN RATE</p>
                 </motion.div>
                 <motion.div
                   whileHover={{ y: -3 }}
                   transition={{ type: "spring", stiffness: 400, damping: 25 }}
                   className="p-4 rounded-3xl bg-muted/10 border border-border/50 backdrop-blur-md group cursor-default"
                 >
                    <motion.div
                      animate={streak.type === "win" && streak.count >= 3 ? {
                        scale: [1, 1.15, 1],
                        rotate: [0, -8, 8, 0],
                      } : {}}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      className="inline-block"
                    >
                      <Flame className={cn("h-4 w-4 mb-3 opacity-40 group-hover:opacity-100 transition-opacity",
                        streak.type === "win" ? "text-orange-500" : streak.type === "loss" ? "text-red-500" : "text-primary",
                        streak.type === "win" && streak.count >= 3 && "opacity-100 drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]")} />
                    </motion.div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">
                      {streak.type === "win" ? "WIN STREAK" : streak.type === "loss" ? "LOSS STREAK" : "STREAK"}
                    </p>
                    <p className={cn("speak-serif text-xl italic tabular-nums",
                      streak.type === "win" && streak.count >= 3 && "text-orange-500")}>
                      {streak.count > 0 ? `${streak.type === "win" ? "+" : "−"}${streak.count}` : "—"}
                    </p>
                    <p className="text-[10px] font-black opacity-40 mt-1">{matchesPlayed} MATCHES</p>
                 </motion.div>
                 <motion.div
                   whileHover={{ y: -3 }}
                   transition={{ type: "spring", stiffness: 400, damping: 25 }}
                   className="p-4 rounded-3xl bg-muted/10 border border-border/50 backdrop-blur-md group cursor-default"
                 >
                    <Trophy className="h-4 w-4 text-amber-500 mb-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">ELO</p>
                    <p className="speak-serif text-xl italic tabular-nums">
                      <AnimatedNumber value={profile.elo} />
                    </p>
                    <p className="text-[10px] font-black opacity-40 mt-1">
                      {inPlacement ? "UNRANKED" : `${currentRank.name.toUpperCase()} ${currentRank.tier}`}
                    </p>
                 </motion.div>
              </div>
            </motion.div>

            <div className={cn(
              "relative overflow-hidden p-5 lg:p-8 rounded-3xl lg:rounded-[2.5rem] border backdrop-blur-xl flex items-center gap-4 lg:gap-8 group transition-all duration-500",
              inPlacement
                ? "border-slate-500/40 text-slate-500 dark:text-slate-300 dark:border-slate-300/40"
                : getRankColor(currentRank)
            )}>
               {/* Ambient breathing glow — only on ranked card */}
               {!inPlacement && (
                 <motion.div
                   className="absolute inset-0 pointer-events-none"
                   animate={{ opacity: [0.05, 0.15, 0.05] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   style={{
                     background: "radial-gradient(circle at 20% 50%, currentColor 0%, transparent 50%)",
                   }}
                 />
               )}
               <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
               <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  {inPlacement ? <Lock className="h-24 w-24 lg:h-40 lg:w-40" /> : <Trophy className="h-24 w-24 lg:h-40 lg:w-40" />}
               </div>

               <div className="relative h-16 w-16 lg:h-24 lg:w-24 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full border-4 border-current opacity-20 animate-spin-slow" />
                  <div className="absolute inset-2 rounded-full border border-current opacity-40" />
                  <div className="h-10 w-10 lg:h-16 lg:w-16 rounded-full bg-background flex items-center justify-center text-2xl lg:text-4xl shadow-2xl relative z-10 border border-current/20">
                    {inPlacement ? "?" : "👤"}
                  </div>
               </div>

               <div className="relative z-10 flex-grow space-y-2">
                 {inPlacement ? (
                   <>
                     <div className="flex items-center gap-2">
                       <span className="h-[1px] w-4 bg-current opacity-30" />
                       <p className="text-sm font-black uppercase tracking-[0.4em] opacity-60">PLACEMENT MATCH</p>
                     </div>
                     <div className="flex items-baseline gap-3">
                       <h2 className="speak-serif text-3xl lg:text-5xl font-black italic tracking-tighter">Unranked</h2>
                     </div>
                     <div className="space-y-2 pt-2">
                       <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
                         <span>NO RATING YET</span>
                         <span>1 BATTLE TO RANK</span>
                       </div>
                       <p className="text-sm font-black italic tracking-tight opacity-40">
                         Finish one battle — the judge sets your starting ELO from how you perform.
                       </p>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="flex items-center gap-2">
                       <span className="h-[1px] w-4 bg-current opacity-30" />
                       <p className="text-sm font-black uppercase tracking-[0.4em] opacity-60">MASTERY RANK</p>
                     </div>
                     <div className="flex items-baseline gap-3">
                       <h2 className="speak-serif text-3xl lg:text-5xl font-black italic tracking-tighter" style={{ color: 'inherit' }}>{currentRank.name}</h2>
                       <span className="text-sm font-black uppercase tracking-widest opacity-30">{currentRank.tier}</span>
                     </div>
                     {(() => {
                       // ELO v2: progress derived from getNextRankInfo (no more hardcoded 400-per-rank math).
                       const rankInfo = getNextRankInfo(profile.elo);
                       const span = rankInfo.nextRankFloor - rankInfo.rankFloor;
                       const pct = span > 0 ? (rankInfo.offsetInRank / span) * 100 : 100;
                       return (
                         <div className="space-y-2 pt-2">
                           <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
                             <span>{Math.max(ELO_FLOOR, profile.elo)} ELO</span>
                             <span>{rankInfo.isMaxRank ? "APEX" : `${rankInfo.nextRankFloor} ELO`}</span>
                           </div>
                           <div className="w-full bg-current/10 h-1.5 rounded-full overflow-hidden p-[1px]">
                             <motion.div
                               initial={{ width: 0 }}
                               animate={{ width: `${pct}%` }}
                               transition={{ duration: 1.5, ease: "easeOut" }}
                               className="h-full rounded-full bg-current shadow-[0_0_10px_currentColor]"
                             />
                           </div>
                           <p className="text-sm font-black italic tracking-tight opacity-40">
                             {rankInfo.isMaxRank
                               ? <>You've reached the <span className="text-foreground font-black">APEX RANK</span>.</>
                               : <>{rankInfo.pointsToNext} Points until <span className="text-foreground font-black">THE NEXT RANK</span></>}
                           </p>
                         </div>
                       );
                     })()}
                   </>
                 )}
               </div>
            </div>

            <div className="space-y-8 p-8 rounded-[2.5rem] bg-muted/20 border border-border relative overflow-hidden">
              <p className="text-sm font-black uppercase tracking-[0.4em] text-primary mb-6">SELECT PRACTICE MODE</p>
              
              <div id="arena-gamemodes" className="grid grid-cols-2 gap-3 relative z-10">
                {(Object.entries(GAMEMODES) as [Gamemode, typeof GAMEMODES.standard][]).map(([mode, data]) => (
                  <motion.button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className={cn(
                      "p-4 rounded-2xl border transition-colors text-left group relative overflow-hidden",
                      selectedMode === mode
                        ? "bg-primary border-primary text-white"
                        : "bg-background border-border text-foreground/40 hover:border-primary/50"
                    )}
                  >
                    {/* Selection sweep — only on active mode */}
                    {selectedMode === mode && (
                      <motion.div
                        layoutId="gamemode-active-sweep"
                        className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <Zap className={cn("h-4 w-4", selectedMode === mode ? "text-white" : "text-primary/40")} />
                      <span className="text-[11px] font-black opacity-40">{data.duration}S</span>
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest leading-tight relative z-10">{data.label}</p>
                  </motion.button>
                ))}
              </div>

              {/* ELO at stake indicator */}
              {!inPlacement && (
                <div className="flex items-center justify-between px-2">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">ELO AT STAKE</p>
                  <div className="flex items-center gap-3 text-[11px] font-black tabular-nums">
                    <span className="text-green-500">+<AnimatedNumber value={eloAtStake} /></span>
                    <span className="opacity-20">/</span>
                    <span className="text-red-500">−<AnimatedNumber value={eloAtStake} /></span>
                  </div>
                </div>
              )}

              {inPlacement && (
                <div className="flex items-center justify-between px-2 p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                    <Lock className="inline h-3 w-3 mr-1.5 -mt-0.5" />
                    PLACEMENT MATCH
                  </p>
                  <p className="text-[10px] font-medium opacity-50">Your result sets your starting ELO</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button
                   id="tutorial-find-partner"
                   onClick={() => {
                     if (selectedMode === "debate") {
                       setDebateSetupOpen(true);
                     } else {
                       handleFindMatch(selectedMode);
                     }
                   }}
                   className="btn-tactile btn-tactile-primary w-full py-6 rounded-2xl text-[12px] font-black uppercase tracking-wide flex items-center justify-center gap-3"
                 >
                   <Radar className="h-5 w-5" /> {selectedMode === "debate" ? "ENTER DEBATE HALL" : "FIND PARTNER"}
                 </button>
                 <button
                   onClick={() => {
                     // Debate has ONE experience (the turn-based Debate Hall /
                     // DebateBattle). Custom debates must not fall through to
                     // DuelDrill's old parallel-debate branch.
                     if (selectedMode === "debate") setDebateSetupOpen(true);
                     else setIsCreating(true);
                   }}
                   className="btn-tactile btn-tactile-surface w-full py-6 rounded-2xl text-sm font-black uppercase tracking-wide flex items-center justify-center gap-3"
                 >
                   <Zap className="h-4 w-4" /> NEW SESSION
                 </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6 lg:space-y-12">
            {/* Phase 3: Global rankings preview */}
            <ArenaLeaderboardPreview />

            {/* Online Combatants */}
            <div className="space-y-4 lg:space-y-8">
               <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold opacity-60">Active learners</h2>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                  <span className="text-xs font-semibold opacity-60 tabular-nums">{onlineUsers.length} online</span>
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
                          <p className="text-[11px] font-black opacity-30">{u.ranked === false ? "Unranked" : `${u.elo} ELO`}</p>
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
              <div id="tutorial-arena-history" className="space-y-3">
                {completedDuels.map(duel => {
                  const isMine    = duel.creator.id === user?.id;
                  const myScore   = isMine ? (duel.creator.score ?? 0)    : (duel.challenger?.score ?? 0);
                  const oppScore  = isMine ? (duel.challenger?.score ?? 0) : (duel.creator.score ?? 0);
                  const duelResult: "win" | "loss" | "tie" =
                    duel.winner === user?.id            ? "win"
                    : (duel.winner && duel.winner !== user?.id) ? "loss"
                    : myScore > oppScore                ? "win"
                    : oppScore > myScore                ? "loss"
                    :                                    "tie";

                  return (
                  <div
                    key={duel.id}
                    onClick={() => setSelectedDuel(duel)}
                    className={cn(
                      "p-4 rounded-2xl border flex items-center gap-4 group hover:bg-muted/20 transition-all cursor-pointer",
                      duelResult === "win"  ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10"
                      : duelResult === "loss" ? "bg-red-500/5    border-red-500/20    hover:bg-red-500/10"
                      :                         "bg-muted/10      border-border"
                    )}
                  >
                    {/* Result pill — left side */}
                    <div className={cn(
                      "shrink-0 w-12 flex flex-col items-center justify-center rounded-xl py-2 gap-0.5",
                      duelResult === "win"  ? "bg-emerald-500/20"
                      : duelResult === "loss" ? "bg-red-500/20"
                      :                         "bg-muted/30"
                    )}>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest leading-none",
                        duelResult === "win"  ? "text-emerald-400"
                        : duelResult === "loss" ? "text-red-400"
                        :                         "text-muted-foreground"
                      )}>
                        {duelResult === "win" ? "WIN" : duelResult === "loss" ? "LOSS" : "TIE"}
                      </span>
                      <span className={cn(
                        "text-lg font-black leading-none tabular-nums mt-0.5",
                        duelResult === "win"  ? "text-emerald-300"
                        : duelResult === "loss" ? "text-red-300"
                        :                         "text-muted-foreground"
                      )}>
                        {duelResult === "win" ? "▲" : duelResult === "loss" ? "▼" : "—"}
                      </span>
                    </div>

                    <div className="flex-grow min-w-0">
                      <p className="speak-serif text-sm italic opacity-60 truncate">"{duel.prompt}"</p>
                      {duel.feedback && (
                        <p className="text-sm opacity-40 mt-1 line-clamp-1 italic">"{duel.feedback}"</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                         <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">{duel.gamemode}</span>
                         <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-muted/20 text-foreground/40 group-hover:bg-primary/20 group-hover:text-primary transition-colors")}>
                           VIEW →
                         </span>
                      </div>
                    </div>

                    {/* Score pill */}
                    <div className="flex items-center gap-2 shrink-0 bg-muted/50 px-3 py-2 rounded-xl border border-border">
                      <span className={cn(
                        "text-xl font-black tabular-nums",
                        duelResult === "win" ? "text-emerald-400" : duelResult === "loss" ? "text-red-400" : "opacity-60"
                      )}>{myScore}</span>
                      <span className="text-[10px] font-black text-muted-foreground opacity-40">VS</span>
                      <span className="text-xl font-black tabular-nums opacity-60">{oppScore}</span>
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

      {/* ── Turn-based Debate Battle (NEW) ──────────────────────────────── */}
      <AnimatePresence>
        {debateConfig && (
          <DebateBattle
            key="debate-battle"
            prompt={debateConfig.prompt}
            userStand={debateConfig.stand}
            opponent={debateConfig.opponent}
            userElo={profile.elo}
            roundFormat={debateConfig.roundFormat}
            onClose={() => {
              setDebateConfig(null);
              refreshArena(true);
              // Show buffered ELO animation even when user closes via X
              if (pendingUpdate.current) {
                const upd = pendingUpdate.current;
                pendingUpdate.current = null;
                setTimeout(() => {
                  setEloUpdate(upd);
                  setTimeout(() => setEloUpdate(null), 5500);
                }, 500);
              }
            }}
            onComplete={() => {
              setDebateConfig(null);
              if (pendingUpdate.current) {
                const upd = pendingUpdate.current;
                pendingUpdate.current = null;
                setTimeout(() => {
                  setEloUpdate(upd);
                  setTimeout(() => setEloUpdate(null), 5500);
                }, 500);
              }
            }}
            completeDuel={completeDuel}
            handleForfeit={handleForfeit}
          />
        )}
      </AnimatePresence>

      {/* ── Debate Setup Modal (prompt + stand) ─────────────────────────── */}
      <AnimatePresence>
        {debateSetupOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => { setDebateSetupOpen(false); setDraftExtended(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-[2rem] p-6 md:p-10 max-w-2xl w-full shadow-2xl space-y-6 relative"
            >
              <button
                onClick={() => { setDebateSetupOpen(false); setDraftExtended(false); }}
                className="absolute top-5 right-5 h-9 w-9 rounded-full border border-border/60 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">DEBATE HALL</p>
                <h2 className="speak-serif text-3xl md:text-5xl italic tracking-tighter">
                  Set the <span className="text-primary">motion.</span>
                </h2>
                <p className="text-sm opacity-50 leading-relaxed">
                  Turn-based debate: opening arguments first, then rebuttals. Your live transcript appears as you speak.
                </p>
              </div>

              {/* Prompt input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-50">THE MOTION</label>
                  <button
                    onClick={async () => {
                      setDraftGenerating(true);
                      try {
                        const p = await generateArenaPrompt("debate");
                        setDraftPrompt(p);
                      } catch (err) {
                        console.error("[Arena] generateArenaPrompt failed:", err);
                        toast({ title: "AI unavailable", description: "All providers are down. Type your own motion or try again later.", variant: "destructive" });
                      } finally {
                        setDraftGenerating(false);
                      }
                    }}
                    disabled={draftGenerating}
                    className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all border border-primary/20"
                  >
                    {draftGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {draftGenerating ? "GENERATING..." : "GENERATE"}
                  </button>
                </div>
                <textarea
                  value={draftPrompt}
                  onChange={e => setDraftPrompt(e.target.value)}
                  placeholder='e.g. "This house believes social media has done more harm than good."'
                  className="w-full bg-muted/30 border border-border focus:border-primary outline-none rounded-2xl p-4 speak-serif text-lg italic tracking-tight leading-relaxed resize-none h-28 transition-colors"
                />
              </div>

              {/* Stand picker */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">YOUR STAND</label>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setDraftStand("FOR")}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all text-center",
                      draftStand === "FOR"
                        ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                        : "border-border bg-muted/20 text-foreground/40 hover:border-green-500/50"
                    )}
                  >
                    <p className="text-2xl speak-serif italic font-bold">FOR</p>
                    <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">Defend the motion</p>
                    <p className="text-[9px] font-black opacity-40 mt-1.5 uppercase tracking-widest">You speak first</p>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setDraftStand("AGAINST")}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all text-center",
                      draftStand === "AGAINST"
                        ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                        : "border-border bg-muted/20 text-foreground/40 hover:border-red-500/50"
                    )}
                  >
                    <p className="text-2xl speak-serif italic font-bold">AGAINST</p>
                    <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">Oppose the motion</p>
                    <p className="text-[9px] font-black opacity-40 mt-1.5 uppercase tracking-widest">Opponent opens</p>
                  </motion.button>
                </div>
              </div>

              {/* Round duration toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">ROUND DURATION</p>
                  <p className="text-[10px] opacity-40 mt-0.5">{draftExtended ? "90s opening · 60s rebuttal" : "45s opening · 30s rebuttal"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDraftExtended(v => !v)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    draftExtended
                      ? "bg-primary text-white border-primary shadow-glow"
                      : "bg-background border-border opacity-50 hover:opacity-100"
                  )}
                >
                  {draftExtended ? "EXTENDED" : "STANDARD"}
                </button>
              </div>

              {/* Format reminder */}
              <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-black uppercase tracking-widest opacity-50">
                <div className="p-2 rounded-xl bg-muted/20 border border-border/40">ROUND 1 · OPENING · {draftExtended ? "90s" : "45s"} each</div>
                <div className="p-2 rounded-xl bg-muted/20 border border-border/40">ROUND 2 · REBUTTAL · {draftExtended ? "60s" : "30s"} each</div>
              </div>

              <button
                disabled={!draftPrompt.trim() || draftGenerating}
                onClick={() => {
                  // Pick a random AI persona for variety
                  const personas = AI_PERSONAS;
                  const persona = personas[Math.floor(Math.random() * personas.length)];
                  const opponent = {
                    id: "ai",
                    name: `${persona.name} (AI)`,
                    avatar: persona.avatar,
                    rank: { name: "Adaptive", tier: "AI" } as any,
                    elo: 0,
                    score: null,
                    persona,
                  };
                  setDebateConfig({ prompt: draftPrompt.trim(), stand: draftStand, opponent, roundFormat: draftExtended ? "extended" : "standard" });
                  setDebateSetupOpen(false);
                }}
                className="w-full py-5 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-wide hover:scale-[1.02] active:scale-95 transition-all shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                <Swords className="h-4 w-4" />
                ENTER THE DEBATE HALL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live PvP turn-based debate ───────────────────────────────────────
          A peer challenge with the "debate" gamemode now runs the SAME
          turn-based DebateBattle as the Debate Hall (PvE) — just with a human
          opponent driven over the realtime channel — instead of the old
          parallel DuelDrill format. AI/custom debates never reach here (they go
          through the Debate Hall → debateConfig path). */}
      <AnimatePresence>
        {pvpDebateConfig && (
          <DebateBattle
            key={`pvp-debate-${pvpDebateConfig.duelId}`}
            prompt={pvpDebateConfig.prompt}
            userStand={pvpDebateConfig.userStand}
            opponent={pvpDebateConfig.opponent}
            userElo={profile.elo}
            roundFormat={pvpDebateConfig.roundFormat}
            onClose={() => { setActiveDrill(null); sessionStorage.removeItem("arena_active_drill"); refreshArena(true); }}
            onComplete={() => {
              setActiveDrill(null);
              sessionStorage.removeItem("arena_active_drill");
              refreshArena(true);
              if (pendingUpdate.current) {
                const upd = pendingUpdate.current;
                pendingUpdate.current = null;
                setTimeout(() => { setEloUpdate(upd); setTimeout(() => setEloUpdate(null), 5500); }, 500);
              }
            }}
            completeDuel={completeDuel}
            handleForfeit={handleForfeit}
            peer={{
              duelId: pvpDebateConfig.duelId,
              isHost: pvpDebateConfig.isHost,
              opponentId: pvpDebateConfig.opponentId,
              sendDebateLive,
              sendDebateTurnEnd,
              broadcastBattleResult,
              sendForfeit,
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isCreating || activeDrill) && !debateConfig && !pvpDebateConfig && (
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
            userElo={profile.elo}
            onClose={() => {
              setActiveDrill(null);
              setIsCreating(false);
              sessionStorage.removeItem("arena_active_drill");
              sessionStorage.removeItem("arena_is_creating");
              sessionStorage.removeItem("arena_drafting_done");
              sessionStorage.removeItem("arena_user_ready");
              sessionStorage.removeItem("arena_opponent_ready");
              sessionStorage.removeItem("arena_running");
              sessionStorage.removeItem("arena_finished");
              sessionStorage.removeItem("arena_seconds");
              sessionStorage.removeItem("arena_start_time");
              sessionStorage.removeItem("arena_has_fired_count");
              refreshArena(true);
            }}
            onComplete={(score, prompt, mode, feedback) => {
              if (isCreating) {
                toast({ title: "Custom Battle Recorded", description: "Your custom practice results have been saved." });
              }
              setActiveDrill(null);
              setIsCreating(false);
              sessionStorage.removeItem("arena_active_drill");
              sessionStorage.removeItem("arena_is_creating");
              sessionStorage.removeItem("arena_drafting_done");
              sessionStorage.removeItem("arena_user_ready");
              sessionStorage.removeItem("arena_opponent_ready");
              sessionStorage.removeItem("arena_running");
              sessionStorage.removeItem("arena_finished");
              sessionStorage.removeItem("arena_seconds");
              sessionStorage.removeItem("arena_start_time");
              sessionStorage.removeItem("arena_has_fired_count");
              if (pendingUpdate.current) {
                setTimeout(() => {
                  setEloUpdate(pendingUpdate.current);
                  pendingUpdate.current = null;
                  setTimeout(() => setEloUpdate(null), 5500);
                }, 500);
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

                   {challengeMode === "debate" && (
                     <div>
                       <label className="text-xs font-black uppercase tracking-widest opacity-40 mb-3 block">Your stand</label>
                       <div className="grid grid-cols-2 gap-3">
                         <button
                           type="button"
                           onClick={() => setChallengeStand("FOR")}
                           className={cn(
                             "p-4 rounded-xl border-2 transition-all text-center",
                             challengeStand === "FOR"
                               ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                               : "border-border bg-muted/20 text-foreground/40 hover:border-green-500/50"
                           )}
                         >
                           <p className="text-lg speak-serif italic font-bold">FOR</p>
                           <p className="text-[9px] font-black opacity-50 mt-1 uppercase tracking-widest">You speak first</p>
                         </button>
                         <button
                           type="button"
                           onClick={() => setChallengeStand("AGAINST")}
                           className={cn(
                             "p-4 rounded-xl border-2 transition-all text-center",
                             challengeStand === "AGAINST"
                               ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                               : "border-border bg-muted/20 text-foreground/40 hover:border-red-500/50"
                           )}
                         >
                           <p className="text-lg speak-serif italic font-bold">AGAINST</p>
                           <p className="text-[9px] font-black opacity-50 mt-1 uppercase tracking-widest">Opponent opens</p>
                         </button>
                       </div>
                       <p className="text-[10px] opacity-40 mt-2">{challengeTarget.name} argues the opposite side.</p>

                       {/* Round duration toggle */}
                       <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-muted/20 border border-border/40">
                         <div>
                           <p className="text-[10px] font-black uppercase tracking-widest">ROUND DURATION</p>
                           <p className="text-[10px] opacity-40 mt-0.5">{challengeExtended ? "90s opening · 60s rebuttal" : "45s opening · 30s rebuttal"}</p>
                         </div>
                         <button
                           type="button"
                           onClick={() => setChallengeExtended(v => !v)}
                           className={cn(
                             "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                             challengeExtended
                               ? "bg-primary text-white border-primary shadow-glow"
                               : "bg-background border-border opacity-50 hover:opacity-100"
                           )}
                         >
                           {challengeExtended ? "EXTENDED" : "STANDARD"}
                         </button>
                       </div>
                     </div>
                   )}

                   <div>
                     <div className="flex justify-between items-center mb-3">
                       <label className="text-xs font-black uppercase tracking-widest opacity-40 block">{challengeMode === "debate" ? "The Motion (Optional)" : "Custom Prompt (Optional)"}</label>
                       <button
                         onClick={async () => {
                           setGeneratingPrompt(true);
                           try {
                             const p = await generateArenaPrompt(challengeMode);
                             setChallengePrompt(p);
                           } catch (e) {
                             console.error("[Challenge] generateArenaPrompt failed:", e);
                             toast({ title: "AI unavailable", description: "All providers are down. Type your own prompt or leave blank.", variant: "destructive" });
                           } finally {
                             setGeneratingPrompt(false);
                           }
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
                        if (requestCooldown > 0) return;
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
                        sendDuelRequest(challengeTarget.id, challengeMode, finalPrompt, challengeMode === "debate" ? challengeStand : undefined, challengeMode === "debate" ? challengeExtended : false);
                        setChallengeTarget(null);
                        setChallengePrompt("");
                        setChallengeMode("standard");
                        setChallengeStand("FOR");
                        setChallengeExtended(false);
                     }}
                     className="w-full py-4 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-glow disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                     disabled={generatingPrompt || requestCooldown > 0}
                   >
                     {generatingPrompt ? (
                       <span className="flex items-center gap-2">
                         <Loader2 className="h-4 w-4 animate-spin" /> GENERATING PROMPT...
                       </span>
                     ) : requestCooldown > 0 ? (
                       `WAIT ${requestCooldown}s...`
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
