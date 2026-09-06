import type { BackedPredictionRecord } from "@credence/shared";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { DreamDexService } from "../dreamdex/dreamdex.service.js";
import { Prediction } from "../predictions/schemas/prediction.schema.js";
import { PredictionUnlock } from "../unlocks/schemas/prediction-unlock.schema.js";
import { BackedPrediction, type BackedPredictionDocument } from "./schemas/backed-prediction.schema.js";

@Injectable()
export class BacksService {
  constructor(
    @InjectModel(Prediction.name) private readonly predictionModel: Model<Prediction>,
    @InjectModel(PredictionUnlock.name) private readonly unlockModel: Model<PredictionUnlock>,
    @InjectModel(BackedPrediction.name) private readonly backModel: Model<BackedPrediction>,
    private readonly dreamDex: DreamDexService,
  ) {}

  async create(predictionId: string, backerAddress: string, transactionHash: `0x${string}`): Promise<BackedPredictionRecord> {
    const prediction = await this.predictionModel.findById(predictionId).exec();
    if (!prediction) throw new NotFoundException("Prediction was not found");
    const backer = backerAddress.toLowerCase();
    if (prediction.status !== "ACTIVE") {
      throw new BadRequestException({ message: "Only active predictions can be backed", code: "PREDICTION_NOT_ACTIVE" });
    }
    if (prediction.predictorAddress === backer) {
      throw new BadRequestException({ message: "You cannot back your own prediction", code: "OWN_PREDICTION" });
    }
    if (prediction.visibility === "LOCKED") {
      const unlock = await this.unlockModel.findOne({ prediction: prediction._id, buyerAddress: backer, status: "CONFIRMED" }).exec();
      if (!unlock) throw new BadRequestException({ message: "Unlock this prediction before backing it", code: "UNLOCK_REQUIRED" });
    }

    // The API independently checks the stored window, not the current symbol.
    await this.dreamDex.assertTradingWindow(prediction.marketId, prediction.marketAddress);

    let proof: Awaited<ReturnType<DreamDexService["verifyPredictionTrade"]>>;
    try {
      proof = await this.dreamDex.verifyPredictionTrade({
        transactionHash,
        marketId: prediction.marketId,
        sender: backer,
        direction: prediction.direction,
      });
    } catch {
      throw new BadRequestException({
        message: "The transaction could not be verified as your filled DreamDEX trade",
        code: "TRADE_VERIFICATION_FAILED",
      });
    }

    const probabilities = await this.dreamDex.getMarketProbabilities(prediction.marketId).catch(() => null);
    const executionProbability = probabilities ? (prediction.direction === "UP" ? probabilities.yes : probabilities.no) : undefined;
    try {
      const record = await this.backModel.create({
        prediction: prediction._id,
        backerAddress: backer,
        direction: prediction.direction,
        stakeAmount: proof.filledAmount,
        marketProbabilityAtExecution: executionProbability,
        transactionHash: transactionHash.toLowerCase(),
        orderId: proof.orderId,
        status: "CONFIRMED",
      });
      return this.toDto(record);
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === 11_000) {
        throw new ConflictException({ message: "This transaction is already linked to a backed prediction", code: "TRANSACTION_ALREADY_USED" });
      }
      throw error;
    }
  }

  async getMine(predictionId: string, backerAddress: string): Promise<BackedPredictionRecord | null> {
    const record = await this.backModel.findOne({ prediction: predictionId, backerAddress: backerAddress.toLowerCase(), status: "CONFIRMED" }).sort({ createdAt: -1 }).exec();
    return record ? this.toDto(record) : null;
  }

  async recoverLatest(predictionId: string, backerAddress: string): Promise<BackedPredictionRecord> {
    const prediction = await this.predictionModel.findById(predictionId).exec();
    if (!prediction) throw new NotFoundException("Prediction was not found");
    const transactionHash = await this.dreamDex.findLatestFilledPredictionTrade({
      marketId: prediction.marketId,
      sender: backerAddress.toLowerCase(),
      direction: prediction.direction,
    });
    return this.create(predictionId, backerAddress, transactionHash);
  }

  private toDto(record: BackedPredictionDocument): BackedPredictionRecord {
    return {
      id: record._id.toString(),
      predictionId: record.prediction.toString(),
      backerAddress: record.backerAddress,
      direction: record.direction,
      stakeAmount: record.stakeAmount,
      marketProbabilityAtExecution: record.marketProbabilityAtExecution ?? 0,
      transactionHash: record.transactionHash,
      orderId: record.orderId ?? "",
      status: "CONFIRMED",
      createdAt: record.createdAt.toISOString(),
    };
  }
}
