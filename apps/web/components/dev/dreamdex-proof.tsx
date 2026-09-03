"use client";

import type { DreamDexMarket } from "@credence/shared";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWalletClient,
} from "wagmi";

import { dreamDex, type DreamDexMarketInspection } from "@/lib/dreamdex/adapter";

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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function DreamDexProof() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const [markets, setMarkets] = useState<DreamDexMarket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [inspection, setInspection] = useState<DreamDexMarketInspection | null>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"faucet" | "trade" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<TxEvidence | null>(null);

  const selected = useMemo(
    () => markets.find((market) => market.marketId === selectedId) ?? null,
    [markets, selectedId],
  );
  const rightChain = chainId === somniaShannon.id;

  const loadMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await dreamDex.listEventMarkets();
      setMarkets(loaded);
      setSelectedId((current) => loaded.some((market) => market.marketId === current) ? current : (loaded[0]?.marketId ?? ""));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  const inspectMarket = useCallback(async (market: DreamDexMarket | null) => {
    setInspection(null);
    setError(null);
    if (!market) return;
    try {
      setInspection(await dreamDex.inspectEventMarket(market.marketId));
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
    if (!walletClient || !rightChain) dreamDex.clearSigner();
  }, [rightChain, walletClient]);

  async function requestFaucet(): Promise<void> {
    if (!walletClient || !rightChain) return;
    setAction("faucet");
    setError(null);
    setEvidence(null);
    try {
      const result = await dreamDex.requestTestCollateral(walletClient);
      setEvidence({ action: "faucet", hash: result.hash, status: result.status });
    } catch (faucetError) {
      setError(errorMessage(faucetError));
    } finally {
      setAction(null);
    }
  }

  async function executeSmallestTrade(): Promise<void> {
    if (!walletClient || !address || !rightChain || !selected) return;
    setAction("trade");
    setError(null);
    setEvidence(null);
    try {
      const result = await dreamDex.prepareOrExecutePredictionTrade({
        marketId: selected.marketId,
        direction: "UP",
        walletClient,
        account: address,
      });
      const { yesBalance, noBalance } = await dreamDex.getUserPosition(selected.marketId, address);
      setEvidence({
        action: "trade",
        hash: result.transactionHash,
        status: result.status,
        orderId: result.orderId ?? undefined,
        filled: result.filledQuantity,
        yesBalance,
        noBalance,
      });
      await inspectMarket(selected);
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
          {markets.map((market) => <option key={market.marketId} value={market.marketId}>{market.symbol}</option>)}
        </select>
        <pre className="mt-3 overflow-auto rounded bg-neutral-950 p-3 text-xs">{selected ? json(selected) : "No live market loaded."}</pre>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-neutral-800 p-4">
          <h2 className="font-semibold">3. Authoritative on-chain snapshot</h2>
          <pre className="mt-3 overflow-auto rounded bg-neutral-950 p-3 text-xs">{inspection ? json(inspection.onchain) : "Select a readable market."}</pre>
        </div>
        <div className="rounded border border-neutral-800 p-4">
          <h2 className="font-semibold">4. UP/YES book</h2>
          <pre className="mt-3 overflow-auto rounded bg-neutral-950 p-3 text-xs">{inspection ? json({ bids: inspection.orderBook.bids, asks: inspection.orderBook.asks, timestamp: inspection.orderBook.timestamp }) : "No book loaded."}</pre>
        </div>
      </section>

      <section className="mt-4 rounded border border-neutral-800 p-4">
        <h2 className="font-semibold">5. Genuine smallest valid IOC trade</h2>
        <p className="mt-2 text-neutral-400">Buys the selected market’s minimum lot at the current UP ask plus a 2% protective limit. The SDK may first request collateral approval.</p>
        <button className="mt-3 rounded bg-emerald-300 px-3 py-2 text-black disabled:opacity-50" disabled={!walletClient || !rightChain || !selected || !inspection?.orderBook.asks[0] || action !== null} onClick={() => void executeSmallestTrade()}>
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
