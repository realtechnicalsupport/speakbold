import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { generateArenaPrompt } from "@/services/geminiService";
import { getRankFromElo } from "@/hooks/arenaUtils";

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

const calculateEloChange = (myElo: number, opponentElo: number, won: boolean): number => {
  const K = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));
  const actualScore = won ? 1 : 0;
  const change = Math.round(K * (actualScore - expectedScore));
  if (change === 0) return won ? 1 : -1;
  return change;
};

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
  const [profile, setProfile] = useState<UserProfile>({ elo: 0, wins: 0, losses: 0 });
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const arenaChannel = useRef<any>(null);

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
      let dbElo = profData?.elo ?? 0;
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
      .on("broadcast", { event: "ready-status" }, ({ payload }) => window.dispatchEvent(new CustomEvent("arena-ready-status", { detail: payload })))
      .on("broadcast", { event: "battle-result" }, ({ payload }) => window.dispatchEvent(new CustomEvent("arena-battle-result", { detail: payload })))
      .on("broadcast", { event: "battle-analyzing" }, ({ payload }) => window.dispatchEvent(new CustomEvent("arena-battle-analyzing", { detail: payload })))
      .on("broadcast", { event: "battle-transcript" }, ({ payload }) => window.dispatchEvent(new CustomEvent("arena-battle-transcript", { detail: payload })))
      .on("broadcast", { event: "battle-forfeit" }, ({ payload }) => window.dispatchEvent(new CustomEvent("arena-battle-forfeit", { detail: payload })))
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
    const penalty = 0;
    const eloChange = isMe ? -penalty : penalty;
    
    try {
      await supabase.rpc('add_user_elo', { user_id: user.id, elo_amount: eloChange });
      
      const payload = {
        challenger_id: duelObj.creator.id,
        opponent_id: duelObj.challenger?.id,
        prompt: duelObj.prompt,
        gamemode: duelObj.gamemode,
        challenger_score: isMe ? 0 : 100,
        opponent_score: isMe ? 100 : 0,
        verdict: isMe ? "Player forfeited the match." : "Opponent forfeited the match.",
        winner_id: isMe ? (duelObj.challenger?.id || duelObj.creator.id) : user.id
      };
      
      await supabase.from("arena_battles").insert(payload);
      await refresh(true);
      window.dispatchEvent(new CustomEvent("elo-updated", { detail: { change: eloChange, newElo: Math.max(0, profile.elo + eloChange) } }));
    } catch (e) {
      console.error("[ArenaContext] handleForfeit failed:", e);
    }
  };

  const completeDuel = async (duelId: string, challengerName: string, creatorScore: number, challengerScore: number, feedback: string, duelObj: Duel, explicitWinner?: string, details?: { strengths?: string, oppStrengths?: string, oppFeedback?: string, exampleSpeech?: string }) => {
    if (!user) return;
    const isChallenger = duelObj.challenger?.id === user?.id;
    const isAI = duelId.includes("ai");
    const myScore = isChallenger ? challengerScore : creatorScore;
    const oppScore = isChallenger ? creatorScore : challengerScore;

    let won = explicitWinner === "you";
    let tie = explicitWinner === "tie";
    if (!explicitWinner) {
      won = myScore > oppScore;
      tie = myScore === oppScore;
    }

    const myElo = profile.elo || 0;
    const oppElo = isChallenger ? (duelObj.creator.elo || 0) : (duelObj.challenger?.elo || 0);
    const eloChange = tie ? 0 : calculateEloChange(myElo, oppElo, won);

    try {
      await supabase.rpc('add_user_elo', { user_id: user.id, elo_amount: eloChange });
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      
      const payload = {
        challenger_id: isUuid(duelObj.creator.id || "") ? duelObj.creator.id : user.id, 
        opponent_id: isUuid(duelObj.challenger?.id || "") ? duelObj.challenger?.id : null, 
        prompt: duelObj.prompt, 
        gamemode: duelObj.gamemode, 
        challenger_score: creatorScore, 
        opponent_score: challengerScore, 
        verdict: feedback, 
        strengths: details?.strengths,
        opp_strengths: details?.oppStrengths,
        opp_feedback: details?.oppFeedback,
        example_speech: details?.exampleSpeech,
        winner_id: won ? user.id : (tie ? null : (isAI ? null : (isChallenger ? duelObj.creator.id : duelObj.challenger?.id)))
      };

      await supabase.from("arena_battles").insert(payload);
      await refresh(true);
      window.dispatchEvent(new CustomEvent("elo-updated", { detail: { change: eloChange, newElo: Math.max(0, myElo + eloChange) } }));
    } catch (e) { 
      console.error("[ArenaContext] completeDuel failed:", e);
    }
  };

  const findMatch = async (mode: Gamemode): Promise<any> => {
    const dynamicPrompt = await generateArenaPrompt(mode);
    return new Promise(resolve => {
      setTimeout(() => {
        const persona = AI_PERSONAS[Math.floor(Math.random() * AI_PERSONAS.length)];
        const match = {
          id: `ai-duel-${Date.now()}`,
          creator: { id: user?.id, name: user?.email?.split("@")[0] || "You", avatar: "👤", elo: profile.elo, rank: getRankFromElo(profile.elo), score: 0 },
          challenger: { id: `ai-${Date.now()}`, name: `${persona.name} (AI)`, avatar: persona.avatar, elo: Math.max(0, profile.elo + persona.eloOffset), rank: getRankFromElo(Math.max(0, profile.elo + persona.eloOffset)), score: null, persona },
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

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

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
