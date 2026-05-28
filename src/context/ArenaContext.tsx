import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { generateArenaPrompt } from "@/services/geminiService";
import { getRankFromElo, computeEloChange, STARTING_ELO, ELO_FLOOR, FORFEIT_PENALTY } from "@/hooks/arenaUtils";
import { arenaEmitter } from "@/lib/events";

export type Gamemode = "blitz" | "standard" | "debate" | "pitch";
export type RankTier = "III" | "II" | "I";
export type RankName = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export interface Rank { name: RankName; tier: RankTier; }

export interface DuelPlayer {
  id?: string;
  name: string;
  avatar: string;
  rank: Rank;
  elo: number;
  score: number | null;
  persona?: any;
}

export interface UserProfile { elo: number; wins: number; losses: number; }

export interface Duel {
  id: string;
  prompt: string;
  gamemode: Gamemode;
  creator: DuelPlayer;
  challenger: DuelPlayer | null;
  status: "open" | "completed";
  winner: string | null;
  feedback: string | null;
  oppFeedback?: string;
  strengths?: string;
  oppStrengths?: string;
  exampleSpeech?: string;
  timestamp: number;
  eloChange?: number;
}

export const AI_PERSONAS = [
  { name: "Echo", avatar: "🌊", personality: "Emotional and passionate.", skill: "Beginner", eloOffset: -200, strengths: "Emotional connection", weaknesses: "Lack of structure" },
  { name: "LogicBot", avatar: "🔢", personality: "Extremely structured.", skill: "Intermediate", eloOffset: 0, strengths: "Logical structure", weaknesses: "Lacks charisma" },
  { name: "Persuado", avatar: "🎭", personality: "Charismatic and theatrical.", skill: "Advanced", eloOffset: 200, strengths: "Rhetoric", weaknesses: "Over-exaggeration" },
  { name: "NeuroJudge", avatar: "🧠", personality: "Philosophical and nuanced.", skill: "Expert", eloOffset: 400, strengths: "Nuance", weaknesses: "Too wordy" }
];

// ELO change is now computed by `computeEloChange` in arenaUtils.
// It takes scores, mode, AI flag, Bo3, placement state — see arenaUtils.ts for full rules.

interface ArenaContextType {
  duels: Duel[];
  profile: UserProfile;
  loading: boolean;
  onlineUsers: any[];
  incomingRequests: any[];
  refresh: (silent?: boolean) => Promise<void>;
  setIncomingRequests: React.Dispatch<React.SetStateAction<any[]>>;
  sendDuelRequest: (targetUserId: string, gamemode: Gamemode, prompt: string) => Promise<void>;
  acceptDuelRequest: (request: any) => Promise<void>;
  sendReadyStatus: (duelId: string, isReady: boolean) => Promise<void>;
  sendForfeit: (duelId: string) => Promise<void>;
  handleForfeit: (duelId: string, isMe: boolean, duelObj: Duel) => Promise<void>;
  completeDuel: (duelId: string, challengerName: string, creatorScore: number, challengerScore: number, feedback: string, duelObj: Duel, explicitWinner?: string, details?: { strengths?: string, oppStrengths?: string, oppFeedback?: string, exampleSpeech?: string }) => Promise<void>;
  broadcastBattleResult: (duelId: string, results: any) => Promise<void>;
  broadcastAnalyzing: (duelId: string) => Promise<void>;
  sendTranscript: (duelId: string, transcript: string) => Promise<void>;
  findMatch: (mode: Gamemode) => Promise<any>;
  completedDuels: Duel[];
}

const ArenaContext = createContext<ArenaContextType | undefined>(undefined);

export const ArenaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ elo: STARTING_ELO, wins: 0, losses: 0 });
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const arenaChannel = useRef<any>(null);

  // Authoritative battle-result submitter. Replaces the previous client-side
  // `persistElo` + direct `arena_battles` insert combo, both of which let any
  // user PATCH their own row to arbitrary ratings. The edge function recomputes
  // ELO from server-side inputs (current ELO from DB, match count from DB,
  // opponent ELO from DB when opponent is a real user) and writes both the
  // battle row and the new ELO atomically.
  //
  // Returns the server's authoritative `{ newElo, eloChange }`. On failure
  // returns the client's optimistic value so the in-session UI still moves —
  // but a destructive toast surfaces so silent edge-function / RLS / deploy
  // issues become visible instead of leaving the leaderboard stuck.
  const submitBattleResult = async (input: {
    duelObj: Duel;
    isAi: boolean;
    isTie?: boolean;
    isForfeit?: "self" | "opponent" | null;
    isCustom?: boolean;
    myScore: number | null;
    oppScore: number | null;
    opponent: { id?: string | null; name?: string; avatar?: string; elo?: number };
    feedback?: string;
    strengths?: string;
    oppStrengths?: string;
    oppFeedback?: string;
    exampleSpeech?: string;
    /** Fallback ELO to display if the server is unreachable. */
    fallbackNewElo: number;
    fallbackEloChange: number;
  }): Promise<{ newElo: number; eloChange: number }> => {
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok?: boolean; newElo?: number; eloChange?: number; error?: string;
      }>("submit-battle-result", {
        body: {
          duelId: input.duelObj.id,
          gamemode: input.duelObj.gamemode,
          isAi: input.isAi,
          isTie: input.isTie ?? false,
          isForfeit: input.isForfeit ?? null,
          isCustom: input.isCustom ?? false,
          myScore: input.myScore,
          oppScore: input.oppScore,
          opponent: {
            id: input.opponent.id ?? null,
            name: input.opponent.name,
            avatar: input.opponent.avatar,
          },
          // Channel for AI opponents: the persona ELO is hardcoded in
          // AI_PERSONAS, so we pass it through under a private field so the
          // server can bound-check + use it without trusting the client for
          // real users.
          _aiOppElo: input.isAi ? input.opponent.elo : undefined,
          prompt: input.duelObj.prompt,
          feedback: input.feedback,
          strengths: input.strengths,
          oppStrengths: input.oppStrengths,
          oppFeedback: input.oppFeedback,
          exampleSpeech: input.exampleSpeech,
        },
      });

      if (error || data?.error) {
        console.error("[ArenaContext] submitBattleResult failed:", error || data?.error);
        toast({
          title: "Rating didn't save",
          description: `Battle couldn't be recorded server-side (${error?.message || data?.error}). Showing local estimate.`,
          variant: "destructive",
        });
        return { newElo: input.fallbackNewElo, eloChange: input.fallbackEloChange };
      }

      const newElo = data?.newElo ?? input.fallbackNewElo;
      const eloChange = data?.eloChange ?? input.fallbackEloChange;
      console.log(`[ArenaContext] battle submitted: ${eloChange >= 0 ? "+" : ""}${eloChange} → ${newElo}`);
      return { newElo, eloChange };
    } catch (e) {
      console.error("[ArenaContext] submitBattleResult threw:", e);
      toast({
        title: "Rating didn't save",
        description: "Couldn't reach the battle-result service. Your rating wasn't updated.",
        variant: "destructive",
      });
      return { newElo: input.fallbackNewElo, eloChange: input.fallbackEloChange };
    }
  };

  const refresh = useCallback(async (silent = false) => {
    if (!user) { setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const { data: profData } = await supabase.from("profiles").select("elo").eq("id", user.id).maybeSingle();
      const { data: battleData, error } = await supabase
        .from("arena_battles")
        .select("*")
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      const userIds = new Set<string>();
      if (battleData) {
        battleData.forEach(b => {
          if (b.challenger_id) userIds.add(b.challenger_id);
          if (b.opponent_id) userIds.add(b.opponent_id);
        });
      }

      const { data: profileList } = await supabase
        .from("profiles")
        .select("id, display_name, elo")
        .in("id", Array.from(userIds));
      
      const profileMap = new Map(profileList?.map(p => [p.id, p]) || []);

      let wins = 0, losses = 0;
      if (battleData) {
        battleData.forEach(b => {
          const isUserChallenger = b.challenger_id === user.id;
          const userScore = isUserChallenger ? b.challenger_score : b.opponent_score;
          const oppScore = isUserChallenger ? b.opponent_score : b.challenger_score;

          if (b.winner_id === user.id) {
            wins++;
          } else if (b.winner_id || oppScore > userScore) {
            losses++;
          }
        });

        const formatted: Duel[] = battleData.map(b => {
          const hostProf = profileMap.get(b.challenger_id);
          const oppProf = profileMap.get(b.opponent_id);
          
          return {
            id: b.id, 
            prompt: b.prompt, 
            gamemode: b.gamemode as Gamemode, 
            status: "completed", 
            timestamp: new Date(b.created_at).getTime(), 
            winner: b.winner_id, 
            feedback: b.verdict,
            oppFeedback: b.opp_feedback,
            strengths: b.strengths,
            oppStrengths: b.opp_strengths,
            exampleSpeech: b.example_speech,
            creator: { 
              id: b.challenger_id, 
              name: hostProf?.display_name || (b.challenger_id === user.id ? user.email?.split("@")[0] : "Player"), 
              score: b.challenger_score, avatar: "👤", 
              elo: hostProf?.elo ?? 0, 
              rank: getRankFromElo(hostProf?.elo ?? 0) 
            },
            challenger: { 
              id: b.opponent_id || "ai", 
              name: oppProf?.display_name || (b.opponent_id ? "Opponent" : "AI Judge"), 
              score: b.opponent_score, avatar: "🤖", 
              elo: oppProf?.elo ?? 0, 
              rank: getRankFromElo(oppProf?.elo ?? 0) 
            }
          };
        });
        setDuels(formatted);
      }
      // Brand-new accounts (or pre-v2 rows that defaulted to 0) get bumped to STARTING_ELO client-side
      // until the DB migration backfills them. Floor everything at ELO_FLOOR so no UI ever shows < 100.
      const rawElo = profData?.elo ?? STARTING_ELO;
      const dbElo = rawElo < ELO_FLOOR ? STARTING_ELO : rawElo;
      setProfile({ elo: dbElo, wins, losses });
    } catch (e) { 
      console.error("[ArenaContext] Refresh failed:", e);
    } finally { 
      setLoading(false); 
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("arena_lobby", { config: { presence: { key: user.id } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const newState = channel.presenceState();
        const users: any[] = [];
        Object.keys(newState).forEach((key) => {
          if (key === user.id) return;
          const presences = newState[key] as any[];
          const p = presences[presences.length - 1];
          if (p && p.user) users.push(p.user);
        });
        
        // Inject fake user for tutorial if pending
        if (localStorage.getItem("speakbold_tutorial_pending") === "true") {
          if (!users.find(u => u.id === "tutorial-fake-user")) {
            users.push({
              id: "tutorial-fake-user",
              name: "Alex (Trainer)",
              avatar: "🎯",
              rank: { name: "Silver", tier: "II" },
              elo: 650
            });
          }
        }
        
        setOnlineUsers(users);
      })
      .on("broadcast", { event: "duel-request" }, ({ payload }) => {
        if (payload.targetUserId === user.id) setIncomingRequests(prev => prev.some(r => r.id === payload.id) ? prev : [payload, ...prev]);
      })
      .on("broadcast", { event: "request-accepted" }, ({ payload }) => {
        if (payload.senderId === user.id) setIncomingRequests(prev => [{ ...payload, isAcceptedChallenge: true }, ...prev]);
      })
      .on("broadcast", { event: "ready-status" }, ({ payload }) => arenaEmitter.emit("arena:ready-status", payload))
      .on("broadcast", { event: "battle-result" }, ({ payload }) => arenaEmitter.emit("arena:battle-result", payload))
      .on("broadcast", { event: "battle-analyzing" }, ({ payload }) => arenaEmitter.emit("arena:battle-analyzing", payload))
      .on("broadcast", { event: "battle-transcript" }, ({ payload }) => arenaEmitter.emit("arena:battle-transcript", payload))
      .on("broadcast", { event: "battle-forfeit" }, ({ payload }) => arenaEmitter.emit("arena:battle-forfeit", payload))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user: { 
              id: user.id, 
              name: user.email?.split("@")[0] || "Anonymous", 
              avatar: "👤", 
              rank: getRankFromElo(profile.elo), 
              elo: profile.elo,
              status: "idle" // Default status
            },
            online_at: new Date().toISOString(),
          });
        }
      });
    arenaChannel.current = channel;
    return () => { supabase.removeChannel(channel); arenaChannel.current = null; };
  }, [user, profile.elo]);

  const sendDuelRequest = async (targetUserId: string, gamemode: Gamemode, prompt: string) => {
    if (!user || !arenaChannel.current) return;
    await arenaChannel.current.send({ type: "broadcast", event: "duel-request", payload: { id: `req-${user.id}-${Date.now()}`, senderId: user.id, senderName: user.email?.split("@")[0], senderRank: getRankFromElo(profile.elo), targetUserId, gamemode, prompt } });
    toast({ title: "Request Sent", description: "Waiting for opponent..." });
  };

  const acceptDuelRequest = async (request: any) => {
    if (!user || !arenaChannel.current) return;
    await arenaChannel.current.send({ type: "broadcast", event: "request-accepted", payload: { ...request, targetId: user.id, targetName: user.email?.split("@")[0], targetRank: getRankFromElo(profile.elo) } });
  };

  const sendReadyStatus = async (duelId: string, isReady: boolean) => {
    if (arenaChannel.current) arenaChannel.current.send({ type: "broadcast", event: "ready-status", payload: { duelId, userId: user.id, isReady } });
  };
  
  const sendForfeit = async (duelId: string) => {
    if (arenaChannel.current) arenaChannel.current.send({ type: "broadcast", event: "battle-forfeit", payload: { duelId, userId: user.id } });
  };

  const sendTranscript = async (duelId: string, transcript: string) => {
    if (arenaChannel.current) arenaChannel.current.send({ type: "broadcast", event: "battle-transcript", payload: { duelId, userId: user?.id, transcript } });
  };
  
  const broadcastBattleResult = async (duelId: string, results: any) => {
    if (arenaChannel.current) arenaChannel.current.send({ type: "broadcast", event: "battle-result", payload: { duelId, ...results } });
  };

  const broadcastAnalyzing = async (duelId: string) => {
    if (arenaChannel.current) arenaChannel.current.send({ type: "broadcast", event: "battle-analyzing", payload: { duelId } });
  };

  const handleForfeit = async (duelId: string, isMe: boolean, duelObj: Duel) => {
    if (!user) return;
    const myElo = profile.elo ?? STARTING_ELO;
    const isCreator = duelObj.creator.id === user.id;
    const oppElo = isCreator ? (duelObj.challenger?.elo ?? STARTING_ELO) : (duelObj.creator.elo ?? STARTING_ELO);
    const oppId = isCreator ? duelObj.challenger?.id : duelObj.creator.id;
    const isAi = !oppId || oppId === "ai" || oppId.startsWith("ai-") || oppId.startsWith("tutorial-");

    // New formula: self-forfeit = flat -FORFEIT_PENALTY; opponent-forfeit = clean 80-20 win.
    const eloChange = computeEloChange({
      myElo,
      oppElo,
      myScore: null,
      oppScore: null,
      matchesPlayed: profile.wins + profile.losses,
      mode: duelObj.gamemode,
      isAi,
      isForfeit: isMe ? "self" : "opponent",
    });

    const newElo = Math.max(ELO_FLOOR, myElo + eloChange);

    try {
      // ── Optimistic local update ───────────────────────────────────────────
      // Update UI immediately — don't wait for the round-trip to the server.
      // The authoritative value below replaces this once the edge function
      // returns; if the function is unreachable, the optimistic value sticks
      // and a toast surfaces.
      setProfile(prev => ({
        ...prev,
        elo: newElo,
        wins:   isMe ? prev.wins   : prev.wins + 1,
        losses: isMe ? prev.losses + 1 : prev.losses,
      }));

      // ── Persist via authoritative edge function ───────────────────────────
      // Edge function recomputes ELO server-side from DB-read inputs (not the
      // client payload), writes the arena_battles row, then updates profiles.
      // Replaces the old direct-UPDATE path which let any user PATCH their own
      // rating to anything they wanted.
      const opponent = isCreator ? duelObj.challenger : duelObj.creator;
      const { newElo: serverElo, eloChange: serverDelta } = await submitBattleResult({
        duelObj,
        isAi,
        isForfeit: isMe ? "self" : "opponent",
        myScore: null,
        oppScore: null,
        opponent: {
          id: opponent?.id,
          name: opponent?.name,
          avatar: opponent?.avatar,
          elo: opponent?.elo,
        },
        feedback: isMe ? "Player forfeited the match." : "Opponent forfeited the match.",
        fallbackNewElo: newElo,
        fallbackEloChange: eloChange,
      });

      // Reconcile with the server-authoritative value
      if (serverElo !== newElo) {
        setProfile(prev => ({ ...prev, elo: serverElo }));
      }

      await refresh(true);
      arenaEmitter.emit("elo:updated", { change: serverDelta, newElo: serverElo });
    } catch (e) {
      console.error("[ArenaContext] handleForfeit failed:", e);
    }
  };

  const completeDuel = async (duelId: string, challengerName: string, creatorScore: number, challengerScore: number, feedback: string, duelObj: Duel, explicitWinner?: string, details?: { strengths?: string, oppStrengths?: string, oppFeedback?: string, exampleSpeech?: string }) => {
    if (!user) return;
    const isChallenger = duelObj.challenger?.id === user?.id;
    const isAI = duelId.includes("ai");
    const isCustom = duelId.includes("custom");
    const myScore = isChallenger ? challengerScore : creatorScore;
    const oppScore = isChallenger ? creatorScore : challengerScore;

    let won = explicitWinner === "you";
    let tie = explicitWinner === "tie";
    if (!explicitWinner) {
      won = myScore > oppScore;
      tie = myScore === oppScore;
    }

    const myElo = profile.elo ?? STARTING_ELO;
    const oppElo = isChallenger ? (duelObj.creator.elo ?? STARTING_ELO) : (duelObj.challenger?.elo ?? STARTING_ELO);

    // Custom solo sessions and ties don't move ELO.
    // Ties are "not counted" — no W/L change and no rating movement.
    const eloChange = (isCustom || tie) ? 0 : computeEloChange({
      myElo,
      oppElo,
      myScore,
      oppScore,
      matchesPlayed: profile.wins + profile.losses,
      mode: duelObj.gamemode,
      isAi: isAI,
      isTie: false,
    });

    const newElo = Math.max(ELO_FLOOR, myElo + eloChange);

    try {
      // ── Optimistic local update ───────────────────────────────────────────
      // UI moves instantly; server-authoritative values reconcile below.
      setProfile(prev => ({
        ...prev,
        elo:    isCustom ? prev.elo : newElo,
        wins:   won  ? prev.wins   + 1 : prev.wins,
        losses: (!won && !tie) ? prev.losses + 1 : prev.losses,
      }));

      // ── Persist via authoritative edge function ───────────────────────────
      // The function recomputes ELO server-side from DB-read inputs and writes
      // both the arena_battles row AND profiles.elo atomically. Replaces the
      // old client-UPDATE path which let any user PATCH their own rating.
      const opponent = isChallenger ? duelObj.creator : duelObj.challenger;
      const { newElo: serverElo, eloChange: serverDelta } = await submitBattleResult({
        duelObj,
        isAi: isAI,
        isTie: tie,
        isCustom,
        myScore,
        oppScore,
        opponent: {
          id: opponent?.id,
          name: opponent?.name,
          avatar: opponent?.avatar,
          elo: opponent?.elo,
        },
        feedback,
        strengths: details?.strengths,
        oppStrengths: details?.oppStrengths,
        oppFeedback: details?.oppFeedback,
        exampleSpeech: details?.exampleSpeech,
        fallbackNewElo: newElo,
        fallbackEloChange: eloChange,
      });

      // Reconcile with the server-authoritative ELO if it differs
      if (!isCustom && serverElo !== newElo) {
        setProfile(prev => ({ ...prev, elo: serverElo }));
      }
      const persistedElo = serverElo;
      const persistedDelta = serverDelta;

      // ── Mark daily practice streak ────────────────────────────────────────
      // Arena battles count toward the daily streak just like Pathway drills.
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const { data: row } = await supabase.from("streaks").select("count, last_day").eq("user_id", user.id).maybeSingle();
        if (!row) {
          // First ever streak entry
          await supabase.from("streaks").insert({ user_id: user.id, count: 1, last_day: todayStr });
        } else if (row.last_day !== todayStr) {
          // New day — extend or reset streak
          const gap = Math.round((new Date(todayStr + 'T00:00:00').getTime() - new Date(row.last_day + 'T00:00:00').getTime()) / 86_400_000);
          const next = gap === 1 ? (row.count ?? 0) + 1 : 1;
          await supabase.from("streaks").update({ count: next, last_day: todayStr }).eq("user_id", user.id);
        }
        // else: already practiced today — no change
      } catch { /* streak update is non-critical */ }

      await refresh(true);
      arenaEmitter.emit("elo:updated", { change: persistedDelta, newElo: persistedElo });
    } catch (e) {
      console.error("[ArenaContext] completeDuel failed:", e);
    }
  };

  const pickPersonaByElo = (userElo: number) => {
    // Bronze <600: mostly Echo, occasionally LogicBot
    if (userElo < 600) {
      return Math.random() < 0.7 ? AI_PERSONAS[0] : AI_PERSONAS[1];
    }
    // Silver 600–1199: LogicBot primary, slight chance of Echo or Persuado
    if (userElo < 1200) {
      const r = Math.random();
      if (r < 0.20) return AI_PERSONAS[0]; // Echo
      if (r < 0.75) return AI_PERSONAS[1]; // LogicBot
      return AI_PERSONAS[2];               // Persuado
    }
    // Gold 1200–1799: Persuado primary, some LogicBot and NeuroJudge
    if (userElo < 1800) {
      const r = Math.random();
      if (r < 0.10) return AI_PERSONAS[1]; // LogicBot
      if (r < 0.70) return AI_PERSONAS[2]; // Persuado
      return AI_PERSONAS[3];               // NeuroJudge
    }
    // Platinum+ 1800+: NeuroJudge dominant
    return Math.random() < 0.30 ? AI_PERSONAS[2] : AI_PERSONAS[3];
  };

  const findMatch = async (mode: Gamemode): Promise<any> => {
    let dynamicPrompt = await generateArenaPrompt(mode);
    if (mode === "debate") {
      const isFor = Math.random() > 0.5;
      dynamicPrompt = `${dynamicPrompt}\n\n(You are arguing ${isFor ? "FOR" : "AGAINST"} this topic. Your opponent is arguing ${!isFor ? "FOR" : "AGAINST"}.)`;
    }
    return new Promise(resolve => {
      setTimeout(() => {
        const persona = pickPersonaByElo(profile.elo);
        const match = {
          id: `ai-duel-${Date.now()}`,
          creator: { id: user?.id, name: user?.email?.split("@")[0] || "You", avatar: "👤", elo: profile.elo, rank: getRankFromElo(profile.elo), score: 0 },
          challenger: { id: `ai-${Date.now()}`, name: `${persona.name} (AI)`, avatar: persona.avatar, elo: Math.max(ELO_FLOOR, profile.elo + persona.eloOffset), rank: getRankFromElo(Math.max(ELO_FLOOR, profile.elo + persona.eloOffset)), score: null, persona },
          prompt: dynamicPrompt, gamemode: mode, status: "active"
        };
        resolve(match);
      }, 2000);
    });
  };

  const updateStatus = useCallback(async (status: "idle" | "battling") => {
    if (!user || !arenaChannel.current) return;
    await arenaChannel.current.track({
      user: { 
        id: user.id, 
        name: user.email?.split("@")[0] || "Anonymous", 
        avatar: "👤", 
        rank: getRankFromElo(profile.elo), 
        elo: profile.elo,
        status 
      },
      online_at: new Date().toISOString(),
    });
  }, [user, profile.elo]);

  // Only show the full loading screen on the very first load.
  // Subsequent refreshes (auth token rotation, background re-fetches) run silently
  // so the "SYNCHRONIZING..." screen never flashes while a battle is active.
  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (!user) return;
    if (hasLoadedOnce.current) {
      refresh(true); // silent — no loading flash
    } else {
      hasLoadedOnce.current = true;
      refresh();     // show loading screen on the very first page visit only
    }
  }, [user, refresh]);

  return (
    <ArenaContext.Provider value={{
      duels, profile, loading, onlineUsers, incomingRequests, refresh, setIncomingRequests,
      sendDuelRequest, acceptDuelRequest, sendReadyStatus, sendForfeit, handleForfeit, completeDuel, broadcastBattleResult,
      broadcastAnalyzing, sendTranscript, findMatch, updateStatus,
      completedDuels: duels.filter(d => d.status === "completed")
    }}>
      {children}
    </ArenaContext.Provider>
  );
};

export const useArenaContext = () => {
  const context = useContext(ArenaContext);
  if (context === undefined) throw new Error("useArenaContext must be used within an ArenaProvider");
  return context;
};
