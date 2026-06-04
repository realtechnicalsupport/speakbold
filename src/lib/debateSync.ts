/**
 * Pure debate turn-machine + PvP sync logic. No React, no Supabase — so the
 * turn-order, round labelling, transcript slotting, and host/peer verdict
 * mirroring can be unit-tested deterministically (the live two-client realtime
 * path can't be exercised in CI, but every rule it depends on lives here).
 *
 * Phase names are RELATIVE to the local client: "*-user" = this client speaks,
 * "*-ai" = the opponent speaks (an AI persona in PvE, or the live peer in PvP).
 * Each client picks its order from its stance, which produces the correctly
 * mirrored sequence for the two sides.
 */

export type DebatePhase =
  | "prep"
  | "opening-user"
  | "opening-ai"
  | "rebuttal-user"
  | "rebuttal-ai"
  | "judging"
  | "results";

export type DebateTurn = "opening" | "rebuttal";

/** FOR opens first (proposition); AGAINST responds. */
export const PHASE_ORDER_FOR: DebatePhase[] =
  ["prep", "opening-user", "opening-ai", "rebuttal-user", "rebuttal-ai", "judging", "results"];
export const PHASE_ORDER_AGAINST: DebatePhase[] =
  ["prep", "opening-ai", "opening-user", "rebuttal-ai", "rebuttal-user", "judging", "results"];

export const phaseOrderFor = (stand: "FOR" | "AGAINST"): DebatePhase[] =>
  stand === "AGAINST" ? PHASE_ORDER_AGAINST : PHASE_ORDER_FOR;

/** In PvP the challenge sender (duel creator) hosts and argues FOR; peer AGAINST. */
export const standForRole = (isHost: boolean): "FOR" | "AGAINST" => (isHost ? "FOR" : "AGAINST");

export const SPEAKING_PHASES: DebatePhase[] =
  ["opening-user", "opening-ai", "rebuttal-user", "rebuttal-ai"];

export const isSpeakingPhase = (p: DebatePhase): boolean => SPEAKING_PHASES.includes(p);

/** Who speaks in a phase, local-relative. null for prep/judging/results. */
export function speakerOf(phase: DebatePhase): "user" | "ai" | null {
  if (phase === "opening-user" || phase === "rebuttal-user") return "user";
  if (phase === "opening-ai" || phase === "rebuttal-ai") return "ai";
  return null;
}

/** Normalised turn name (stance-agnostic), used in the PvP sync messages. */
export function turnNameOf(p: DebatePhase): DebateTurn | null {
  if (p === "opening-user" || p === "opening-ai") return "opening";
  if (p === "rebuttal-user" || p === "rebuttal-ai") return "rebuttal";
  return null;
}

/** The 4 speaking phases in this client's actual order. */
export function speakingOrder(phaseOrder: DebatePhase[]): DebatePhase[] {
  return phaseOrder.filter(isSpeakingPhase);
}

/**
 * Round/turn label derived from the REAL order. The old static "X of 4" strings
 * assumed the FOR sequence, so AGAINST debates mislabelled every turn — this is
 * the fix, and the test pins both orders.
 */
export function turnLabel(phase: DebatePhase, phaseOrder: DebatePhase[], fallback = ""): string {
  const i = speakingOrder(phaseOrder).indexOf(phase);
  if (i < 0) return fallback;
  return `ROUND ${i < 2 ? 1 : 2} · ${i + 1} of 4`;
}

/** True when THIS client gives the very first speech. */
export function userOpensFirst(phaseOrder: DebatePhase[]): boolean {
  return speakingOrder(phaseOrder)[0] === "opening-user";
}

/** Next phase in this client's order, or null at the end. */
export function nextPhase(phaseOrder: DebatePhase[], phase: DebatePhase): DebatePhase | null {
  const i = phaseOrder.indexOf(phase);
  if (i < 0 || i >= phaseOrder.length - 1) return null;
  return phaseOrder[i + 1];
}

/** Slot the opponent's transcript lands in, from the receiver's perspective. */
export function opponentSlot(turn: DebateTurn): "aiOpening" | "aiRebuttal" {
  return turn === "opening" ? "aiOpening" : "aiRebuttal";
}

/** The phase a watcher occupies while the opponent delivers `turn`. */
export function watchingPhaseFor(turn: DebateTurn): DebatePhase {
  return turn === "opening" ? "opening-ai" : "rebuttal-ai";
}

/** A host's broadcast verdict (host's own perspective). */
export interface HostVerdictMsg {
  score: number;
  oppScore: number;
  feedback: string;
  oppFeedback?: string;
  strengths?: string;
  oppStrengths?: string;
  won: boolean;
  tie?: boolean;
}

export interface MirroredVerdict {
  score: number;
  oppScore: number;
  feedback: string;
  oppFeedback: string;
  strengths: string;
  oppStrengths: string;
  won: boolean;
  tie: boolean;
}

/**
 * Flip a host's broadcast verdict to the peer's perspective: scores swap, the
 * win flag inverts (unless a tie), feedback/strengths swap. Mirrors exactly what
 * DuelDrill does so the two clients never disagree about who won.
 */
export function mirrorVerdictForPeer(p: HostVerdictMsg): MirroredVerdict {
  const tie = !!p.tie || p.score === p.oppScore;
  return {
    score: p.oppScore ?? 0,
    oppScore: p.score,
    feedback: p.oppFeedback || p.feedback,
    oppFeedback: p.feedback,
    strengths: p.oppStrengths || "N/A",
    oppStrengths: p.strengths || "N/A",
    won: tie ? false : !p.won,
    tie,
  };
}
