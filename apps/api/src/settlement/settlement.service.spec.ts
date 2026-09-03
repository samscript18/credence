import type { Model } from "mongoose";
import { describe, expect, it, vi } from "vitest";

import type { DreamDexService } from "../dreamdex/dreamdex.service.js";
import type { Prediction } from "../predictions/schemas/prediction.schema.js";
import type { ReputationService } from "../reputation/reputation.service.js";
import { SettlementService } from "./settlement.service.js";

function prediction(direction: "UP" | "DOWN", address: string) {
  return {
    _id: `${direction}-id`,
    marketId: "market-1",
    predictorAddress: address,
    direction,
  };
}

describe("SettlementService", () => {
  it("resolves from finalized DreamDEX state and recalculates each affected predictor", async () => {
    const rows = [prediction("DOWN", "0xaaa"), prediction("UP", "0xbbb")];
    type SettlementUpdate = { $set: { finalOutcome: string; isCorrect?: boolean } };
    const updates: SettlementUpdate[] = [];
    const updateOne = vi.fn((_filter: unknown, update: SettlementUpdate) => {
      updates.push(update);
      return { exec: () => Promise.resolve({ modifiedCount: 1 }) };
    });
    const model = {
      find: vi.fn(() => ({ sort: () => ({ limit: () => ({ exec: () => Promise.resolve(rows) }) }) })),
      updateOne,
    };
    const dreamDex = {
      getMarketSettlement: vi.fn(() => Promise.resolve({ finalized: true, isResolved: true, isVoided: false, finalOutcome: "DOWN" })),
    };
    const reputation = { recalculate: vi.fn(() => Promise.resolve()) };
    const service = new SettlementService(
      model as unknown as Model<Prediction>,
      dreamDex as unknown as DreamDexService,
      reputation as unknown as ReputationService,
    );

    await expect(service.resolveDuePredictions()).resolves.toBe(2);
    expect(updates[0]?.$set).toMatchObject({ finalOutcome: "DOWN", isCorrect: true });
    expect(updates[1]?.$set).toMatchObject({ finalOutcome: "DOWN", isCorrect: false });
    expect(reputation.recalculate).toHaveBeenCalledTimes(2);
  });

  it("waits when expiry passed but DreamDEX has not finalized", async () => {
    const model = {
      find: () => ({ sort: () => ({ limit: () => ({ exec: () => Promise.resolve([prediction("UP", "0xaaa")]) }) }) }),
      updateOne: vi.fn(),
    };
    const dreamDex = {
      getMarketSettlement: vi.fn(() => Promise.resolve({ finalized: false, isResolved: false, isVoided: false, finalOutcome: null })),
    };
    const reputation = { recalculate: vi.fn() };
    const service = new SettlementService(
      model as unknown as Model<Prediction>,
      dreamDex as unknown as DreamDexService,
      reputation as unknown as ReputationService,
    );

    await expect(service.resolveDuePredictions()).resolves.toBe(0);
    expect(model.updateOne).not.toHaveBeenCalled();
    expect(reputation.recalculate).not.toHaveBeenCalled();
  });
});
