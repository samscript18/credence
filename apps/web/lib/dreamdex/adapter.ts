"use client";

import type {
  DreamDexDirection,
  DreamDexMarket,
  DreamDexProbabilities,
  DreamDexSettlement,
  DreamDexTradeResult,
} from "@credence/shared";
import {
  isBinaryMarket,
  type BinaryMarket,
  type MarketOnchain,
  type PlaceOrderResult,
  type UnifiedMarket,
  type UnifiedOrderBook,
} from "@somnia-chain/markets-sdk";
import type { Address, WalletClient } from "viem";

import { getDreamDexExchange } from "./client";

type BinaryUnifiedMarket = UnifiedMarket & { info: BinaryMarket };

export type DreamDexPosition = {
  yesBalance: string;
  noBalance: string;
};

export type DreamDexMarketInspection = {
  market: DreamDexMarket;
  probabilities: DreamDexProbabilities;
  settlement: DreamDexSettlement;
  orderBook: UnifiedOrderBook;
  onchain: MarketOnchain;
};

export type ExecutePredictionTradeInput = {
  marketId: string;
  direction: DreamDexDirection;
  walletClient: WalletClient;
  account: Address;
  quantity?: number;
};

function unixSecondsToIso(value: string | bigint): string {
  return new Date(Number(value) * 1000).toISOString();
}

function normalizeMarket(market: BinaryUnifiedMarket): DreamDexMarket {
  const yesSymbol = market.outcomes?.find((outcome) => outcome.index === 0)?.symbol;
  const noSymbol = market.outcomes?.find((outcome) => outcome.index === 1)?.symbol;
  if (!yesSymbol || !noSymbol) throw new Error("DreamDEX market is missing outcome symbols.");

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
    tradingStartAt: unixSecondsToIso(market.info.tradingStart),
    expiryAt: unixSecondsToIso(market.info.expiry),
    indexedStatus: market.info.status,
    tradable: market.active,
    minimumQuantity: market.limits.amount.min ?? null,
    yesSymbol,
    noSymbol,
  };
}

function normalizeProbabilities(marketId: string, book: UnifiedOrderBook): DreamDexProbabilities {
  const bestYesBid = book.bids[0]?.[0] ?? null;
  const bestYesAsk = book.asks[0]?.[0] ?? null;
  const yes =
    bestYesBid !== null && bestYesAsk !== null
      ? (bestYesBid + bestYesAsk) / 2
      : (bestYesBid ?? bestYesAsk);
  if (yes === null || yes < 0 || yes > 1) throw new Error("No valid probability quote is available.");
  return {
    marketId,
    yes,
    no: 1 - yes,
    bestYesBid,
    bestYesAsk,
    observedAt: new Date(book.timestamp ?? Date.now()).toISOString(),
  };
}

function normalizeSettlement(marketId: string, value: MarketOnchain): DreamDexSettlement {
  return {
    marketId,
    status: value.status,
    finalized: value.finalized,
    isResolved: value.isResolved,
    isVoided: value.isVoided,
    finalOutcome: value.isVoided
      ? "VOID"
      : value.isResolved
        ? value.winningOutcome === 0
          ? "UP"
          : "DOWN"
        : null,
    expiryAt: unixSecondsToIso(value.expiry),
  };
}

class DreamDexBrowserAdapter {
  async listEventMarkets(): Promise<DreamDexMarket[]> {
    return (await this.loadBinaryMarkets())
      .filter((market) => market.active)
      .sort((left, right) => Number(right.info.expiry) - Number(left.info.expiry))
      .map(normalizeMarket);
  }

  async getEventMarket(marketId: string): Promise<DreamDexMarket> {
    return normalizeMarket(await this.findMarket(marketId));
  }

  async getMarketProbabilities(marketId: string): Promise<DreamDexProbabilities> {
    const market = await this.findMarket(marketId);
    const book = await getDreamDexExchange().fetchOrderBook(this.outcomeSymbol(market, "UP"), 5);
    return normalizeProbabilities(market.info.marketId, book);
  }

  async getMarketSettlement(marketId: string): Promise<DreamDexSettlement> {
    const onchain = await getDreamDexExchange().client.getMarketOnchain(
      marketId as `0x${string}`,
    );
    return normalizeSettlement(marketId, onchain);
  }

  async inspectEventMarket(marketId: string): Promise<DreamDexMarketInspection> {
    const market = await this.findMarket(marketId);
    const exchange = getDreamDexExchange();
    const [orderBook, onchain] = await Promise.all([
      exchange.fetchOrderBook(this.outcomeSymbol(market, "UP"), 5),
      exchange.client.getMarketOnchain(market.info.marketId),
    ]);
    return {
      market: normalizeMarket(market),
      probabilities: normalizeProbabilities(market.info.marketId, orderBook),
      settlement: normalizeSettlement(market.info.marketId, onchain),
      orderBook,
      onchain,
    };
  }

  async prepareOrExecutePredictionTrade(
    input: ExecutePredictionTradeInput,
  ): Promise<DreamDexTradeResult> {
    const exchange = getDreamDexExchange();
    exchange.setSigner({ walletClient: input.walletClient });
    const market = await this.findMarket(input.marketId, true);
    if (!market.active) throw new Error("Market is no longer active.");

    // The indexer discovers markets, but this chain read is the write authority.
    const onchain = await exchange.client.getMarketOnchain(market.info.marketId);
    if (onchain.status !== 1) throw new Error(`Market is not Trading (status ${onchain.status}).`);
    if (Number(onchain.expiry) <= Date.now() / 1000 + 15) {
      throw new Error("Market is too close to expiry for a safe trade.");
    }

    const outcomeSymbol = this.outcomeSymbol(market, input.direction);
    const book = await exchange.fetchOrderBook(outcomeSymbol, 5);
    const bestAsk = book.asks[0]?.[0];
    if (bestAsk === undefined) throw new Error(`No resting ${input.direction} ask is available.`);
    const minimum = market.limits.amount.min;
    const quantity = input.quantity ?? minimum;
    if (quantity === undefined || quantity <= 0) {
      throw new Error("DreamDEX did not expose a valid minimum quantity.");
    }
    if (minimum !== undefined && quantity < minimum) {
      throw new Error(`Quantity must be at least ${minimum}.`);
    }

    const protectivePrice = Math.min(0.999, bestAsk + 0.02);
    const order = await exchange.createOrder(
      outcomeSymbol,
      "limit",
      "buy",
      quantity,
      protectivePrice,
      { timeInForce: "IOC" },
    );
    const result = order.info as PlaceOrderResult;
    if (result.receipt.status !== "success") {
      throw new Error(`DreamDEX trade transaction ${result.receipt.status}.`);
    }
    if (order.filled <= 0) {
      throw new Error("DreamDEX confirmed the order, but it did not fill. Refresh the market and retry.");
    }
    return {
      transactionHash: result.hash,
      orderId: result.orderId?.toString() ?? null,
      filledQuantity: order.filled,
      status: result.receipt.status,
    };
  }

  async getUserPosition(marketId: string, account: Address): Promise<DreamDexPosition> {
    const onchain = await getDreamDexExchange().client.getMarketOnchain(
      marketId as `0x${string}`,
    );
    const [yesBalance, noBalance] = await Promise.all([
      getDreamDexExchange().client.getOutcomeBalance({
        outcomeToken: onchain.outcomeToken,
        account,
        id: onchain.yesId,
      }),
      getDreamDexExchange().client.getOutcomeBalance({
        outcomeToken: onchain.outcomeToken,
        account,
        id: onchain.noId,
      }),
    ]);
    return { yesBalance: yesBalance.toString(), noBalance: noBalance.toString() };
  }

  async requestTestCollateral(walletClient: WalletClient): Promise<{ hash: string; status: string }> {
    const exchange = getDreamDexExchange();
    exchange.setSigner({ walletClient });
    const result = await exchange.trader.faucet({ amount: 10n * 10n ** 6n });
    if (result.receipt.status !== "success") {
      throw new Error(`Faucet transaction ${result.receipt.status}.`);
    }
    return { hash: result.hash, status: result.receipt.status };
  }

  clearSigner(): void {
    getDreamDexExchange().setSigner({});
  }

  private async findMarket(marketId: string, reload = false): Promise<BinaryUnifiedMarket> {
    const market = (await this.loadBinaryMarkets(reload)).find(
      (candidate) => candidate.id === marketId || candidate.info.marketId === marketId,
    );
    if (!market) throw new Error("DreamDEX Event Contract was not found.");
    return market;
  }

  private async loadBinaryMarkets(reload = false): Promise<BinaryUnifiedMarket[]> {
    return Object.values(await getDreamDexExchange().loadMarkets(reload)).filter(
      (market): market is BinaryUnifiedMarket => isBinaryMarket(market.info),
    );
  }

  private outcomeSymbol(market: BinaryUnifiedMarket, direction: DreamDexDirection): string {
    const index = direction === "UP" ? 0 : 1;
    const symbol = market.outcomes?.find((outcome) => outcome.index === index)?.symbol;
    if (!symbol) throw new Error(`${direction} outcome is unavailable.`);
    return symbol;
  }
}

export const dreamDex = new DreamDexBrowserAdapter();
