import type { Model } from "mongoose";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { DreamDexService } from "../dreamdex/dreamdex.service.js";
import type { User } from "../users/schemas/user.schema.js";
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
      dreamDex as unknown as DreamDexService,
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
    const service = new PredictionsService(
      { create } as unknown as Model<Prediction>,
      {} as Model<User>,
      dreamDex as unknown as DreamDexService,
    );

    await expect(service.create("0xABC", input)).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });
});
