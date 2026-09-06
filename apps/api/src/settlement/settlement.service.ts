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
      await this.reconcileAccounting();
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
      const key = `${prediction.marketId}:${prediction.marketAddress?.toLowerCase() ?? "legacy"}`;
      const group = byMarket.get(key) ?? [];
      group.push(prediction);
      byMarket.set(key, group);
    }

    const changedWallets = new Set<string>();
    let resolved = 0;
    for (const predictions of byMarket.values()) {
      const marketId = predictions[0]!.marketId;
      try {
        // Direct module/settlement read remains valid after loadMarkets drops
        // the window; validate the stored contract, never search by symbol.
        const settlement = await this.dreamDex.getMarketSettlement(marketId, predictions[0]?.marketAddress);
        await this.predictionModel.updateMany({ _id: { $in: predictions.map(prediction => prediction._id) }, status: "ACTIVE" }, { $set: { marketStatus: "closed" } }).exec();
        if (!settlement.finalized || (!settlement.isResolved && !settlement.isVoided) || !settlement.finalOutcome) continue;
        for (const prediction of predictions) {
          if (prediction.source === "LIVE" && prediction.marketAddress && prediction.positionReference && prediction.entryCostBaseUnits !== undefined && prediction.collateralDecimals !== undefined) {
            try {
              const accounting = await this.dreamDex.settledPosition({ marketId, marketAddress: prediction.marketAddress, direction: prediction.direction, quantity: prediction.positionReference, cost: prediction.entryCostBaseUnits, decimals: prediction.collateralDecimals });
              await this.predictionModel.updateOne({ _id: prediction._id }, { $set: accounting }).exec();
            } catch (error) { this.logger.warn(`P&L unavailable for ${marketId}: ${error instanceof Error ? error.message : "read failed"}`); }
          }
          const update = settlement.finalOutcome === "VOID"
            ? {
                $set: { status: "RESOLVED", marketStatus: "resolved", visibility: "PUBLIC", finalOutcome: "VOID", resolvedAt: now },
                $unset: { isCorrect: 1 },
              }
            : {
                $set: {
                  status: "RESOLVED",
                  marketStatus: "resolved",
                  visibility: "PUBLIC",
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

  /** Retry historical/missed accounting without changing outcomes or claim proof. */
  async reconcileAccounting(): Promise<void> {
    const rows = await this.predictionModel.find({
      source: "LIVE", status: "RESOLVED", settlementPayout: { $exists: false },
      marketAddress: { $type: "string" }, positionReference: { $type: "string" },
      entryCostBaseUnits: { $type: "string" }, collateralDecimals: { $exists: true, $ne: null },
    }).sort({ updatedAt: 1 }).limit(25).exec();
    for (const row of rows) {
      try {
        const accounting = await this.dreamDex.settledPosition({ marketId: row.marketId, marketAddress: row.marketAddress!, direction: row.direction, quantity: row.positionReference!, cost: row.entryCostBaseUnits!, decimals: row.collateralDecimals! });
        await this.predictionModel.updateOne({ _id: row._id, status: "RESOLVED" }, { $set: accounting }).exec();
      } catch { this.logger.warn(`Settlement accounting remains unavailable for ${row._id.toString()}`); }
    }
  }
}
