import type { MarketOnchain, UnifiedMarket, UnifiedOrderBook } from "@somnia-chain/markets-sdk";
import { describe, expect, it } from "vitest";

import {
  toDreamDexMarket,
  toDreamDexProbabilities,
  toDreamDexSettlement,
} from "./dreamdex.mapper.js";

describe("DreamDEX domain mapping", () => {
  it("normalizes only verified Event Contract fields", () => {
    const market = {
      id: "0xmarket",
      symbol: "BTC-EVENT/tUSDC",
      quote: "tUSDC",
      active: true,
      outcomes: [
        { symbol: "BTC-EVENT/tUSDC#YES", label: "YES", index: 0 },
        { symbol: "BTC-EVENT/tUSDC#NO", label: "NO", index: 1 },
      ],
      limits: { amount: { min: 0.001 } },
      info: {
        marketType: "BINARY",
        marketId: "0xmarket",
        question: "Will BTC close up?",
        asset: "BTC",
        venueId: "venue-1",
        poolAddress: "0xpool",
        marketAddress: "0xcontract",
        collateral: "0xcollateral",
        baseDecimals: 6,
        quoteDecimals: 6,
        tradingStart: "100",
        expiry: "200",
        status: "Trading",
      },
    } as unknown as UnifiedMarket;

    expect(toDreamDexMarket(market)).toMatchObject({
      marketId: "0xmarket",
      title: "Will BTC close up?",
      underlying: "BTC",
      tradable: true,
      minimumQuantity: 0.001,
      baseDecimals: 6,
      yesSymbol: "BTC-EVENT/tUSDC#YES",
      noSymbol: "BTC-EVENT/tUSDC#NO",
    });
  });

  it("derives complementary probabilities from the current YES book", () => {
    const book = {
      symbol: "BTC-EVENT/tUSDC#YES",
      bids: [[0.4, 1]],
      asks: [[0.44, 1]],
      timestamp: 1_000,
    } as UnifiedOrderBook;

    expect(toDreamDexProbabilities("0xmarket", book)).toEqual({
      marketId: "0xmarket",
      yes: 0.42000000000000004,
      no: 0.58,
      bestYesBid: 0.4,
      bestYesAsk: 0.44,
      observedAt: "1970-01-01T00:00:01.000Z",
    });
  });

  it("uses authoritative on-chain flags for resolution and voids", () => {
    const resolved = {
      status: 4,
      finalized: true,
      isResolved: true,
      isVoided: false,
      winningOutcome: 1,
      expiry: 200n,
    } as MarketOnchain;
    const voided = { ...resolved, status: 5, isResolved: false, isVoided: true };

    expect(toDreamDexSettlement("0xmarket", resolved).finalOutcome).toBe("DOWN");
    expect(toDreamDexSettlement("0xmarket", voided).finalOutcome).toBe("VOID");
  });
});
