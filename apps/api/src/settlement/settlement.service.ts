import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { DreamDexService } from "../dreamdex/dreamdex.service.js";
import { Prediction, type PredictionDocument } from "../predictions/schemas/prediction.schema.js";
import { ReputationService } from "../reputation/reputation.service.js";

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);
  private running = false;

  constructor(
    @InjectModel(Prediction.name) private readonly predictionModel: Model<Prediction>,
    private readonly dreamDex: DreamDexService,
    private readonly reputation: ReputationService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.resolveDuePredictions();
    } finally {
      this.running = false;
    }
  }

  async resolveDuePredictions(now = new Date()): Promise<number> {
    const due = await this.predictionModel
      .find({ status: "ACTIVE", marketExpiryAt: { $lte: now } })
      .sort({ marketExpiryAt: 1 })
      .limit(100)
      .exec();
    if (due.length === 0) return 0;

    const byMarket = new Map<string, PredictionDocument[]>();
    for (const prediction of due) {
      const group = byMarket.get(prediction.marketId) ?? [];
      group.push(prediction);
      byMarket.set(prediction.marketId, group);
    }

    const changedWallets = new Set<string>();
    let resolved = 0;
    for (const [marketId, predictions] of byMarket) {
      try {
        const settlement = await this.dreamDex.getMarketSettlement(marketId);
        if (!settlement.finalized || (!settlement.isResolved && !settlement.isVoided) || !settlement.finalOutcome) continue;
        for (const prediction of predictions) {
          const update = settlement.finalOutcome === "VOID"
            ? {
                $set: { status: "RESOLVED", finalOutcome: "VOID", resolvedAt: now },
                $unset: { isCorrect: 1 },
              }
            : {
                $set: {
                  status: "RESOLVED",
                  finalOutcome: settlement.finalOutcome,
                  isCorrect: prediction.direction === settlement.finalOutcome,
                  resolvedAt: now,
                },
              };
          const result = await this.predictionModel.updateOne({ _id: prediction._id, status: "ACTIVE" }, update).exec();
          if (result.modifiedCount > 0) {
            resolved += 1;
            changedWallets.add(prediction.predictorAddress);
          }
        }
      } catch (error) {
        this.logger.warn(`Settlement read failed for ${marketId}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    for (const walletAddress of changedWallets) {
      await this.reputation.recalculate(walletAddress);
    }
    return resolved;
  }
}
