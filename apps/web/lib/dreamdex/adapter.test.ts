import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletClient } from "viem";
import { dreamDex } from "./adapter";

const mocks = vi.hoisted(() => ({ getExchange: vi.fn() }));
vi.mock("./client", () => ({ getDreamDexExchange: mocks.getExchange }));
const address = `0x${"1".repeat(40)}` as const;
const marketId = `0x${"2".repeat(64)}`;
const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
const market = {
  id: marketId, active: true, limits: { amount: { min: 0.001 } },
  outcomes: [{ index: 0, symbol: "test#YES" }, { index: 1, symbol: "test#NO" }],
  info: { marketType: "BINARY", marketId, marketAddress: address, poolAddress: address, baseDecimals: 6, quoteDecimals: 6 },
};
const exchange = {
  setSigner: vi.fn(), loadMarkets: vi.fn(), fetchOrderBook: vi.fn(),
  priceToPrecision: vi.fn((_ref, price: number) => price),
  amountToPrecision: vi.fn((_ref, amount: number) => amount),
  client: { getMarketOnchain: vi.fn() }, trader: { placeOrder: vi.fn() },
};
const input = { marketId, marketAddress: address, direction: "UP" as const, walletClient: {} as WalletClient, account: address, quantity: 0.001 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getExchange.mockReturnValue(exchange);
  exchange.loadMarkets.mockResolvedValue({ test: market });
  exchange.client.getMarketOnchain.mockResolvedValue({ status: 1, finalized: false, expiry, marketAddress: address, pool: address });
  exchange.fetchOrderBook.mockResolvedValue({ bids: [[0.4, 1]], asks: [[0.5, 1]] });
  exchange.trader.placeOrder.mockResolvedValue({ hash: `0x${"3".repeat(64)}`, receipt: { status: "success" }, fills: [{ quantityFilled: 1000n, takerOrderId: 42n }] });
});

describe("exact-window trading", () => {
  it("reads a fresh book and pins the order expiry in nanoseconds", async () => {
    const result = await dreamDex.prepareOrExecutePredictionTrade(input);
    expect(result.marketProbabilityAtEntry).toBe(0.45);
    expect(exchange.trader.placeOrder).toHaveBeenCalledWith(expect.objectContaining({ pool: address, expireTimestampNs: expiry * 1_000_000_000n, orderType: 2 }));
  });
  it("does not submit an expired or non-Trading window", async () => {
    exchange.client.getMarketOnchain.mockResolvedValue({ status: 2, finalized: false, expiry, marketAddress: address, pool: address });
    await expect(dreamDex.prepareOrExecutePredictionTrade(input)).rejects.toThrow("window has ended");
    expect(exchange.trader.placeOrder).not.toHaveBeenCalled();
  });
  it("rejects a successor contract instead of retargeting", async () => {
    await expect(dreamDex.prepareOrExecutePredictionTrade({ ...input, marketAddress: `0x${"9".repeat(40)}` })).rejects.toThrow("window has ended");
    expect(exchange.trader.placeOrder).not.toHaveBeenCalled();
  });
  it("never invents a price for an empty order book", async () => {
    exchange.fetchOrderBook.mockResolvedValue({ bids: [], asks: [] });
    await expect(dreamDex.prepareOrExecutePredictionTrade(input)).rejects.toThrow("No UP sellers");
    expect(exchange.trader.placeOrder).not.toHaveBeenCalled();
  });
});
