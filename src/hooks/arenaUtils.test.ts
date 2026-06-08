import { describe, it, expect } from "vitest";
import { computeEloChange, type EloComputationInput } from "./arenaUtils";

// The ELO formula is a hybrid of chess-ELO expectation, judged margin, and an
// absolute "quality" nudge. That hybrid can mathematically push a narrow/
// high-scoring LOSS positive ("you beat expectations"), which contradicts the
// recorded winner and reads as a bug. These tests pin the outcome-sign
// guarantee: a decisive scored loss never gains rating, a win never loses it.

const base: EloComputationInput = {
  myElo: 1000,
  oppElo: 1000,
  myScore: 50,
  oppScore: 50,
  matchesPlayed: 50, // past placement so K-factor is the steady-state value
  mode: "debate",
  isAi: false,
};

describe("computeEloChange — outcome-sign guarantee", () => {
  it("a high-scoring loss to a much stronger opponent never gains ELO", () => {
    // Lost 58–64 but opponent is far higher rated → expectation term + quality
    // bonus would historically net positive. Must be a (small) loss now.
    const delta = computeEloChange({
      ...base,
      myElo: 1000,
      oppElo: 1900,
      myScore: 58,
      oppScore: 64,
    });
    expect(delta).toBeLessThan(0);
  });

  it("a narrow loss with a strong absolute score still loses ELO", () => {
    const delta = computeEloChange({
      ...base,
      myElo: 1100,
      oppElo: 1700,
      myScore: 70,
      oppScore: 72,
    });
    expect(delta).toBeLessThanOrEqual(-1);
  });

  it("an upset win over a stronger opponent still gains ELO (magnitude intact)", () => {
    const delta = computeEloChange({
      ...base,
      myElo: 1000,
      oppElo: 1800,
      myScore: 75,
      oppScore: 60,
    });
    expect(delta).toBeGreaterThan(0);
  });

  it("a win never loses ELO even against a much weaker opponent", () => {
    // Beating someone far below you earns little, but the sign must stay >= 0.
    const delta = computeEloChange({
      ...base,
      myElo: 1900,
      oppElo: 1000,
      myScore: 62,
      oppScore: 58,
    });
    expect(delta).toBeGreaterThan(0);
  });

  it("a clear loss to a weaker opponent loses ELO", () => {
    const delta = computeEloChange({
      ...base,
      myElo: 1800,
      oppElo: 1000,
      myScore: 40,
      oppScore: 80,
    });
    expect(delta).toBeLessThan(0);
  });

  it("a sub-30 'win' (both nearly silent) does not gain ELO", () => {
    const delta = computeEloChange({
      ...base,
      myScore: 25,
      oppScore: 18,
    });
    expect(delta).toBeLessThanOrEqual(0);
  });

  it("self-forfeit is a flat penalty regardless of scores", () => {
    const delta = computeEloChange({
      ...base,
      isForfeit: "self",
    });
    expect(delta).toBe(-30);
  });

  it("opponent-forfeit grants the surviving player a win (positive ELO)", () => {
    // When the other side forfeits, the remaining player is rated as a clean
    // 80–20 win — must be a gain, even against an equally-rated opponent.
    const delta = computeEloChange({
      ...base,
      isForfeit: "opponent",
    });
    expect(delta).toBeGreaterThan(0);
  });

  it("opponent-forfeit still gains ELO against a much stronger opponent", () => {
    // The win is awarded by the forfeit, not by rating math — a survivor far
    // below the forfeiter must never come out negative.
    const delta = computeEloChange({
      ...base,
      myElo: 1000,
      oppElo: 2000,
      isForfeit: "opponent",
    });
    expect(delta).toBeGreaterThan(0);
  });
});
