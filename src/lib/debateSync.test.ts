import { describe, it, expect } from "vitest";
import {
  type DebatePhase,
  type DebateTurn,
  PHASE_ORDER_FOR,
  PHASE_ORDER_AGAINST,
  phaseOrderFor,
  standForRole,
  speakerOf,
  turnNameOf,
  speakingOrder,
  turnLabel,
  userOpensFirst,
  nextPhase,
  opponentSlot,
  watchingPhaseFor,
  mirrorVerdictForPeer,
} from "./debateSync";

describe("phase orders", () => {
  it("FOR opens first, AGAINST responds (mirror images)", () => {
    expect(speakingOrder(PHASE_ORDER_FOR)).toEqual([
      "opening-user", "opening-ai", "rebuttal-user", "rebuttal-ai",
    ]);
    expect(speakingOrder(PHASE_ORDER_AGAINST)).toEqual([
      "opening-ai", "opening-user", "rebuttal-ai", "rebuttal-user",
    ]);
  });

  it("phaseOrderFor + standForRole assign host=FOR, peer=AGAINST", () => {
    expect(standForRole(true)).toBe("FOR");
    expect(standForRole(false)).toBe("AGAINST");
    expect(phaseOrderFor("FOR")).toBe(PHASE_ORDER_FOR);
    expect(phaseOrderFor("AGAINST")).toBe(PHASE_ORDER_AGAINST);
  });
});

describe("turnNameOf / speakerOf", () => {
  it("maps speaking phases to normalised turn names", () => {
    expect(turnNameOf("opening-user")).toBe("opening");
    expect(turnNameOf("opening-ai")).toBe("opening");
    expect(turnNameOf("rebuttal-user")).toBe("rebuttal");
    expect(turnNameOf("rebuttal-ai")).toBe("rebuttal");
    expect(turnNameOf("prep")).toBeNull();
    expect(turnNameOf("judging")).toBeNull();
  });

  it("identifies the local speaker", () => {
    expect(speakerOf("opening-user")).toBe("user");
    expect(speakerOf("rebuttal-user")).toBe("user");
    expect(speakerOf("opening-ai")).toBe("ai");
    expect(speakerOf("rebuttal-ai")).toBe("ai");
    expect(speakerOf("prep")).toBeNull();
  });
});

describe("turnLabel — the AGAINST mislabel bug fix", () => {
  it("labels every turn 1..4 correctly in the FOR order", () => {
    expect(turnLabel("opening-user", PHASE_ORDER_FOR)).toBe("ROUND 1 · 1 of 4");
    expect(turnLabel("opening-ai", PHASE_ORDER_FOR)).toBe("ROUND 1 · 2 of 4");
    expect(turnLabel("rebuttal-user", PHASE_ORDER_FOR)).toBe("ROUND 2 · 3 of 4");
    expect(turnLabel("rebuttal-ai", PHASE_ORDER_FOR)).toBe("ROUND 2 · 4 of 4");
  });

  it("labels by ACTUAL position in the AGAINST order (previously wrong)", () => {
    // AGAINST sequence is opening-ai, opening-user, rebuttal-ai, rebuttal-user.
    expect(turnLabel("opening-ai", PHASE_ORDER_AGAINST)).toBe("ROUND 1 · 1 of 4");
    expect(turnLabel("opening-user", PHASE_ORDER_AGAINST)).toBe("ROUND 1 · 2 of 4");
    expect(turnLabel("rebuttal-ai", PHASE_ORDER_AGAINST)).toBe("ROUND 2 · 3 of 4");
    expect(turnLabel("rebuttal-user", PHASE_ORDER_AGAINST)).toBe("ROUND 2 · 4 of 4");
  });

  it("returns the fallback for non-speaking phases", () => {
    expect(turnLabel("prep", PHASE_ORDER_FOR, "PREP")).toBe("PREP");
    expect(turnLabel("judging", PHASE_ORDER_AGAINST, "VERDICT")).toBe("VERDICT");
  });
});

describe("userOpensFirst", () => {
  it("is true for FOR, false for AGAINST", () => {
    expect(userOpensFirst(PHASE_ORDER_FOR)).toBe(true);
    expect(userOpensFirst(PHASE_ORDER_AGAINST)).toBe(false);
  });
});

describe("nextPhase", () => {
  it("walks the order and stops at the end", () => {
    expect(nextPhase(PHASE_ORDER_FOR, "prep")).toBe("opening-user");
    expect(nextPhase(PHASE_ORDER_FOR, "rebuttal-ai")).toBe("judging");
    expect(nextPhase(PHASE_ORDER_FOR, "judging")).toBe("results");
    expect(nextPhase(PHASE_ORDER_FOR, "results")).toBeNull();
  });
});

describe("opponentSlot / watchingPhaseFor", () => {
  it("routes opponent transcripts to the ai* slots", () => {
    expect(opponentSlot("opening")).toBe("aiOpening");
    expect(opponentSlot("rebuttal")).toBe("aiRebuttal");
  });
  it("maps a turn to the watcher's phase", () => {
    expect(watchingPhaseFor("opening")).toBe("opening-ai");
    expect(watchingPhaseFor("rebuttal")).toBe("rebuttal-ai");
  });
});

describe("mirrorVerdictForPeer", () => {
  it("swaps scores and inverts the win for the peer", () => {
    const m = mirrorVerdictForPeer({
      score: 80, oppScore: 60, won: true,
      feedback: "host fb", oppFeedback: "peer fb",
      strengths: "host str", oppStrengths: "peer str",
    });
    expect(m.score).toBe(60);       // peer's own score is the host's oppScore
    expect(m.oppScore).toBe(80);
    expect(m.won).toBe(false);      // host won → peer lost
    expect(m.feedback).toBe("peer fb");
    expect(m.oppFeedback).toBe("host fb");
    expect(m.strengths).toBe("peer str");
    expect(m.oppStrengths).toBe("host str");
  });

  it("a host loss becomes a peer win", () => {
    const m = mirrorVerdictForPeer({ score: 40, oppScore: 75, won: false, feedback: "x" });
    expect(m.score).toBe(75);
    expect(m.won).toBe(true);
  });

  it("treats equal scores as a tie on both sides (no false win)", () => {
    const m = mirrorVerdictForPeer({ score: 70, oppScore: 70, won: false, feedback: "x" });
    expect(m.tie).toBe(true);
    expect(m.won).toBe(false);
  });
});

// ─── Two-client turn-sync simulation ──────────────────────────────────────────
// Models the live PvP protocol deterministically. An active speaker captures +
// broadcasts `turn-end`; the watcher stores the opponent transcript and advances
// when it's watching that turn.
//
// `advanceFrom(fromPhase)` mirrors the React component faithfully: the timer's
// callback and the turn-end listener both call advancePhase, whose closure is
// bound to the phase it was created for. Two guards combine — (a) a trigger for a
// phase we've already left is ignored (React clears the old phase's interval on
// change), and (b) the same phase can only be advanced once (the advancedFrom
// ref) — so a turn-end and its timer fallback never double-advance.

type Slots = { userOpening: string; aiOpening: string; userRebuttal: string; aiRebuttal: string };
interface TurnEndMsg { from: string; turn: DebateTurn; transcript: string }

class SimClient {
  phaseOrder: DebatePhase[];
  phase: DebatePhase;
  slots: Slots = { userOpening: "", aiOpening: "", userRebuttal: "", aiRebuttal: "" };
  private advancedFrom: DebatePhase | null = null;
  constructor(public name: string, stand: "FOR" | "AGAINST", private bus: Bus) {
    this.phaseOrder = phaseOrderFor(stand);
    this.phase = this.phaseOrder[0];
  }
  advanceFrom(fromPhase: DebatePhase) {
    if (this.phase !== fromPhase) return;        // stale trigger for a phase already left
    if (this.advancedFrom === fromPhase) return; // duplicate trigger for the current phase
    const np = nextPhase(this.phaseOrder, fromPhase);
    if (!np) return;
    this.advancedFrom = fromPhase;
    if (speakerOf(fromPhase) === "user") {
      const turn = turnNameOf(fromPhase)!;
      const text = `${this.name}:${turn}`;
      this.slots[turn === "opening" ? "userOpening" : "userRebuttal"] = text;
      this.bus.broadcast({ from: this.name, turn, transcript: text }, this.name);
    }
    this.phase = np;
  }
  /** End the current turn (timer hits 0 or "End turn"). */
  end() { this.advanceFrom(this.phase); }
  onTurnEnd(msg: TurnEndMsg) {
    this.slots[opponentSlot(msg.turn)] = msg.transcript; // always store (handles late corrections)
    if (this.phase === watchingPhaseFor(msg.turn)) this.advanceFrom(this.phase);
  }
}

class Bus {
  clients: SimClient[] = [];
  broadcast(msg: TurnEndMsg, fromName: string) {
    for (const c of this.clients) if (c.name !== fromName) c.onTurnEnd(msg);
  }
}

function runDebate(driver: (host: SimClient, peer: SimClient) => void) {
  const bus = new Bus();
  const host = new SimClient("host", standForRole(true), bus);  // FOR
  const peer = new SimClient("peer", standForRole(false), bus); // AGAINST
  bus.clients = [host, peer];
  // Prep ends on both clients (shared prep timer).
  host.end();
  peer.end();
  driver(host, peer);
  return { host, peer };
}

describe("PvP two-client turn-sync simulation", () => {
  it("keeps both clients in lockstep through all 4 turns to judging", () => {
    const { host, peer } = runDebate((host, peer) => {
      // Turn 1: host opening. Its turn-end broadcast advances the peer.
      expect(host.phase).toBe("opening-user");
      expect(peer.phase).toBe("opening-ai");
      host.end();
      // Turn 2: peer opening.
      expect(host.phase).toBe("opening-ai");
      expect(peer.phase).toBe("opening-user");
      peer.end();
      // Turn 3: host rebuttal.
      expect(host.phase).toBe("rebuttal-user");
      expect(peer.phase).toBe("rebuttal-ai");
      host.end();
      // Turn 4: peer rebuttal.
      expect(host.phase).toBe("rebuttal-ai");
      expect(peer.phase).toBe("rebuttal-user");
      peer.end();
    });

    expect(host.phase).toBe("judging");
    expect(peer.phase).toBe("judging");

    // Each client holds its OWN speech in user* and the opponent's in ai*.
    expect(host.slots).toEqual({
      userOpening: "host:opening", userRebuttal: "host:rebuttal",
      aiOpening: "peer:opening", aiRebuttal: "peer:rebuttal",
    });
    expect(peer.slots).toEqual({
      userOpening: "peer:opening", userRebuttal: "peer:rebuttal",
      aiOpening: "host:opening", aiRebuttal: "host:rebuttal",
    });
  });

  it("a turn-end plus its timer fallback (same phase) advances only once", () => {
    const bus = new Bus();
    const peer = new SimClient("peer", "AGAINST", bus);
    bus.clients = [peer];
    peer.end(); // prep → opening-ai (watching the host's opening)
    expect(peer.phase).toBe("opening-ai");
    // Both the host's turn-end AND the peer's own opening-ai timer fire for the
    // SAME watched turn. Only one advance should happen.
    peer.advanceFrom("opening-ai");
    peer.advanceFrom("opening-ai");
    expect(peer.phase).toBe("opening-user");
  });

  it("reaches judging even if a side speaks nothing (no hang)", () => {
    const { host, peer } = runDebate((host, peer) => {
      host.end(); // host opening
      peer.end(); // peer's turn — ends with whatever (even empty) it has
      host.end(); // host rebuttal
      peer.end(); // peer rebuttal
    });
    expect(host.phase).toBe("judging");
    expect(peer.phase).toBe("judging");
    expect(host.slots.userOpening).toBe("host:opening");
    expect(host.slots.aiOpening).toBe("peer:opening");
  });
});
