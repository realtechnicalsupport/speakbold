import { useEffect, useRef } from "react";
import { arenaEmitter, type ArenaEvents } from "@/lib/events";
import type { Duel, DuelPlayer, Gamemode, Rank } from "@/context/ArenaContext";

// ─────────────────────────────────────────────────────────────────────────────
// Shared forfeit handshake.
//
// When a peer leaves a live match they broadcast `arena:battle-forfeit`. The
// surviving player must, exactly once: stop their own flow, show a
// victory-by-forfeit screen, and award the win via ArenaContext.handleForfeit.
// DuelDrill and DebateBattle previously each hand-rolled this listener; this is
// the single source of truth they now share.
// ─────────────────────────────────────────────────────────────────────────────

export interface OpponentForfeitArgs {
  /** Subscribe only when this is a real PvP match (a human can forfeit). */
  enabled: boolean;
  /** The live duel id the forfeit must match. */
  duelId: string | undefined;
  /** My own user id — used to ignore the echo of my own forfeit broadcast. */
  selfId: string | undefined;
  /** When known (debate carries the opponent id), react only to THIS user's
   *  forfeit. When omitted (battle), react to "anyone on this duel but me". */
  opponentId?: string;
  /** Fired exactly once when the opponent forfeits. */
  onForfeit: () => void;
}

/**
 * Subscribe to the opponent forfeiting the given duel. Fires `onForfeit` once.
 * The single-fire guard is re-armed when `duelId` changes (a new match).
 */
export function useOpponentForfeit({
  enabled,
  duelId,
  selfId,
  opponentId,
  onForfeit,
}: OpponentForfeitArgs): void {
  const onForfeitRef = useRef(onForfeit);
  useEffect(() => { onForfeitRef.current = onForfeit; }, [onForfeit]);

  const firedRef = useRef(false);
  useEffect(() => { firedRef.current = false; }, [duelId]);

  useEffect(() => {
    if (!enabled || !duelId) return;
    const handler = (p: ArenaEvents["arena:battle-forfeit"]) => {
      if (p.duelId !== duelId) return;
      // Identify the forfeit as the opponent's: by explicit id when we have it
      // (debate), otherwise "any user that isn't me" (battle).
      const isOpponent = opponentId != null ? p.userId === opponentId : p.userId !== selfId;
      if (!isOpponent || firedRef.current) return;
      firedRef.current = true;
      onForfeitRef.current();
    };
    arenaEmitter.on("arena:battle-forfeit", handler);
    return () => arenaEmitter.off("arena:battle-forfeit", handler);
  }, [enabled, duelId, selfId, opponentId]);
}

export interface ForfeitWinDuelArgs {
  duelId: string;
  gamemode: Gamemode;
  prompt: string;
  me: { id?: string; name: string; avatar?: string; elo: number; rank: Rank };
  opponent: { id?: string; name: string; avatar?: string; elo: number; rank: Rank };
  feedback: string;
}

/**
 * Build the synthetic `Duel` describing "the opponent forfeited, I win", shaped
 * the way ArenaContext.handleForfeit expects: `creator` = me (so `isCreator` is
 * true and the forfeiting opponent is read from `challenger`). Both clients
 * derive ELO from this, so the surviving side is always credited the win.
 */
export function buildForfeitWinDuel(args: ForfeitWinDuelArgs): Duel {
  const me: DuelPlayer = {
    id: args.me.id,
    name: args.me.name,
    avatar: args.me.avatar ?? "👤",
    elo: args.me.elo,
    rank: args.me.rank,
    score: 100,
  };
  const opponent: DuelPlayer = {
    id: args.opponent.id,
    name: args.opponent.name,
    avatar: args.opponent.avatar ?? "🤖",
    elo: args.opponent.elo,
    rank: args.opponent.rank,
    score: 0,
  };
  return {
    id: args.duelId,
    prompt: args.prompt,
    gamemode: args.gamemode,
    creator: me,
    challenger: opponent,
    status: "completed",
    winner: args.me.id ?? null,
    feedback: args.feedback,
    timestamp: Date.now(),
  };
}
