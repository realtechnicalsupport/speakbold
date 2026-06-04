import mitt from "mitt";

export type ArenaEvents = {
  "arena:ready-status":     { duelId: string; userId: string; isReady: boolean };
  "arena:battle-result":    {
    duelId: string;
    score: number;
    oppScore?: number;
    feedback: string;
    oppFeedback?: string;
    strengths: string;
    oppStrengths?: string;
    exampleSpeech?: string;
    won?: boolean;
    tie?: boolean;
  };
  "arena:battle-analyzing": { duelId: string };
  "arena:battle-transcript":{ duelId: string; userId: string; transcript: string };
  "arena:battle-forfeit":   { duelId: string; userId: string };
  "elo:updated":            { change: number; newElo: number };
  // ── Live PvP debate sync (turn-based, transcript-only) ──────────────────────
  // `debate-live`: the active speaker streams their in-progress transcript so the
  // watching peer sees the words appear in real time (same UX as the AI stream).
  // `debate-turn-end`: the speaker's turn finished — carries the final transcript
  // for that turn and is the signal both clients use to advance in lockstep.
  // `turn` is normalised ("opening"/"rebuttal") so the receiver, for whom the
  // sender is always the opponent, can slot it without caring about FOR/AGAINST.
  "arena:debate-live":      { duelId: string; userId: string; turn: "opening" | "rebuttal"; text: string };
  "arena:debate-turn-end":  { duelId: string; userId: string; turn: "opening" | "rebuttal"; transcript: string };
};

export const arenaEmitter = mitt<ArenaEvents>();

export type FriendsEvents = {
  "friends:request-received": { from: { id: string; display_name: string } };
  "friends:request-accepted": { by: { id: string; display_name: string } };
};

export const friendsEmitter = mitt<FriendsEvents>();
