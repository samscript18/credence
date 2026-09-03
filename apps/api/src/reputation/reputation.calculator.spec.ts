import { describe, expect, it } from "vitest";

import { calculateReputation, sumDecimalStrings } from "./reputation.calculator.js";

describe("calculateReputation", () => {
  it("matches the documented Brier improvement example", () => {
    const result = calculateReputation([{ direction: "DOWN", confidence: 78, marketProbabilityAtEntry: 0.35, finalOutcome: "DOWN", createdAt: new Date(0) }]);
    expect(result.reputationScore).toBeCloseTo(51.8705, 8);
    expect(result.accuracy).toBe(100);
  });

  it("penalizes confident forecasts that are wrong", () => {
    const result = calculateReputation([{ direction: "UP", confidence: 95, marketProbabilityAtEntry: 0.55, finalOutcome: "DOWN", createdAt: new Date(0) }]);
    expect(result.reputationScore).toBeLessThan(50);
    expect(result.incorrectPredictions).toBe(1);
  });

  it("is chronological, deterministic, clamped, and excludes voids", () => {
    const wins = Array.from({ length: 200 }, (_, index) => ({ direction: "UP" as const, confidence: 99, marketProbabilityAtEntry: 0.01, finalOutcome: "UP" as const, createdAt: new Date(index + 1) }));
    const voided = { ...wins[0]!, finalOutcome: "VOID" as const, createdAt: new Date(0) };
    const result = calculateReputation([voided, ...wins.reverse()]);
    expect(result.reputationScore).toBe(100);
    expect(result.resolvedPredictions).toBe(200);
  });

  it("avoids division by zero", () => {
    expect(calculateReputation([])).toMatchObject({ reputationScore: 50, accuracy: 0 });
  });

  it("sums P&L strings without floating-point arithmetic", () => {
    expect(sumDecimalStrings(["1.25", "-0.2", "0.005"])).toBe("1.055");
  });
});
