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
  };
  "arena:battle-analyzing": { duelId: string };
  "arena:battle-transcript":{ duelId: string; userId: string; transcript: string };
  "arena:battle-forfeit":   { duelId: string; userId: string };
  "elo:updated":            { change: number; newElo: number };
};

export const arenaEmitter = mitt<ArenaEvents>();
