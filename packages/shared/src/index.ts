export const SOMNIA_SHANNON_CHAIN_ID = 50_312;

export type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type DreamDexDirection = "UP" | "DOWN";

export type DreamDexMarket = {
  marketId: string;
  symbol: string;
  title: string;
  underlying: string;
  venueId: string | null;
  poolAddress: string;
  marketAddress: string;
  collateralTokenAddress: string;
  collateralSymbol: string;
  collateralDecimals: number;
  tradingStartAt: string;
  expiryAt: string;
  indexedStatus: string;
  tradable: boolean;
  minimumQuantity: number | null;
  yesSymbol: string;
  noSymbol: string;
};

export type DreamDexProbabilities = {
  marketId: string;
  yes: number;
  no: number;
  bestYesBid: number | null;
  bestYesAsk: number | null;
  observedAt: string;
};

export type DreamDexSettlement = {
  marketId: string;
  status: number;
  finalized: boolean;
  isResolved: boolean;
  isVoided: boolean;
  finalOutcome: DreamDexDirection | "VOID" | null;
  expiryAt: string;
};

export type DreamDexTradeResult = {
  transactionHash: string;
  orderId: string | null;
  filledQuantity: number;
  status: string;
};

export type DreamDexMarketQuote = DreamDexMarket & {
  probabilities: DreamDexProbabilities | null;
};

export type CredencePrediction = {
  id: string;
  predictorAddress: string;
  source: "LIVE" | "DEMO_SEED";
  marketId: string;
  symbol?: string;
  underlying?: string;
  marketTitle: string;
  marketExpiryAt: string;
  direction: DreamDexDirection;
  confidence: number;
  reasoning?: string;
  visibility: "PUBLIC" | "LOCKED";
  marketProbabilityAtEntry: number;
  stakeAmount: string;
  collateralSymbol?: string;
  transactionHash?: string;
  orderId?: string;
  status: "PENDING_TRADE" | "ACTIVE" | "RESOLVED" | "FAILED";
  finalOutcome?: DreamDexDirection | "VOID";
  isCorrect?: boolean;
  realizedPnl?: string;
  createdAt: string;
};

export type PredictorSummary = {
  walletAddress: string;
  displayName?: string;
  reputationScore: number;
  resolvedPredictions: number;
  accuracy: number;
  verified: boolean;
  rank?: number;
};

export type VisiblePrediction = CredencePrediction & {
  locked: false;
  predictor: PredictorSummary;
};

export type GatedPrediction = {
  id: string;
  predictorAddress: string;
  predictor: PredictorSummary;
  source: "LIVE" | "DEMO_SEED";
  marketId: string;
  symbol?: string;
  underlying?: string;
  marketTitle: string;
  marketExpiryAt: string;
  visibility: "LOCKED";
  status: "ACTIVE";
  locked: true;
  createdAt: string;
};

export type PredictionFeedItem = VisiblePrediction | GatedPrediction;

export type PredictorProfile = PredictorSummary & {
  correctPredictions: number;
  incorrectPredictions: number;
  realizedPnl: string;
  activePredictions: PredictionFeedItem[];
  resolvedHistory: VisiblePrediction[];
};
