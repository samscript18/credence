import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { DreamDexService } from "../dreamdex/dreamdex.service.js";
import { User } from "../users/schemas/user.schema.js";
import { CreatePredictionDto } from "./dto/create-prediction.dto.js";
import { Prediction, type PredictionDocument } from "./schemas/prediction.schema.js";

@Injectable()
export class PredictionsService {
  constructor(
    @InjectModel(Prediction.name) private readonly predictionModel: Model<Prediction>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly dreamDex: DreamDexService,
  ) {}

  async create(walletAddress: string, input: CreatePredictionDto): Promise<PredictionDocument> {
    const canonicalAddress = walletAddress.toLowerCase();
    const market = await this.dreamDex.getEventMarket(input.marketId);
    if (!market.tradable || new Date(market.expiryAt).getTime() <= Date.now()) {
      throw new BadRequestException({ message: "DreamDEX market is no longer tradable", code: "MARKET_EXPIRED" });
    }

    let proof: { orderId: string; filledQuantity: string };
    try {
      proof = await this.dreamDex.verifyPredictionTrade({
        transactionHash: input.transactionHash,
        marketId: market.marketId,
        sender: canonicalAddress,
        direction: input.direction,
      });
    } catch {
      throw new BadRequestException({
        message: "The transaction could not be verified as your filled DreamDEX trade",
        code: "TRADE_VERIFICATION_FAILED",
      });
    }

    const user = await this.userModel
      .findOneAndUpdate(
        { walletAddress: canonicalAddress },
        { $setOnInsert: { walletAddress: canonicalAddress } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .orFail()
      .exec();
    try {
      return await this.predictionModel.create({
        predictor: user._id,
        predictorAddress: canonicalAddress,
        source: "LIVE",
        marketId: market.marketId,
        venueId: market.venueId ?? undefined,
        symbol: market.symbol,
        underlying: market.underlying,
        marketTitle: market.title,
        marketStartAt: new Date(market.tradingStartAt),
        marketExpiryAt: new Date(market.expiryAt),
        direction: input.direction,
        confidence: input.confidence,
        reasoning: input.reasoning?.trim() || undefined,
        visibility: "PUBLIC",
        marketProbabilityAtEntry: input.marketProbabilityAtEntry,
        stakeAmount: input.stakeAmount,
        collateralSymbol: market.collateralSymbol,
        collateralTokenAddress: market.collateralTokenAddress,
        transactionHash: input.transactionHash.toLowerCase(),
        orderId: proof.orderId,
        positionReference: proof.filledQuantity,
        status: "ACTIVE",
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === 11_000) {
        throw new ConflictException({
          message: "This transaction is already linked to a prediction",
          code: "TRANSACTION_ALREADY_USED",
        });
      }
      throw error;
    }
  }

  async listMine(walletAddress: string): Promise<PredictionDocument[]> {
    return this.predictionModel
      .find({ predictorAddress: walletAddress.toLowerCase() })
      .sort({ createdAt: -1 })
      .exec();
  }
}
