import { useEffect, useRef, useState } from "react";
import { arenaEmitter, type ArenaEvents } from "@/lib/events";

// ─────────────────────────────────────────────────────────────────────────────
// Shared ready-up / match-start handshake.
//
// Both players must "ready up" before a live match starts. Two long-standing
// defects lived in the old inline version (DuelDrill):
//
//   1. Missed-broadcast race. Ready status was broadcast EXACTLY ONCE, on tap.
//      But the accepter's drill mounts the instant they tap ACCEPT, while the
//      inviter's drill only mounts after the `request-accepted` round-trips
//      back. If the accepter readied before the inviter had mounted (and thus
//      before they were listening for `arena:ready-status`), the inviter never
//      heard it — and got kicked at the 15s timeout while the accepter started.
//      Fix: re-broadcast my ready every second until I see the peer is ready, so
//      a late-mounting peer always catches it.
//
//   2. Fabricated readiness. A 4s fallback force-set `opponentReady = true` for
//      ALL opponents — including real humans. That let one side begin a PvP
//      match solo while the other had actually timed out. Fix: the fake-ready
//      fallback now applies ONLY to AI / custom-solo opponents (where there is
//      no peer to wait for). Real PvP waits for the real (now reliably
//      re-broadcast) signal, or times out — which is the correct outcome.
// ─────────────────────────────────────────────────────────────────────────────

export interface ReadySyncArgs {
  /** Live PvP duel id. Undefined for custom solo (no peer to sync with). */
  duelId: string | undefined;
  /** My user id — used to ignore the echo of my own ready broadcast. */
  selfId: string | undefined;
  /** AI persona or custom-solo session → no human peer, so fake-ready is fine. */
  isAiOpponent: boolean;
  /** ArenaContext broadcaster. */
  sendReadyStatus: (duelId: string, isReady: boolean) => void;
  /** Seed values so the caller can restore across a tab-discard. */
  initialUserReady?: boolean;
  initialOpponentReady?: boolean;
  /** How often (ms) to re-broadcast my ready until the peer acknowledges. */
  rebroadcastMs?: number;
  /** Delay (ms) before faking an AI/custom opponent's readiness. */
  aiReadyDelayMs?: number;
}

export interface ReadySyncState {
  userReady: boolean;
  opponentReady: boolean;
  /** Call when the user taps READY UP. */
  markReady: () => void;
}

export function useReadySync({
  duelId,
  selfId,
  isAiOpponent,
  sendReadyStatus,
  initialUserReady = false,
  initialOpponentReady = false,
  rebroadcastMs = 1000,
  aiReadyDelayMs = 500,
}: ReadySyncArgs): ReadySyncState {
  const [userReady, setUserReady] = useState(initialUserReady);
  const [opponentReady, setOpponentReady] = useState(initialOpponentReady);

  // ── Receive the peer's ready status ───────────────────────────────────────
  useEffect(() => {
    const handleReady = ({ duelId: d, userId, isReady }: ArenaEvents["arena:ready-status"]) => {
      if (d === duelId && userId !== selfId) setOpponentReady(isReady);
    };
    arenaEmitter.on("arena:ready-status", handleReady);
    return () => arenaEmitter.off("arena:ready-status", handleReady);
  }, [duelId, selfId]);

  // ── Re-broadcast my ready until the peer acknowledges (fixes the race) ─────
  // Real PvP only — a custom-solo session has no duelId/peer.
  useEffect(() => {
    if (!userReady || opponentReady || !duelId) return;
    sendReadyStatus(duelId, true);                                   // immediate
    const id = window.setInterval(() => sendReadyStatus(duelId, true), rebroadcastMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userReady, opponentReady, duelId, rebroadcastMs]);

  // ── Fake the opponent's readiness — AI / custom only ──────────────────────
  useEffect(() => {
    if (!userReady || opponentReady || !isAiOpponent) return;
    const t = window.setTimeout(() => setOpponentReady(true), aiReadyDelayMs);
    return () => window.clearTimeout(t);
  }, [userReady, opponentReady, isAiOpponent, aiReadyDelayMs]);

  const markReady = () => setUserReady(true);

  return { userReady, opponentReady, markReady };
}
