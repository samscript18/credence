import type { DreamDexMarketQuote } from "@credence/shared";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import { DreamDexService } from "../dreamdex/dreamdex.service.js";

// SDK cold discovery includes chain metadata reads; measured ~16s on Shannon.
const MARKET_LIST_TIMEOUT_MS = 25_000;
const MARKET_QUOTE_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("DreamDEX request timed out")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

@Injectable()
export class MarketsService {
  private cache?: { expiresAt: number; markets: DreamDexMarketQuote[] };

  constructor(private readonly dreamDex: DreamDexService) {}

  async list(): Promise<DreamDexMarketQuote[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.markets;

    try {
      const markets = await withTimeout(
        this.dreamDex.listEventMarkets(),
        MARKET_LIST_TIMEOUT_MS,
      );
      const quotes = await Promise.all(
        markets.map(async (market): Promise<DreamDexMarketQuote> => {
          try {
            return {
              ...market,
              probabilities: await withTimeout(
                this.dreamDex.getMarketProbabilities(market.marketId),
                MARKET_QUOTE_TIMEOUT_MS,
              ),
            };
          } catch {
            // An empty or temporarily slow CLOB is valid. Never invent a quote.
            return { ...market, probabilities: null };
          }
        }),
      );

      this.cache = { expiresAt: Date.now() + 10_000, markets: quotes };
      return quotes;
    } catch (error) {
      // A stale authoritative snapshot is safer than hanging the product UI.
      if (this.cache) return this.cache.markets;
      throw new ServiceUnavailableException({
        message: "DreamDEX markets are temporarily unavailable",
        code: "DREAMDEX_UNAVAILABLE",
        cause: error,
      });
    }
  }

  async get(marketId: string): Promise<DreamDexMarketQuote> {
    const market = await this.dreamDex.getEventMarket(marketId);
    try {
      return {
        ...market,
        probabilities: await withTimeout(
          this.dreamDex.getMarketProbabilities(market.marketId),
          MARKET_QUOTE_TIMEOUT_MS,
        ),
      };
    } catch {
      return { ...market, probabilities: null };
    }
  }
}
