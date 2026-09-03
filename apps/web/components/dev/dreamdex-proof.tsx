"use client";

import {
  isBinaryMarket,
  type MarketOnchain,
  type PlaceOrderResult,
  type UnifiedMarket,
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWalletClient,
} from "wagmi";

import { getDreamDexExchange } from "@/lib/dreamdex/client";

type Book = Awaited<ReturnType<ReturnType<typeof getDreamDexExchange>["fetchOrderBook"]>>;

type TxEvidence = {
  action: "faucet" | "trade";
  hash: string;
  status: string;
  orderId?: string;
  filled?: number;
  yesBalance?: string;
  noBalance?: string;
};

const json = (value: unknown) =>
  JSON.stringify(value, (_key, item: unknown) => typeof item === "bigint" ? item.toString() : item, 2);

function marketSummary(market: UnifiedMarket) {
  if (!isBinaryMarket(market.info)) return null;
  return {
    id: market.id,
    symbol: market.symbol,
    active: market.active,
    outcomes: market.outcomes,
    marketId: market.info.marketId,
    poolAddress: market.info.poolAddress,
    asset: market.info.asset,
    intervalSec: market.info.intervalSec,
    tradingStart: market.info.tradingStart,
    expiry: market.info.expiry,
    indexedStatus: market.info.status,
    venueId: market.info.venueId,
    collateral: market.info.collateral,
    baseDecimals: market.info.baseDecimals,
    quoteDecimals: market.info.quoteDecimals,
    limits: market.limits,
    precision: market.precision,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function DreamDexProof() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const [markets, setMarkets] = useState<UnifiedMarket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [book, setBook] = useState<Book | null>(null);
  const [onchain, setOnchain] = useState<MarketOnchain | null>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"faucet" | "trade" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<TxEvidence | null>(null);

  const selected = useMemo(
    () => markets.find((market) => market.id === selectedId) ?? null,
    [markets, selectedId],
  );
  const rightChain = chainId === somniaShannon.id;

  const loadMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = Object.values(await getDreamDexExchange().loadMarkets(true))
        .filter((market) => market.active && isBinaryMarket(market.info))
        .sort((a, b) => {
          const aExpiry = isBinaryMarket(a.info) ? Number(a.info.expiry) : 0;
          const bExpiry = isBinaryMarket(b.info) ? Number(b.info.expiry) : 0;
          return bExpiry - aExpiry;
        });
      setMarkets(loaded);
      setSelectedId((current) => loaded.some((market) => market.id === current) ? current : (loaded[0]?.id ?? ""));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  const inspectMarket = useCallback(async (market: UnifiedMarket | null) => {
    setBook(null);
    setOnchain(null);
    setError(null);
    if (!market || !isBinaryMarket(market.info)) return;
    const yesSymbol = market.outcomes?.[0]?.symbol;
    if (!yesSymbol) {
      setError("The selected binary market has no UP/YES outcome symbol.");
      return;
    }
    try {
      const exchange = getDreamDexExchange();
      const [nextBook, nextOnchain] = await Promise.all([
        exchange.fetchOrderBook(yesSymbol, 5),
        exchange.client.getMarketOnchain(market.info.marketId),
      ]);
      setBook(nextBook);
      setOnchain(nextOnchain);
    } catch (inspectError) {
      setError(errorMessage(inspectError));
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadMarkets());
  }, [loadMarkets]);
  useEffect(() => {
    queueMicrotask(() => void inspectMarket(selected));
  }, [inspectMarket, selected]);
  useEffect(() => {
    const exchange = getDreamDexExchange();
    if (walletClient && rightChain) exchange.setSigner({ walletClient });
    else exchange.setSigner({});
  }, [rightChain, walletClient]);

  async function requestFaucet(): Promise<void> {
    if (!walletClient || !rightChain) return;
    setAction("faucet");
    setError(null);
    setEvidence(null);
    try {
      const exchange = getDreamDexExchange();
      exchange.setSigner({ walletClient });
      const result = await exchange.trader.faucet({ amount: 10n * 10n ** 6n });
      if (result.receipt.status !== "success") throw new Error(`Faucet transaction ${result.receipt.status}`);
      setEvidence({ action: "faucet", hash: result.hash, status: result.receipt.status });
    } catch (faucetError) {
      setError(errorMessage(faucetError));
    } finally {
      setAction(null);
    }
  }

  async function executeSmallestTrade(): Promise<void> {
    if (!walletClient || !address || !rightChain || !selected || !isBinaryMarket(selected.info)) return;
    setAction("trade");
    setError(null);
    setEvidence(null);
    try {
      const exchange = getDreamDexExchange();
      exchange.setSigner({ walletClient });

      // Refresh immediately before the write. The indexer is for discovery;
      // this on-chain status is the authoritative trade gate.
      const refreshed = Object.values(await exchange.loadMarkets(true)).find((market) => market.id === selected.id);
      if (!refreshed || !isBinaryMarket(refreshed.info) || !refreshed.active) {
        throw new Error("Market is no longer active. Refresh and choose its successor.");
      }
      const current = await exchange.client.getMarketOnchain(refreshed.info.marketId);
      if (current.status !== 1) throw new Error(`Market is not Trading (on-chain status ${current.status}).`);
      if (Number(current.expiry) <= Date.now() / 1000 + 15) throw new Error("Market is too close to expiry for a safe proof trade.");

      const yesSymbol = refreshed.outcomes?.[0]?.symbol;
      if (!yesSymbol) throw new Error("UP/YES outcome is unavailable.");
      const currentBook = await exchange.fetchOrderBook(yesSymbol, 5);
      const bestAsk = currentBook.asks[0]?.[0];
      if (bestAsk === undefined) throw new Error("No resting UP/YES ask is available; choose another market.");

      const minimum = refreshed.limits.amount?.min;
      if (minimum === undefined || minimum <= 0) throw new Error("SDK did not expose a valid venue minimum quantity.");
      const price = Math.min(0.999, bestAsk + 0.02);
      const order = await exchange.createOrder(yesSymbol, "limit", "buy", minimum, price, { timeInForce: "IOC" });
      const result = order.info as PlaceOrderResult;
      if (result.receipt.status !== "success") throw new Error(`Trade transaction ${result.receipt.status}`);

      const [yesBalance, noBalance] = await Promise.all([
        exchange.client.getOutcomeBalance({ outcomeToken: current.outcomeToken, account: address, id: current.yesId }),
        exchange.client.getOutcomeBalance({ outcomeToken: current.outcomeToken, account: address, id: current.noId }),
      ]);
      setEvidence({
        action: "trade",
        hash: result.hash,
        status: result.receipt.status,
        orderId: result.orderId?.toString(),
        filled: order.filled,
        yesBalance: yesBalance.toString(),
        noBalance: noBalance.toString(),
      });
      await inspectMarket(refreshed);
    } catch (tradeError) {
      setError(errorMessage(tradeError));
    } finally {
      setAction(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6 font-mono text-sm">
      <h1 className="text-2xl font-semibold">DreamDEX Event Contract proof</h1>
      <p className="mt-2 text-neutral-400">Development-only route. No mocked market or transaction data.</p>

      <section className="mt-6 rounded border border-neutral-800 p-4">
        <h2 className="font-semibold">1. Wallet / Shannon</h2>
        <p className="mt-2">Wallet: {address ?? "not connected"}</p>
        <p>Chain: {chainId ?? "—"} {rightChain ? "(Shannon)" : ""}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!isConnected ? (
            <button className="rounded bg-white px-3 py-2 text-black disabled:opacity-50" disabled={isConnecting || !connectors[0]} onClick={() => connectors[0] && connect({ connector: connectors[0] })}>
              {isConnecting ? "Connecting…" : "Connect injected wallet"}
            </button>
          ) : (
            <button className="rounded border border-neutral-700 px-3 py-2" onClick={() => disconnect()}>Disconnect</button>
          )}
          {isConnected && !rightChain && (
            <button className="rounded bg-amber-300 px-3 py-2 text-black disabled:opacity-50" disabled={isSwitching} onClick={() => switchChain({ chainId: somniaShannon.id })}>
              {isSwitching ? "Switching…" : "Switch to Somnia Shannon"}
            </button>
          )}
          <button className="rounded border border-neutral-700 px-3 py-2 disabled:opacity-50" disabled={!walletClient || !rightChain || action !== null} onClick={() => void requestFaucet()}>
            {action === "faucet" ? "Requesting…" : "Faucet 10 tUSDC"}
          </button>
        </div>
        {connectError && <p className="mt-3 text-red-300">{connectError.message}</p>}
      </section>

      <section className="mt-4 rounded border border-neutral-800 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">2. Real live Event Contracts</h2>
          <button className="rounded border border-neutral-700 px-3 py-2 disabled:opacity-50" disabled={loading} onClick={() => void loadMarkets()}>{loading ? "Loading…" : "Reload"}</button>
        </div>
        <label className="mt-3 block" htmlFor="market">Market</label>
        <select id="market" className="mt-2 w-full rounded border border-neutral-700 bg-black p-2" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          {markets.map((market) => <option key={market.id} value={market.id}>{market.symbol}</option>)}
        </select>
        <pre className="mt-3 overflow-auto rounded bg-neutral-950 p-3 text-xs">{selected ? json(marketSummary(selected)) : "No live market loaded."}</pre>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-neutral-800 p-4">
          <h2 className="font-semibold">3. Authoritative on-chain snapshot</h2>
          <pre className="mt-3 overflow-auto rounded bg-neutral-950 p-3 text-xs">{onchain ? json(onchain) : "Select a readable market."}</pre>
        </div>
        <div className="rounded border border-neutral-800 p-4">
          <h2 className="font-semibold">4. UP/YES book</h2>
          <pre className="mt-3 overflow-auto rounded bg-neutral-950 p-3 text-xs">{book ? json({ bids: book.bids, asks: book.asks, timestamp: book.timestamp }) : "No book loaded."}</pre>
        </div>
      </section>

      <section className="mt-4 rounded border border-neutral-800 p-4">
        <h2 className="font-semibold">5. Genuine smallest valid IOC trade</h2>
        <p className="mt-2 text-neutral-400">Buys the selected market’s minimum lot at the current UP ask plus a 2% protective limit. The SDK may first request collateral approval.</p>
        <button className="mt-3 rounded bg-emerald-300 px-3 py-2 text-black disabled:opacity-50" disabled={!walletClient || !rightChain || !selected || !book?.asks[0] || action !== null} onClick={() => void executeSmallestTrade()}>
          {action === "trade" ? "Waiting for wallet / confirmation…" : "Execute smallest valid testnet trade"}
        </button>
        {error && <p className="mt-3 whitespace-pre-wrap text-red-300">{error}</p>}
        {evidence && (
          <div className="mt-4">
            <pre className="overflow-auto rounded bg-neutral-950 p-3 text-xs">{json(evidence)}</pre>
            <a className="mt-2 inline-block underline" href={`${somniaShannon.blockExplorers.default.url}/tx/${evidence.hash}`} rel="noreferrer" target="_blank">Open real transaction in Shannon explorer</a>
          </div>
        )}
      </section>
    </main>
  );
}
