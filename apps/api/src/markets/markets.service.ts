import type { DreamDexMarketQuote } from "@credence/shared";
import { Injectable } from "@nestjs/common";

import { DreamDexService } from "../dreamdex/dreamdex.service.js";

@Injectable()
export class MarketsService {
  private cache?: { expiresAt: number; markets: DreamDexMarketQuote[] };

  constructor(private readonly dreamDex: DreamDexService) {}

  async list(): Promise<DreamDexMarketQuote[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.markets;

    const markets = await this.dreamDex.listEventMarkets();
    const quotes = await Promise.all(
      markets.map(async (market): Promise<DreamDexMarketQuote> => {
        try {
          return {
            ...market,
            probabilities: await this.dreamDex.getMarketProbabilities(market.marketId),
          };
        } catch {
          // An empty CLOB is a valid live-market state. Never invent a quote.
          return { ...market, probabilities: null };
        }
      }),
    );

    this.cache = { expiresAt: Date.now() + 10_000, markets: quotes };
    return quotes;
  }

  async get(marketId: string): Promise<DreamDexMarketQuote> {
    const market = await this.dreamDex.getEventMarket(marketId);
    try {
      return {
        ...market,
        probabilities: await this.dreamDex.getMarketProbabilities(market.marketId),
      };
    } catch {
      return { ...market, probabilities: null };
    }
  }
}
