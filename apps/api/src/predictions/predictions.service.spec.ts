import type { Model } from "mongoose";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { DreamDexService } from "../dreamdex/dreamdex.service.js";
import type { LeaderboardService } from "../leaderboard/leaderboard.service.js";
import type { User } from "../users/schemas/user.schema.js";
import type { PredictionUnlock } from "../unlocks/schemas/prediction-unlock.schema.js";
import type { CreatePredictionDto } from "./dto/create-prediction.dto.js";
import type { Prediction } from "./schemas/prediction.schema.js";
import { PredictionsService } from "./predictions.service.js";

const input: CreatePredictionDto = {
  marketId: `0x${"1".repeat(64)}`,
  direction: "UP",
  confidence: 72,
  stakeAmount: "0.001",
  visibility: "PUBLIC",
  marketProbabilityAtEntry: 0.42,
  transactionHash: `0x${"2".repeat(64)}`,
};

const market = {
  marketId: input.marketId,
  tradable: true,
  expiryAt: new Date(Date.now() + 60_000).toISOString(),
  tradingStartAt: new Date(Date.now() - 60_000).toISOString(),
  venueId: "venue",
  symbol: "BTC/tUSDC",
  underlying: "BTC",
  title: "BTC closes up",
  collateralSymbol: "tUSDC",
  collateralTokenAddress: "0xtoken",
};

describe("PredictionsService", () => {
  it("persists the authenticated wallet only after DreamDEX proof succeeds", async () => {
    const create = vi.fn((value) => Promise.resolve(value));
    const userModel = {
      findOneAndUpdate: vi.fn(() => ({
        orFail: () => ({ exec: () => Promise.resolve({ _id: "user-id" }) }),
      })),
    };
    const dreamDex = {
      getEventMarket: vi.fn(() => Promise.resolve(market)),
      verifyPredictionTrade: vi.fn(() =>
        Promise.resolve({ orderId: "166020696663386069640", filledQuantity: "1000" }),
      ),
    };
    const service = new PredictionsService(
      { create } as unknown as Model<Prediction>,
      userModel as unknown as Model<User>,
      {} as Model<PredictionUnlock>,
      dreamDex as unknown as DreamDexService,
      {} as LeaderboardService,
    );

    await service.create("0xABC", input);

    expect(dreamDex.verifyPredictionTrade).toHaveBeenCalledWith(
      expect.objectContaining({ sender: "0xabc", direction: "UP" }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        predictorAddress: "0xabc",
        transactionHash: input.transactionHash,
        orderId: "166020696663386069640",
        status: "ACTIVE",
      }),
    );
  });

  it("does not create a Mongo record when chain proof fails", async () => {
    const create = vi.fn();
    const dreamDex = {
      getEventMarket: vi.fn(() => Promise.resolve(market)),
      verifyPredictionTrade: vi.fn(() => Promise.reject(new Error("not a fill"))),
    };
    const userModel = {
      findOneAndUpdate: vi.fn(() => ({
        orFail: () => ({ exec: () => Promise.resolve({ _id: "user-id" }) }),
      })),
    };
    const service = new PredictionsService(
      { create } as unknown as Model<Prediction>,
      userModel as unknown as Model<User>,
      {} as Model<PredictionUnlock>,
      dreamDex as unknown as DreamDexService,
      {} as LeaderboardService,
    );

    await expect(service.create("0xABC", input)).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns a gated DTO to an unauthorized feed reader", async () => {
    const lockedPrediction = {
      _id: { toString: () => "prediction-id" },
      predictorAddress: "0xcreator",
      source: "DEMO_SEED",
      marketId: input.marketId,
      marketTitle: "Private call",
      marketExpiryAt: new Date(Date.now() + 60_000),
      direction: "DOWN",
      confidence: 95,
      reasoning: "must stay private",
      marketProbabilityAtEntry: 0.1,
      visibility: "LOCKED",
      status: "ACTIVE",
      createdAt: new Date(),
    };
    const predictionModel = {
      find: vi.fn(() => ({
        sort: () => ({ limit: () => ({ exec: () => Promise.resolve([lockedPrediction]) }) }),
      })),
    };
    const userModel = { find: vi.fn(() => ({ exec: () => Promise.resolve([]) })) };
    const service = new PredictionsService(
      predictionModel as unknown as Model<Prediction>,
      userModel as unknown as Model<User>,
      {} as Model<PredictionUnlock>,
      {} as DreamDexService,
      { ranks: () => Promise.resolve(new Map()) } as unknown as LeaderboardService,
    );

    const [result] = await service.getFeed();

    expect(result?.locked).toBe(true);
    expect(result).not.toHaveProperty("direction");
    expect(result).not.toHaveProperty("confidence");
    expect(result).not.toHaveProperty("reasoning");
    expect(result).not.toHaveProperty("marketProbabilityAtEntry");
  });

  it("rejects locked visibility for a non-Verified predictor before chain verification", async () => {
    const dreamDex = {
      getEventMarket: vi.fn(() => Promise.resolve(market)),
      verifyPredictionTrade: vi.fn(),
    };
    const userModel = {
      findOneAndUpdate: vi.fn(() => ({
        orFail: () => ({ exec: () => Promise.resolve({ _id: "user-id", reputationScore: 79, resolvedPredictions: 100 }) }),
      })),
    };
    const service = new PredictionsService(
      {} as Model<Prediction>,
      userModel as unknown as Model<User>,
      {} as Model<PredictionUnlock>,
      dreamDex as unknown as DreamDexService,
      {} as LeaderboardService,
    );

    await expect(service.create("0xABC", { ...input, visibility: "LOCKED" })).rejects.toBeInstanceOf(BadRequestException);
    expect(dreamDex.verifyPredictionTrade).not.toHaveBeenCalled();
  });
});
