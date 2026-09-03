import type { DreamDexMarket, DreamDexProbabilities } from "@credence/shared";
import { describe, expect, it, vi } from "vitest";

import type { DreamDexService } from "../dreamdex/dreamdex.service.js";
import { MarketsService } from "./markets.service.js";

const market = {
  marketId: `0x${"1".repeat(64)}`,
  symbol: "BTC-EVENT/tUSDC",
} as DreamDexMarket;

describe("MarketsService", () => {
  it("uses live probabilities where available and never fabricates an empty book", async () => {
    const probabilities = { marketId: market.marketId, yes: 0.6, no: 0.4 } as DreamDexProbabilities;
    const dreamDex = {
      listEventMarkets: vi.fn(() => Promise.resolve([market, { ...market, marketId: `0x${"2".repeat(64)}` }])),
      getMarketProbabilities: vi
        .fn()
        .mockResolvedValueOnce(probabilities)
        .mockRejectedValueOnce(new Error("empty book")),
    };
    const service = new MarketsService(dreamDex as unknown as DreamDexService);

    const result = await service.list();

    expect(result[0]?.probabilities).toBe(probabilities);
    expect(result[1]?.probabilities).toBeNull();
  });

  it("briefly caches a normalized list to avoid wasteful polling", async () => {
    const dreamDex = {
      listEventMarkets: vi.fn(() => Promise.resolve([market])),
      getMarketProbabilities: vi.fn(() => Promise.resolve(null)),
    };
    const service = new MarketsService(dreamDex as unknown as DreamDexService);

    await service.list();
    await service.list();

    expect(dreamDex.listEventMarkets).toHaveBeenCalledOnce();
  });
});
