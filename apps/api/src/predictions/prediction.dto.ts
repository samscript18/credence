import type {
  CredencePrediction,
  GatedPrediction,
  PredictorSummary,
  VisiblePrediction,
} from "@credence/shared";

import type { PredictionDocument } from "./schemas/prediction.schema.js";
import { isVerifiedPredictor, type User } from "../users/schemas/user.schema.js";

export function toPredictionDto(prediction: PredictionDocument): CredencePrediction {
  return {
    id: prediction._id.toString(),
    predictorAddress: prediction.predictorAddress,
    source: prediction.source,
    marketId: prediction.marketId,
    marketAddress: prediction.marketAddress,
    poolAddress: prediction.poolAddress,
    windowSeconds: prediction.windowSeconds,
    marketStatus: prediction.marketStatus ?? (prediction.status === "RESOLVED" ? "resolved" : "closed"),
    unrealizedPnl: prediction.unrealizedPnl,
    settlementPayout: prediction.settlementPayout,
    positionReference: prediction.positionReference,
    claimTransactionHash: prediction.claimTransactionHash,
    ...(prediction.symbol ? { symbol: prediction.symbol } : {}),
    ...(prediction.underlying ? { underlying: prediction.underlying } : {}),
    marketTitle: prediction.marketTitle,
    marketExpiryAt: prediction.marketExpiryAt.toISOString(),
    direction: prediction.direction,
    confidence: prediction.confidence,
    ...(prediction.reasoning ? { reasoning: prediction.reasoning } : {}),
    visibility: prediction.visibility,
    marketProbabilityAtEntry: prediction.marketProbabilityAtEntry,
    stakeAmount: prediction.stakeAmount,
    ...(prediction.collateralSymbol ? { collateralSymbol: prediction.collateralSymbol } : {}),
    ...(prediction.collateralTokenAddress ? { collateralTokenAddress: prediction.collateralTokenAddress } : {}),
    ...(prediction.transactionHash ? { transactionHash: prediction.transactionHash } : {}),
    ...(prediction.orderId ? { orderId: prediction.orderId } : {}),
    status: prediction.status,
    ...(prediction.finalOutcome ? { finalOutcome: prediction.finalOutcome } : {}),
    ...(prediction.isCorrect !== undefined ? { isCorrect: prediction.isCorrect } : {}),
    ...(prediction.realizedPnl && (prediction.source === "DEMO_SEED" || prediction.claimTransactionHash) ? { realizedPnl: prediction.realizedPnl } : {}),
    createdAt: prediction.createdAt.toISOString(),
  };
}

export function toPredictorSummary(user: User): PredictorSummary {
  return {
    isDemo: user.isDemo === true,
    walletAddress: user.walletAddress,
    ...(user.displayName ? { displayName: user.displayName } : {}),
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    ...(user.avatarSeed ? { avatarSeed: user.avatarSeed } : {}),
    reputationScore: user.reputationScore,
    resolvedPredictions: user.resolvedPredictions,
    accuracy: user.accuracy,
    verified: isVerifiedPredictor(user),
  };
}

export function toVisiblePredictionDto(
  prediction: PredictionDocument,
  predictor: PredictorSummary,
): VisiblePrediction {
  return { ...toPredictionDto(prediction), locked: false, predictor };
}

export function toGatedPredictionDto(
  prediction: PredictionDocument,
  predictor: PredictorSummary,
): GatedPrediction {
  return {
    id: prediction._id.toString(),
    predictorAddress: prediction.predictorAddress,
    predictor,
    source: prediction.source,
    marketId: prediction.marketId,
    ...(prediction.symbol ? { symbol: prediction.symbol } : {}),
    ...(prediction.underlying ? { underlying: prediction.underlying } : {}),
    marketTitle: prediction.marketTitle,
    marketExpiryAt: prediction.marketExpiryAt.toISOString(),
    visibility: "LOCKED",
    marketStatus: prediction.marketStatus ?? "closed",
    status: "ACTIVE",
    locked: true,
    createdAt: prediction.createdAt.toISOString(),
  };
}
