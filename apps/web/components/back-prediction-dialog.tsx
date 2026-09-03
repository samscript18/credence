"use client";

import type { BackedPredictionRecord, DreamDexMarketQuote, VisiblePrediction } from "@credence/shared";
import { CheckCircle2, ExternalLink, LoaderCircle, Repeat2, X } from "lucide-react";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";

import { marketKeys } from "@/hooks/use-markets";
import { useAuth } from "@/hooks/use-auth";
import { dreamDex } from "@/lib/dreamdex/adapter";
import { apiErrorMessage } from "@/services/api";
import { backsService } from "@/services/backs.service";
import { marketsService } from "@/services/markets.service";
import { Button } from "./ui/button";

type Stage = "REFRESHING" | "IDLE" | "PREPARING" | "WALLET" | "SUBMITTED" | "RECORDING" | "SUCCESS";

const labels: Record<Exclude<Stage, "IDLE" | "SUCCESS">, string> = {
  REFRESHING: "Refreshing market",
  PREPARING: "Preparing trade",
  WALLET: "Waiting for wallet",
  SUBMITTED: "Transaction submitted",
  RECORDING: "Verifying DreamDEX fill",
};

export function BackPredictionDialog({ prediction, onClose }: { prediction: VisiblePrediction; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>("REFRESHING");
  const [market, setMarket] = useState<DreamDexMarketQuote | null>(null);
  const [stake, setStake] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<BackedPredictionRecord | null>(null);
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const busy = stage !== "IDLE" && stage !== "SUCCESS";
  const currentProbability = market?.probabilities
    ? prediction.direction === "UP" ? market.probabilities.yes : market.probabilities.no
    : null;

  useEffect(() => {
    let active = true;
    void marketsService.get(prediction.marketId).then((fresh) => {
      if (!active) return;
      setMarket(fresh);
      setStake(String(fresh.minimumQuantity ?? ""));
      setStage("IDLE");
    }).catch((caught) => {
      if (!active) return;
      setError(apiErrorMessage(caught));
      setStage("IDLE");
    });
    return () => { active = false; };
  }, [prediction.marketId]);

  async function back(): Promise<void> {
    setError(null);
    setRecord(null);
    setPendingHash(null);
    try {
      if (!address || !walletClient) throw new Error("Connect your wallet first.");
      if (!auth.data || auth.data.walletAddress !== address.toLowerCase()) throw new Error("Sign in with your wallet first.");
      if (chainId !== somniaShannon.id) throw new Error("Switch to Somnia Shannon before trading.");
      if (!/^\d+(?:\.\d+)?$/.test(stake) || Number(stake) <= 0) throw new Error("Enter a valid positive stake.");

      setStage("REFRESHING");
      const fresh = await marketsService.get(prediction.marketId);
      setMarket(fresh);
      if (!fresh.tradable || new Date(fresh.expiryAt).getTime() <= Date.now()) throw new Error("This market is no longer tradable.");
      if (!fresh.probabilities) throw new Error("This market has no current executable probability.");
      if (fresh.minimumQuantity !== null && Number(stake) < fresh.minimumQuantity) throw new Error(`Minimum stake is ${fresh.minimumQuantity} ${fresh.collateralSymbol}.`);

      setStage("PREPARING");
      await Promise.resolve();
      setStage("WALLET");
      const trade = await dreamDex.prepareOrExecutePredictionTrade({
        marketId: prediction.marketId,
        direction: prediction.direction,
        walletClient,
        account: address,
        quantity: Number(stake),
      });
      setPendingHash(trade.transactionHash);
      setStage("SUBMITTED");
      setStage("RECORDING");
      const confirmed = await backsService.create(prediction.id, trade.transactionHash);
      setRecord(confirmed);
      setPendingHash(null);
      await queryClient.invalidateQueries({ queryKey: marketKeys.all });
      setStage("SUCCESS");
    } catch (caught) {
      setError(apiErrorMessage(caught));
      setStage("IDLE");
    }
  }

  async function retryVerification(): Promise<void> {
    if (!pendingHash) return;
    setError(null);
    try {
      setStage("RECORDING");
      const confirmed = await backsService.create(prediction.id, pendingHash);
      setRecord(confirmed);
      setPendingHash(null);
      setStage("SUCCESS");
    } catch (caught) {
      setError(apiErrorMessage(caught));
      setStage("IDLE");
    }
  }

  async function recoverLatest(): Promise<void> {
    setError(null);
    try {
      if (!address || !auth.data || auth.data.walletAddress !== address.toLowerCase()) throw new Error("Connect and sign in with the wallet that placed the trade.");
      setStage("RECORDING");
      const confirmed = await backsService.recoverLatest(prediction.id);
      setRecord(confirmed);
      setPendingHash(null);
      setStage("SUCCESS");
    } catch (caught) {
      setError(apiErrorMessage(caught));
      setStage("IDLE");
    }
  }

  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="back-title"><div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#11130f] p-6 sm:rounded-3xl"><div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-lime-300"><Repeat2 className="size-3.5" /> Back prediction</p><h2 id="back-title" className="mt-2 text-xl font-bold">{prediction.marketTitle}</h2></div><Button variant="ghost" className="size-9 shrink-0 p-0" onClick={onClose} disabled={busy}><X className="size-4" /></Button></div>{stage === "SUCCESS" && record ? <div className="py-9 text-center"><CheckCircle2 className="mx-auto size-11 text-lime-300" /><h3 className="mt-4 text-lg font-bold">Position opened</h3><p className="mt-2 text-sm text-neutral-500">Your filled DreamDEX trade is linked to this prediction.</p><div className="mt-5 rounded-xl border border-white/8 bg-black/20 p-4 text-left text-xs"><div className="flex justify-between"><span className="text-neutral-500">Direction</span><b>{record.direction}</b></div><div className="mt-2 flex justify-between"><span className="text-neutral-500">Filled quantity</span><b>{record.stakeAmount}</b></div><div className="mt-2 flex justify-between"><span className="text-neutral-500">Execution probability</span><b>{Math.round(record.marketProbabilityAtExecution * 1000) / 10}%</b></div></div><a className="mt-4 inline-flex max-w-full items-center gap-2 font-mono text-xs text-lime-300 underline" href={`${somniaShannon.blockExplorers.default.url}/tx/${record.transactionHash}`} rel="noreferrer" target="_blank"><span className="truncate">{record.transactionHash}</span><ExternalLink className="size-3 shrink-0" /></a><Button className="mt-6 w-full" onClick={onClose}>Done</Button></div> : <div className="mt-6"><div className="rounded-xl border border-white/8 bg-black/20 p-4"><p className="text-xs text-neutral-500">Original predictor chose</p><p className={`mt-1 text-2xl font-black ${prediction.direction === "UP" ? "text-lime-300" : "text-orange-300"}`}>{prediction.direction}</p><div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-4 text-xs"><div><span className="text-neutral-500">Creator entry</span><p className="mt-1 font-semibold">{Math.round(prediction.marketProbabilityAtEntry * 1000) / 10}%</p></div><div><span className="text-neutral-500">Current DreamDEX</span><p className="mt-1 font-semibold">{currentProbability === null ? "—" : `${Math.round(currentProbability * 1000) / 10}%`}</p></div></div></div><label className="mt-5 block text-xs font-semibold text-neutral-400">Your quantity ({market?.collateralSymbol ?? prediction.collateralSymbol ?? "tokens"})<input className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-lime-300/50" inputMode="decimal" value={stake} onChange={(event) => setStake(event.target.value)} /></label>{pendingHash ? <div className="mt-4 rounded-xl border border-orange-300/20 bg-orange-300/5 p-3 text-xs text-orange-200"><p>Your transaction was submitted. Retry verification without placing another trade.</p><a className="mt-2 inline-flex max-w-full items-center gap-1 font-mono underline" href={`${somniaShannon.blockExplorers.default.url}/tx/${pendingHash}`} rel="noreferrer" target="_blank"><span className="truncate">{pendingHash}</span><ExternalLink className="size-3 shrink-0" /></a></div> : null}{error ? <p className="mt-4 rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-sm text-red-300">{error}</p> : null}{busy ? <p className="mt-5 flex items-center justify-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin text-lime-300" />{labels[stage as Exclude<Stage, "IDLE" | "SUCCESS">]}</p> : null}{pendingHash ? <Button className="mt-5 w-full" onClick={() => void retryVerification()} disabled={busy}>Retry verification</Button> : address && chainId !== somniaShannon.id ? <Button className="mt-5 w-full" onClick={() => switchChain({ chainId: somniaShannon.id })}>Switch to Somnia Shannon</Button> : <><Button className="mt-5 w-full" onClick={() => void back()} disabled={busy || !market}>Confirm trade</Button><Button className="mt-2 w-full" variant="ghost" onClick={() => void recoverLatest()} disabled={busy || !auth.data}>Recover latest filled trade</Button></>}</div>}</div></div>;
}
