import { describe, expect, it } from "vitest";

import { isVerifiedPredictor } from "./user.schema.js";

describe("isVerifiedPredictor", () => {
  it("requires both the reputation and resolved prediction thresholds", () => {
    expect(isVerifiedPredictor({ reputationScore: 80, resolvedPredictions: 25 })).toBe(true);
    expect(isVerifiedPredictor({ reputationScore: 79.99, resolvedPredictions: 25 })).toBe(false);
    expect(isVerifiedPredictor({ reputationScore: 100, resolvedPredictions: 24 })).toBe(false);
  });
});
