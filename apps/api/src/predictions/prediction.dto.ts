import type { CredencePrediction } from "@credence/shared";

import type { PredictionDocument } from "./schemas/prediction.schema.js";

export function toPredictionDto(prediction: PredictionDocument): CredencePrediction {
  return {
    id: prediction._id.toString(),
    predictorAddress: prediction.predictorAddress,
    source: prediction.source,
    marketId: prediction.marketId,
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
    ...(prediction.transactionHash ? { transactionHash: prediction.transactionHash } : {}),
    ...(prediction.orderId ? { orderId: prediction.orderId } : {}),
    status: prediction.status,
    ...(prediction.finalOutcome ? { finalOutcome: prediction.finalOutcome } : {}),
    ...(prediction.isCorrect !== undefined ? { isCorrect: prediction.isCorrect } : {}),
    ...(prediction.realizedPnl ? { realizedPnl: prediction.realizedPnl } : {}),
    createdAt: prediction.createdAt.toISOString(),
  };
}
