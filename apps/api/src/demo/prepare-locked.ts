import "reflect-metadata";

import { ConfigService } from "@nestjs/config";
import mongoose, { type Model } from "mongoose";

import { DreamDexService } from "../dreamdex/dreamdex.service.js";
import { Prediction, PredictionSchema } from "../predictions/schemas/prediction.schema.js";
import { User, UserSchema } from "../users/schemas/user.schema.js";

async function prepare(): Promise<void> {
  if (process.env.NODE_ENV === "production") throw new Error("Demo preparation is disabled in production");
  if (process.env.ENABLE_DEMO_SEED !== "true") {
    throw new Error("Set ENABLE_DEMO_SEED=true explicitly to prepare the locked demo");
  }

  await mongoose.connect(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/credence");
  const UserModel =
    (mongoose.models[User.name] as Model<User> | undefined) ??
    mongoose.model<User>(User.name, UserSchema);
  const PredictionModel =
    (mongoose.models[Prediction.name] as Model<Prediction> | undefined) ??
    mongoose.model<Prediction>(Prediction.name, PredictionSchema);
  const david = await UserModel.findOne({ displayName: "David", isDemo: true }).orFail();
  if (david.reputationScore < 80 || david.resolvedPredictions < 25) {
    throw new Error("Seeded David is not currently eligible for locked predictions");
  }

  const dreamDex = new DreamDexService(new ConfigService(process.env));
  const markets = await dreamDex.listEventMarkets();
  let selected: (typeof markets)[number] | undefined;
  let probability: number | undefined;
  for (const market of markets) {
    try {
      const quote = await dreamDex.getMarketProbabilities(market.marketId);
      if (quote.bestYesBid !== null && quote.bestYesAsk !== null) {
        selected = market;
        probability = quote.no;
        break;
      }
    } catch {
      // Rotate to the next real live market when a CLOB is empty.
    }
  }
  if (!selected || probability === undefined) throw new Error("No live DreamDEX market with a two-sided book is available");

  await PredictionModel.deleteMany({ source: "DEMO_SEED", status: "ACTIVE" });
  const prediction = await PredictionModel.create({
    predictor: david._id,
    predictorAddress: david.walletAddress,
    source: "DEMO_SEED",
    marketId: selected.marketId,
    venueId: selected.venueId ?? undefined,
    symbol: selected.symbol,
    underlying: selected.underlying,
    marketTitle: selected.title,
    marketStartAt: new Date(selected.tradingStartAt),
    marketExpiryAt: new Date(selected.expiryAt),
    direction: "DOWN",
    confidence: 78,
    reasoning: "Momentum weakened while the market continued pricing a clean continuation.",
    visibility: "LOCKED",
    marketProbabilityAtEntry: probability,
    stakeAmount: String(selected.minimumQuantity ?? "0.001"),
    collateralSymbol: `DEMO ${selected.collateralSymbol}`,
    collateralTokenAddress: selected.collateralTokenAddress,
    status: "ACTIVE",
  });
  console.log(JSON.stringify({ predictionId: prediction._id.toString(), predictor: "David", marketId: selected.marketId, expiresAt: selected.expiryAt, transactionHash: null }, null, 2));
}

prepare()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit(process.exitCode ?? 0);
  });
