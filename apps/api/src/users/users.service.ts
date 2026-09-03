import type { PredictorProfile, VisiblePrediction } from "@credence/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { PredictionsService } from "../predictions/predictions.service.js";
import { toPredictorSummary } from "../predictions/prediction.dto.js";
import { User } from "./schemas/user.schema.js";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly predictions: PredictionsService,
  ) {}

  async getProfile(address: string, viewerAddress?: string): Promise<PredictorProfile> {
    const walletAddress = address.toLowerCase();
    const user = await this.userModel.findOne({ walletAddress }).exec();
    if (!user) throw new NotFoundException("Predictor was not found");
    const predictions = await this.predictions.getForProfile(walletAddress, viewerAddress);
    const resolvedHistory = predictions.resolved.filter(
      (prediction): prediction is VisiblePrediction => !prediction.locked,
    );
    return {
      ...toPredictorSummary(user),
      correctPredictions: user.correctPredictions,
      incorrectPredictions: user.incorrectPredictions,
      realizedPnl: user.realizedPnl,
      activePredictions: predictions.active,
      resolvedHistory,
    };
  }

  async getHistory(address: string): Promise<VisiblePrediction[]> {
    return (await this.getProfile(address)).resolvedHistory;
  }
}
