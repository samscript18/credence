"use client";

import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { useRef, useState } from "react";
import { useAccount, useConnect, useSwitchChain, useWalletClient } from "wagmi";
import { dreamDex } from "@/lib/dreamdex/adapter";

export function DreamDexFaucet() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, error: connectError, isPending: connecting } = useConnect();
  const { switchChain, error: switchError, isPending: switching } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ hash: string; wallet: string } | null>(null);
  const inFlight = useRef(false);
  const rightChain = chainId === somniaShannon.id;
  const buttonClass = "w-full rounded-full bg-signal px-5 py-3 text-sm font-semibold text-[#04131f] disabled:opacity-50";

  async function requestFaucet() {
    if (inFlight.current || !walletClient || !address || !rightChain) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    setReceipt(null);
    try {
      const result = await dreamDex.requestTestCollateral(walletClient);
      setReceipt({ hash: result.hash, wallet: address });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to request test tokens. Please try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Shannon testnet</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">Get test tokens</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">Request 10 tUSDC to try predictions and insights on Credence. These are free test tokens, not real USDC.</p>
      <div className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div>
          <h2 className="text-lg font-medium">10 tUSDC</h2>
          <p className="mt-1 text-sm text-muted">You need a little STT in your wallet to pay the network gas fee.</p>
        </div>
        {address && <p className="break-all font-mono text-xs text-muted">Connected wallet: {address}</p>}
        {!isConnected ? (
          <div className="space-y-2">
            {connectors.map(connector => <button key={connector.uid} type="button" className={buttonClass} disabled={connecting} onClick={() => connect({ connector })}>
              {connecting ? "Connecting…" : `Connect ${connector.name}`}
            </button>)}
            {!connectors.length && <p className="text-sm text-muted">Open this page in a wallet-enabled browser to connect.</p>}
          </div>
        ) : !rightChain ? (
          <button type="button" className={buttonClass} disabled={switching || pending} onClick={() => switchChain({ chainId: somniaShannon.id })}>
            {switching ? "Switching…" : "Switch to Somnia Shannon"}
          </button>
        ) : (
          <button type="button" className={buttonClass} disabled={pending || !walletClient} onClick={() => void requestFaucet()}>
            {pending ? "Waiting for wallet / confirmation…" : "Faucet 10 tUSDC"}
          </button>
        )}
        {(error || connectError || switchError) && <p role="alert" className="break-words text-sm text-rose-300">{error ?? connectError?.message ?? switchError?.message}</p>}
        {receipt && <div role="status" className="rounded-xl border border-signal/20 bg-signal/5 p-4 text-sm">
          <p>10 tUSDC received.</p>
          <p className="mt-1 break-all font-mono text-xs text-muted">Wallet: {receipt.wallet}</p>
          <a className="mt-2 inline-block text-signal underline" href={`${somniaShannon.blockExplorers.default.url}/tx/${receipt.hash}`} target="_blank" rel="noreferrer">View transaction</a>
        </div>}
      </div>
    </section>
  );
}
