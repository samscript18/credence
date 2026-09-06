import type {
  DreamDexMarket,
  DreamDexProbabilities,
  DreamDexSettlement,
} from "@credence/shared";
import type {
  MarketOnchain,
  UnifiedMarket,
  UnifiedOrderBook,
} from "@somnia-chain/markets-sdk";
import { isBinaryMarket } from "@somnia-chain/markets-sdk";

function unixSecondsToIso(value: string | bigint): string {
  return new Date(Number(value) * 1000).toISOString();
}

export function toDreamDexMarket(market: UnifiedMarket): DreamDexMarket {
  if (!isBinaryMarket(market.info)) {
    throw new Error(`Market ${market.id} is not a DreamDEX Event Contract`);
  }

  const yesSymbol = market.outcomes?.find((outcome) => outcome.index === 0)?.symbol;
  const noSymbol = market.outcomes?.find((outcome) => outcome.index === 1)?.symbol;
  if (!yesSymbol || !noSymbol) {
    throw new Error(`Event Contract ${market.info.marketId} is missing outcome symbols`);
  }

  return {
    marketId: market.info.marketId,
    symbol: market.symbol,
    title: market.info.question,
    underlying: market.info.asset,
    venueId: market.info.venueId ?? null,
    poolAddress: market.info.poolAddress,
    marketAddress: market.info.marketAddress,
    collateralTokenAddress: market.info.collateral,
    collateralSymbol: market.quote,
    collateralDecimals: market.info.quoteDecimals,
    baseDecimals: market.info.baseDecimals,
    tradingStartAt: unixSecondsToIso(market.info.tradingStart),
    expiryAt: unixSecondsToIso(market.info.expiry),
    indexedStatus: market.info.status,
    tradable: market.active,
    minimumQuantity: market.limits.amount.min ?? null,
    yesSymbol,
    noSymbol,
  };
}

export function toDreamDexProbabilities(
  marketId: string,
  book: UnifiedOrderBook,
): DreamDexProbabilities {
  const bestYesBid = book.bids[0]?.[0] ?? null;
  const bestYesAsk = book.asks[0]?.[0] ?? null;
  const yes =
    bestYesBid !== null && bestYesAsk !== null
      ? (bestYesBid + bestYesAsk) / 2
      : (bestYesBid ?? bestYesAsk);

  if (yes === null || !Number.isFinite(yes) || yes < 0 || yes > 1) {
    throw new Error(`Event Contract ${marketId} has no valid probability quote`);
  }

  return {
    marketId,
    yes,
    no: 1 - yes,
    bestYesBid,
    bestYesAsk,
    observedAt: new Date(book.timestamp ?? Date.now()).toISOString(),
  };
}

export function toDreamDexSettlement(
  marketId: string,
  onchain: MarketOnchain,
): DreamDexSettlement {
  const finalOutcome = onchain.isVoided
    ? "VOID"
    : onchain.isResolved
      ? onchain.winningOutcome === 0
        ? "UP"
        : "DOWN"
      : null;

  return {
    marketId,
    status: onchain.status,
    finalized: onchain.finalized,
    isResolved: onchain.isResolved,
    isVoided: onchain.isVoided,
    finalOutcome,
    expiryAt: unixSecondsToIso(onchain.expiry),
  };
}
