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
