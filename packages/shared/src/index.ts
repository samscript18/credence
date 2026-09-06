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
	baseDecimals: number;
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
	marketProbabilityAtEntry: number;
	transactionHash: string;
	orderId: string | null;
	filledQuantity: number;
	status: string;
};

export type DreamDexMarketQuote = DreamDexMarket & {
	probabilities: DreamDexProbabilities | null;
};

export type CredencePrediction = {
	positionReference?: string;
	claimTransactionHash?: string;
	marketAddress?: string;
	poolAddress?: string;
	windowSeconds?: number;
	marketStatus?: "live" | "closed" | "resolved" | "dead";
	unrealizedPnl?: string;
	settlementPayout?: string;
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
	collateralTokenAddress?: string;
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
	avatarUrl?: string;
	avatarSeed?: string;
	reputationScore: number;
	resolvedPredictions: number;
	accuracy: number;
	verified: boolean;
	rank?: number;
};

export type UpdateProfileInput = {
	displayName?: string;
	avatarUrl?: string;
	avatarSeed?: string;
};

export type VisiblePrediction = CredencePrediction & {
	locked: false;
	predictor: PredictorSummary;
};

export type GatedPrediction = {
	marketStatus?: "live" | "closed" | "resolved" | "dead";
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
	settledPnlByToken?: { token: string; symbol: string; pnl: string; pendingClaims: number }[];
	settlementAccountingMissing?: number;
	correctPredictions: number;
	incorrectPredictions: number;
	realizedPnl: string;
	activePredictions: PredictionFeedItem[];
	resolvedHistory: VisiblePrediction[];
};

export type LeaderboardEntry = PredictorSummary & {
	rank: number;
	correctPredictions: number;
	incorrectPredictions: number;
	realizedPnl: string;
};

export type UnlockInstructions = {
	escrowAddress: string;
	predictionKey: `0x${string}`;
	marketAddress: string;
	expiry: string;
	escrowState: number;
	windowLive: boolean;
	salesOpen: boolean;
	predictionId: string;
	chainId: number;
	recipient: string;
	tokenAddress: string;
	tokenSymbol: string;
	tokenDecimals: number;
	amountBaseUnits: string;
};

export type UnlockConfirmation = {
	unlocked: boolean;
	escrowState: number;
	unlockId: string;
	transactionHash: string;
};

export const insightEscrowSignatures = [
	"function token() view returns (address)",
	"function price() view returns (uint256)",
	"function payments(bytes32,address) view returns (address predictor,address market,uint64 expiry,uint8 state)",
	"function deposit(bytes32 prediction,address predictor,address market,uint64 expiry)",
	"function reveal(bytes32 prediction)",
	"function refund(bytes32 prediction,address buyer)",
] as const;

export type BackedPredictionRecord = {
	id: string;
	predictionId: string;
	backerAddress: string;
	direction: DreamDexDirection;
	stakeAmount: string;
	marketProbabilityAtExecution: number;
	transactionHash: string;
	orderId: string;
	status: "CONFIRMED";
	createdAt: string;
};
export { MIN_UNLOCK_BUFFER_SECONDS, insightSalesOpen } from "./lifecycle.js";
