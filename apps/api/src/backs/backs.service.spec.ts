import { BadRequestException } from "@nestjs/common";
import type { Model } from "mongoose";
import { describe, expect, it, vi } from "vitest";

import type { DreamDexService } from "../dreamdex/dreamdex.service.js";
import type { Prediction } from "../predictions/schemas/prediction.schema.js";
import type { PredictionUnlock } from "../unlocks/schemas/prediction-unlock.schema.js";
import { BacksService } from "./backs.service.js";
import type { BackedPrediction } from "./schemas/backed-prediction.schema.js";

const predictionId = "66f000000000000000000001";
const backer = "0x421ab98aeb38cb022fe80d5bd1da7ea404bdd90b";
const transactionHash = `0x${"7".repeat(64)}` as const;
const prediction = {
  _id: { toString: () => predictionId },
  predictorAddress: "0x3232323232323232323232323232323232323232",
  marketId: `0x${"1".repeat(64)}`,
  direction: "DOWN",
  visibility: "LOCKED",
  status: "ACTIVE",
};

describe("BacksService", () => {
  it("derives direction and filled quantity from the verified DreamDEX trade", async () => {
    const createdAt = new Date();
    const backModel = {
      create: vi.fn((value) => Promise.resolve({
        ...value,
        _id: { toString: () => "back-id" },
        createdAt,
      })),
    };
    const dreamDex = {
      getEventMarket: vi.fn(() => Promise.resolve({ tradable: true, expiryAt: new Date(Date.now() + 60_000).toISOString() })),
      verifyPredictionTrade: vi.fn(() => Promise.resolve({ orderId: "42", filledQuantity: "1000", filledAmount: "0.001" })),
      getMarketProbabilities: vi.fn(() => Promise.resolve({ yes: 0.63, no: 0.37 })),
    };
    const service = new BacksService(
      { findById: () => ({ exec: () => Promise.resolve(prediction) }) } as unknown as Model<Prediction>,
      { findOne: () => ({ exec: () => Promise.resolve({ status: "CONFIRMED" }) }) } as unknown as Model<PredictionUnlock>,
      backModel as unknown as Model<BackedPrediction>,
      dreamDex as unknown as DreamDexService,
    );

    const result = await service.create(predictionId, backer.toUpperCase(), transactionHash);

    expect(dreamDex.verifyPredictionTrade).toHaveBeenCalledWith(expect.objectContaining({ direction: "DOWN", sender: backer }));
    expect(backModel.create).toHaveBeenCalledWith(expect.objectContaining({ direction: "DOWN", stakeAmount: "0.001", marketProbabilityAtExecution: 0.37 }));
    expect(result).toMatchObject({ direction: "DOWN", stakeAmount: "0.001", orderId: "42", status: "CONFIRMED" });
  });

  it("requires wallet-specific access before a locked prediction can be backed", async () => {
    const dreamDex = { getEventMarket: vi.fn(), verifyPredictionTrade: vi.fn() };
    const service = new BacksService(
      { findById: () => ({ exec: () => Promise.resolve(prediction) }) } as unknown as Model<Prediction>,
      { findOne: () => ({ exec: () => Promise.resolve(null) }) } as unknown as Model<PredictionUnlock>,
      {} as Model<BackedPrediction>,
      dreamDex as unknown as DreamDexService,
    );

    await expect(service.create(predictionId, backer, transactionHash)).rejects.toBeInstanceOf(BadRequestException);
    expect(dreamDex.verifyPredictionTrade).not.toHaveBeenCalled();
  });
});
