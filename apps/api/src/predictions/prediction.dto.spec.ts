import type { PredictorSummary } from "@credence/shared";
import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import { toGatedPredictionDto } from "./prediction.dto.js";
import type { PredictionDocument } from "./schemas/prediction.schema.js";

describe("locked prediction DTO security", () => {
  it("physically omits every gated insight field", () => {
    const prediction = {
      _id: new Types.ObjectId(),
      predictorAddress: "0xabc",
      source: "DEMO_SEED",
      marketId: "0xmarket",
      marketTitle: "BTC closes up",
      marketExpiryAt: new Date("2026-09-04T00:00:00Z"),
      direction: "DOWN",
      confidence: 91,
      reasoning: "private reasoning",
      marketProbabilityAtEntry: 0.2,
      visibility: "LOCKED",
      status: "ACTIVE",
      createdAt: new Date("2026-09-03T00:00:00Z"),
    } as PredictionDocument;
    const predictor = {
      walletAddress: "0xabc",
      reputationScore: 88,
      resolvedPredictions: 40,
      accuracy: 70,
      verified: true,
    } as PredictorSummary;

    const serialized = JSON.parse(JSON.stringify(toGatedPredictionDto(prediction, predictor))) as Record<string, unknown>;

    expect(serialized).not.toHaveProperty("direction");
    expect(serialized).not.toHaveProperty("confidence");
    expect(serialized).not.toHaveProperty("reasoning");
    expect(serialized).not.toHaveProperty("marketProbabilityAtEntry");
    expect(serialized.locked).toBe(true);
  });
});
