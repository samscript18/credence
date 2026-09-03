import "reflect-metadata";

import mongoose, { type Model } from "mongoose";

import { Prediction, PredictionSchema } from "../predictions/schemas/prediction.schema.js";
import { calculateReputation, sumDecimalStrings, type ResolvedForecast } from "../reputation/reputation.calculator.js";
import { User, UserSchema } from "../users/schemas/user.schema.js";

type Persona = {
  name: string;
  address: `0x${string}`;
  count: number;
  accuracy: number;
  confidenceMin: number;
  confidenceRange: number;
  marketMin: number;
  marketRange: number;
};

const personas: Persona[] = [
  { name: "Nova", address: `0x${"10".repeat(20)}`, count: 84, accuracy: 0.88, confidenceMin: 70, confidenceRange: 8, marketMin: 0.42, marketRange: 0.22 },
  { name: "Marcus", address: `0x${"21".repeat(20)}`, count: 68, accuracy: 0.82, confidenceMin: 72, confidenceRange: 10, marketMin: 0.38, marketRange: 0.24 },
  { name: "David", address: `0x${"32".repeat(20)}`, count: 45, accuracy: 0.8, confidenceMin: 70, confidenceRange: 17, marketMin: 0.25, marketRange: 0.3 },
  { name: "Maya", address: `0x${"43".repeat(20)}`, count: 36, accuracy: 0.82, confidenceMin: 68, confidenceRange: 16, marketMin: 0.3, marketRange: 0.3 },
  { name: "Theo", address: `0x${"54".repeat(20)}`, count: 42, accuracy: 0.64, confidenceMin: 58, confidenceRange: 12, marketMin: 0.46, marketRange: 0.22 },
  { name: "Luna", address: `0x${"65".repeat(20)}`, count: 34, accuracy: 0.61, confidenceMin: 58, confidenceRange: 14, marketMin: 0.42, marketRange: 0.26 },
  { name: "Kai", address: `0x${"76".repeat(20)}`, count: 28, accuracy: 0.56, confidenceMin: 55, confidenceRange: 15, marketMin: 0.4, marketRange: 0.3 },
  { name: "Iris", address: `0x${"87".repeat(20)}`, count: 22, accuracy: 0.72, confidenceMin: 64, confidenceRange: 16, marketMin: 0.32, marketRange: 0.3 },
];

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function cents(value: number): string {
  const negative = value < 0;
  const digits = Math.abs(value).toString().padStart(3, "0");
  const whole = digits.slice(0, -2);
  const fraction = digits.slice(-2).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seeding is disabled in production");
  if (process.env.ENABLE_DEMO_SEED !== "true") {
    throw new Error("Set ENABLE_DEMO_SEED=true explicitly to seed demo data");
  }

  await mongoose.connect(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/credence");
  const UserModel =
    (mongoose.models[User.name] as Model<User> | undefined) ??
    mongoose.model<User>(User.name, UserSchema);
  const PredictionModel =
    (mongoose.models[Prediction.name] as Model<Prediction> | undefined) ??
    mongoose.model<Prediction>(Prediction.name, PredictionSchema);
  await PredictionModel.deleteMany({ source: "DEMO_SEED" });

  let predictionCount = 0;
  const summaries: Array<{ name: string; reputation: number; resolved: number; verified: boolean }> = [];
  for (const [personaIndex, persona] of personas.entries()) {
    const random = makeRandom(10_000 + personaIndex);
    const user = await UserModel.findOneAndUpdate(
      { walletAddress: persona.address.toLowerCase(), isDemo: true },
      { $set: { displayName: persona.name, avatarSeed: persona.name.toLowerCase(), isDemo: true } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).orFail();
    const forecasts: ResolvedForecast[] = [];
    const rows = Array.from({ length: persona.count }, (_, index): Prediction => {
      const direction: "UP" | "DOWN" = random() > 0.5 ? "UP" : "DOWN";
      const isCorrect = random() < persona.accuracy;
      const confidence = Math.min(99, Math.round(persona.confidenceMin + random() * persona.confidenceRange));
      const marketProbabilityAtEntry = Math.round((persona.marketMin + random() * persona.marketRange) * 1000) / 1000;
      const finalOutcome: "UP" | "DOWN" = isCorrect ? direction : direction === "UP" ? "DOWN" : "UP";
      const realizedPnl = cents(isCorrect ? 25 + Math.floor(random() * 550) : -(20 + Math.floor(random() * 380)));
      const createdAt = new Date(Date.UTC(2026, 4, 1) + (personaIndex * 100 + index) * 3_600_000);
      forecasts.push({ direction, confidence, marketProbabilityAtEntry, finalOutcome, createdAt, realizedPnl });
      return {
        predictor: user._id,
        predictorAddress: persona.address.toLowerCase(),
        source: "DEMO_SEED",
        marketId: `demo:${persona.name.toLowerCase()}:${index + 1}`,
        symbol: `${index % 2 === 0 ? "BTC" : "ETH"}-DEMO-${index + 1}`,
        underlying: index % 2 === 0 ? "BTC" : "ETH",
        marketTitle: `${index % 2 === 0 ? "BTC" : "ETH"} closes ${direction === "UP" ? "above" : "below"} its reference price`,
        marketStartAt: new Date(createdAt.getTime() - 15 * 60_000),
        marketExpiryAt: new Date(createdAt.getTime() + 15 * 60_000),
        direction,
        confidence,
        reasoning: index % 3 === 0 ? "Momentum and order-book imbalance diverged from the market price." : undefined,
        visibility: index % 7 === 0 ? "LOCKED" : "PUBLIC",
        marketProbabilityAtEntry,
        stakeAmount: String(5 + (index % 20)),
        collateralSymbol: "DEMO tUSDC",
        status: "RESOLVED",
        finalOutcome,
        isCorrect,
        realizedPnl,
        resolvedAt: new Date(createdAt.getTime() + 16 * 60_000),
        createdAt,
        updatedAt: createdAt,
      };
    });
    await PredictionModel.insertMany(rows);
    predictionCount += rows.length;
    const result = calculateReputation(forecasts);
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { ...result, realizedPnl: sumDecimalStrings(forecasts.map((forecast) => forecast.realizedPnl ?? "0")) } },
    );
    summaries.push({ name: persona.name, reputation: Math.round(result.reputationScore * 10) / 10, resolved: result.resolvedPredictions, verified: result.reputationScore >= 80 && result.resolvedPredictions >= 25 });
  }

  console.log(JSON.stringify({ users: personas.length, predictions: predictionCount, summaries }, null, 2));
}

seed()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
