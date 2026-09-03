import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { Prediction } from "../predictions/schemas/prediction.schema.js";
import { User } from "../users/schemas/user.schema.js";
import { calculateReputation } from "./reputation.calculator.js";

@Injectable()
export class ReputationService {
  constructor(
    @InjectModel(Prediction.name) private readonly predictionModel: Model<Prediction>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async recalculate(walletAddress: string): Promise<void> {
    const predictions = await this.predictionModel
      .find({
        predictorAddress: walletAddress.toLowerCase(),
        status: "RESOLVED",
        finalOutcome: { $in: ["UP", "DOWN", "VOID"] },
      })
      .sort({ createdAt: 1 })
      .exec();
    const result = calculateReputation(
      predictions.flatMap((prediction) =>
        prediction.finalOutcome
          ? [{
              direction: prediction.direction,
              confidence: prediction.confidence,
              marketProbabilityAtEntry: prediction.marketProbabilityAtEntry,
              finalOutcome: prediction.finalOutcome,
              createdAt: prediction.createdAt,
              ...(prediction.realizedPnl ? { realizedPnl: prediction.realizedPnl } : {}),
            }]
          : [],
      ),
    );
    await this.userModel.updateOne({ walletAddress: walletAddress.toLowerCase() }, { $set: result }).exec();
  }
}
