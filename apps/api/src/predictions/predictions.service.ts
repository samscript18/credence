import type { PredictionFeedItem, PredictorSummary } from "@credence/shared";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { DreamDexService } from "../dreamdex/dreamdex.service.js";
import { LeaderboardService } from "../leaderboard/leaderboard.service.js";
import { isVerifiedPredictor, User } from "../users/schemas/user.schema.js";
import { PredictionUnlock } from "../unlocks/schemas/prediction-unlock.schema.js";
import { CreatePredictionDto } from "./dto/create-prediction.dto.js";
import {
  toGatedPredictionDto,
  toPredictorSummary,
  toVisiblePredictionDto,
} from "./prediction.dto.js";
import { Prediction, type PredictionDocument } from "./schemas/prediction.schema.js";

@Injectable()
export class PredictionsService {
  constructor(
    @InjectModel(Prediction.name) private readonly predictionModel: Model<Prediction>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(PredictionUnlock.name)
    private readonly unlockModel: Model<PredictionUnlock>,
    private readonly dreamDex: DreamDexService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async create(walletAddress: string, input: CreatePredictionDto): Promise<PredictionDocument> {
    const canonicalAddress = walletAddress.toLowerCase();
    const market = await this.dreamDex.getEventMarket(input.marketId);
    if (!market.tradable || new Date(market.expiryAt).getTime() <= Date.now()) {
      throw new BadRequestException({ message: "DreamDEX market is no longer tradable", code: "MARKET_EXPIRED" });
    }
    const user = await this.userModel
      .findOneAndUpdate(
        { walletAddress: canonicalAddress },
        { $setOnInsert: { walletAddress: canonicalAddress } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      )
      .orFail()
      .exec();
    if (input.visibility === "LOCKED" && !isVerifiedPredictor(user)) {
      throw new BadRequestException({
        message: "Only Verified Predictors can publish locked predictions",
        code: "VERIFIED_PREDICTOR_REQUIRED",
      });
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
        visibility: input.visibility,
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

  async getFeed(viewerAddress?: string): Promise<PredictionFeedItem[]> {
    const predictions = await this.predictionModel
      .find({ status: "ACTIVE" })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
    return this.secureDtos(predictions, viewerAddress);
  }

  async getById(id: string, viewerAddress?: string): Promise<PredictionFeedItem> {
    const prediction = await this.predictionModel.findById(id).exec();
    if (!prediction) throw new NotFoundException("Prediction was not found");
    const [dto] = await this.secureDtos([prediction], viewerAddress);
    if (!dto) throw new NotFoundException("Prediction was not found");
    return dto;
  }

  async getForProfile(
    predictorAddress: string,
    viewerAddress?: string,
  ): Promise<{ active: PredictionFeedItem[]; resolved: PredictionFeedItem[] }> {
    const predictions = await this.predictionModel
      .find({ predictorAddress: predictorAddress.toLowerCase(), status: { $in: ["ACTIVE", "RESOLVED"] } })
      .sort({ createdAt: -1 })
      .exec();
    const secured = await this.secureDtos(predictions, viewerAddress);
    return {
      active: secured.filter((prediction) => prediction.status === "ACTIVE"),
      resolved: secured.filter((prediction) => prediction.status === "RESOLVED"),
    };
  }

  private async secureDtos(
    predictions: PredictionDocument[],
    viewerAddress?: string,
  ): Promise<PredictionFeedItem[]> {
    if (predictions.length === 0) return [];
    const addresses = [...new Set(predictions.map((prediction) => prediction.predictorAddress))];
    const users = await this.userModel.find({ walletAddress: { $in: addresses } }).exec();
    const ranks = await this.leaderboard.ranks(addresses);
    const summaries = new Map<string, PredictorSummary>(
      users.map((user) => [
        user.walletAddress,
        { ...toPredictorSummary(user), rank: ranks.get(user.walletAddress) },
      ]),
    );
    const viewer = viewerAddress?.toLowerCase();
    const unlocked = new Set<string>();
    if (viewer) {
      const rows = await this.unlockModel
        .find({
          buyerAddress: viewer,
          status: "CONFIRMED",
          prediction: { $in: predictions.map((prediction) => prediction._id) },
        })
        .select("prediction")
        .exec();
      rows.forEach((row) => unlocked.add(row.prediction.toString()));
    }

    return predictions.map((prediction) => {
      const predictor = summaries.get(prediction.predictorAddress) ?? {
        walletAddress: prediction.predictorAddress,
        reputationScore: 50,
        resolvedPredictions: 0,
        accuracy: 0,
        verified: false,
      };
      const canView =
        prediction.status === "RESOLVED" ||
        prediction.visibility === "PUBLIC" ||
        viewer === prediction.predictorAddress ||
        unlocked.has(prediction._id.toString());
      return canView
        ? toVisiblePredictionDto(prediction, predictor)
        : toGatedPredictionDto(prediction, predictor);
    });
  }
}
