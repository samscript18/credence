import type { PredictorProfile, VisiblePrediction } from "@credence/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { PredictionsService } from "../predictions/predictions.service.js";
import { LeaderboardService } from "../leaderboard/leaderboard.service.js";
import { toPredictorSummary } from "../predictions/prediction.dto.js";
import { User } from "./schemas/user.schema.js";
import { settledSummary } from "./settled-summary.js";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly predictions: PredictionsService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async getProfile(address: string, viewerAddress?: string): Promise<PredictorProfile> {
    const walletAddress = address.toLowerCase();
    const user = await this.userModel.findOne({ walletAddress }).exec();
    if (!user) throw new NotFoundException("Predictor was not found");
    const predictions = await this.predictions.getForProfile(walletAddress, viewerAddress);
    const rank = (await this.leaderboard.ranks([walletAddress])).get(walletAddress);
    const resolvedHistory = predictions.resolved.filter(
      (prediction): prediction is VisiblePrediction => !prediction.locked,
    );
    return {
      ...toPredictorSummary(user),
      ...(rank ? { rank } : {}),
      correctPredictions: user.correctPredictions,
      incorrectPredictions: user.incorrectPredictions,
      realizedPnl: user.realizedPnl,
      activePredictions: predictions.active,
      resolvedHistory,
      ...settledSummary(resolvedHistory),
    };
  }

  async getHistory(address: string): Promise<VisiblePrediction[]> {
    return (await this.getProfile(address)).resolvedHistory;
  }

  async updateProfile(
    address: string,
    input: { displayName?: string; avatarUrl?: string; avatarSeed?: string },
  ): Promise<PredictorProfile> {
    const walletAddress = address.toLowerCase();
    const update: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    if (input.displayName !== undefined) {
      if (input.displayName.trim()) update.displayName = input.displayName.trim();
      else unset.displayName = 1;
    }
    if (input.avatarUrl !== undefined) {
      if (input.avatarUrl.trim()) update.avatarUrl = input.avatarUrl.trim();
      else unset.avatarUrl = 1;
    }
    if (input.avatarSeed !== undefined) {
      update.avatarSeed = input.avatarSeed.trim() || undefined;
    }

    await this.userModel
      .findOneAndUpdate(
        { walletAddress },
        { $set: update, $unset: unset },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    return this.getProfile(walletAddress, walletAddress);
  }
}
