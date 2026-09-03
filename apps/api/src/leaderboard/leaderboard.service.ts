import type { LeaderboardEntry } from "@credence/shared";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { isVerifiedPredictor, User } from "../users/schemas/user.schema.js";

@Injectable()
export class LeaderboardService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async list(): Promise<LeaderboardEntry[]> {
    const users = await this.userModel
      .find()
      .sort({ reputationScore: -1, resolvedPredictions: -1, accuracy: -1 })
      .exec();
    return users.map((user, index) => ({
      rank: index + 1,
      walletAddress: user.walletAddress,
      ...(user.displayName ? { displayName: user.displayName } : {}),
      reputationScore: user.reputationScore,
      resolvedPredictions: user.resolvedPredictions,
      correctPredictions: user.correctPredictions,
      incorrectPredictions: user.incorrectPredictions,
      accuracy: user.accuracy,
      realizedPnl: user.realizedPnl,
      verified: isVerifiedPredictor(user),
    }));
  }

  async ranks(addresses: string[]): Promise<Map<string, number>> {
    const wanted = new Set(addresses.map((address) => address.toLowerCase()));
    const result = new Map<string, number>();
    for (const entry of await this.list()) {
      if (wanted.has(entry.walletAddress)) result.set(entry.walletAddress, entry.rank);
    }
    return result;
  }
}
