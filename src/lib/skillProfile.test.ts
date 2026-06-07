import { describe, it, expect } from "vitest";
import { computeGrowth, type ScoredFeedback } from "./skillProfile";

// Build a session row at a given day offset with the supplied dimension scores.
const session = (day: number, scores: Record<string, number>): ScoredFeedback => ({
  scores,
  created_at: new Date(2026, 0, day).toISOString(),
});

describe("computeGrowth", () => {
  it("returns no data with fewer than 2 scorable sessions", () => {
    expect(computeGrowth([]).hasData).toBe(false);
    expect(computeGrowth([session(1, { clarity: 50 })]).hasData).toBe(false);
    // A row with no known dimensions doesn't count as a scorable session.
    expect(
      computeGrowth([
        session(1, { clarity: 50 }),
        session(2, { not_a_dimension: 99 } as Record<string, number>),
      ]).hasData
    ).toBe(false);
  });

  it("computes baseline→latest overall delta from the full history", () => {
    const g = computeGrowth([
      session(1, { clarity: 40, pace: 50, confidence: 30 }), // overall 40
      session(2, { clarity: 60, pace: 60, confidence: 60 }), // overall 60
      session(3, { clarity: 80, pace: 70, confidence: 90 }), // overall 80
    ]);
    expect(g.hasData).toBe(true);
    expect(g.sessions).toBe(3);
    expect(g.baseline).toBe(40);
    expect(g.latest).toBe(80);
    expect(g.delta).toBe(40);
    expect(g.series.map((s) => s.overall)).toEqual([40, 60, 80]);
  });

  it("orders unsorted input chronologically (baseline is the earliest session)", () => {
    const g = computeGrowth([
      session(3, { clarity: 80 }),
      session(1, { clarity: 40 }),
      session(2, { clarity: 60 }),
    ]);
    expect(g.baseline).toBe(40);
    expect(g.latest).toBe(80);
    expect(g.firstAt).toBe(new Date(2026, 0, 1).toISOString());
    expect(g.latestAt).toBe(new Date(2026, 0, 3).toISOString());
  });

  it("reports per-dimension deltas, biggest gain first, skipping single-sample dims", () => {
    const g = computeGrowth([
      session(1, { clarity: 30, confidence: 70 }),
      session(2, { clarity: 75, confidence: 60, pace: 50 }), // pace seen once → skipped
    ]);
    const dims = g.perDimension.map((d) => d.dimension);
    expect(dims).toContain("clarity");
    expect(dims).toContain("confidence");
    expect(dims).not.toContain("pace"); // only one sample
    // Sorted by delta desc: clarity (+45) before confidence (-10).
    expect(g.perDimension[0].dimension).toBe("clarity");
    expect(g.perDimension[0].delta).toBe(45);
    const conf = g.perDimension.find((d) => d.dimension === "confidence")!;
    expect(conf.delta).toBe(-10);
  });
});
