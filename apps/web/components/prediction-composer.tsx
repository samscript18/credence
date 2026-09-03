"use client";

import type { DreamDexDirection, DreamDexMarketQuote } from "@credence/shared";
import { CheckCircle2, ExternalLink, LoaderCircle, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { marketKeys } from "@/hooks/use-markets";
import { myPredictionsKey } from "@/hooks/use-predictions";
import { dreamDex } from "@/lib/dreamdex/adapter";
import { apiErrorMessage } from "@/services/api";
import { predictionsService } from "@/services/predictions.service";

type Stage = "IDLE" | "VALIDATING" | "PREPARING_TRADE" | "AWAITING_WALLET" | "CONFIRMING" | "RECORDING_PREDICTION" | "SUCCESS";

const stageLabel: Record<Exclude<Stage, "IDLE" | "SUCCESS">, string> = {
  VALIDATING: "Checking market",
  PREPARING_TRADE: "Preparing transaction",
  AWAITING_WALLET: "Waiting for wallet",
  CONFIRMING: "Confirming on Somnia",
  RECORDING_PREDICTION: "Linking prediction record",
};

export function PredictionComposer({ market, onClose }: { market: DreamDexMarketQuote; onClose: () => void }) {
  const [direction, setDirection] = useState<DreamDexDirection>("UP");
  const [confidence, setConfidence] = useState(65);
  const [stake, setStake] = useState(String(market.minimumQuantity ?? ""));
  const [reasoning, setReasoning] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "LOCKED">("PUBLIC");
  const [stage, setStage] = useState<Stage>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const auth = useAuth();
  const creatorProfile = useProfile(auth.data?.walletAddress ?? "");
  const queryClient = useQueryClient();
  const busy = stage !== "IDLE" && stage !== "SUCCESS";
  const probability = direction === "UP" ? market.probabilities?.yes : market.probabilities?.no;

  async function publish(): Promise<void> {
    setError(null);
    setTransactionHash(null);
    setPredictionId(null);
    try {
      setStage("VALIDATING");
      if (!address || !walletClient) throw new Error("Connect your wallet first.");
      if (!auth.data || auth.data.walletAddress !== address.toLowerCase()) throw new Error("Sign in with your wallet first.");
      if (chainId !== somniaShannon.id) throw new Error("Switch to Somnia Shannon before trading.");
      if (probability === undefined || probability === null) throw new Error("This market has no executable probability quote.");
      if (!/^\d+(?:\.\d+)?$/.test(stake) || Number(stake) <= 0) throw new Error("Enter a valid positive stake.");
      if (market.minimumQuantity !== null && Number(stake) < market.minimumQuantity) throw new Error(`Minimum stake is ${market.minimumQuantity} ${market.collateralSymbol}.`);

      setStage("PREPARING_TRADE");
      await Promise.resolve();
      setStage("AWAITING_WALLET");
      const trade = await dreamDex.prepareOrExecutePredictionTrade({
        marketId: market.marketId,
        direction,
        walletClient,
        account: address,
        quantity: Number(stake),
      });
      setTransactionHash(trade.transactionHash);
      setStage("CONFIRMING");
      setStage("RECORDING_PREDICTION");
      const prediction = await predictionsService.create({
        marketId: market.marketId,
        direction,
        confidence,
        stakeAmount: stake,
        ...(reasoning.trim() ? { reasoning: reasoning.trim() } : {}),
        visibility,
        marketProbabilityAtEntry: probability,
        transactionHash: trade.transactionHash,
      });
      setPredictionId(prediction.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myPredictionsKey }),
        queryClient.invalidateQueries({ queryKey: marketKeys.all }),
      ]);
      setStage("SUCCESS");
    } catch (caught) {
      setError(apiErrorMessage(caught));
      setStage("IDLE");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="composer-title">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#11130f] p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-lime-300">Publish & Trade</p><h2 id="composer-title" className="mt-2 text-xl font-bold">{market.title}</h2></div><Button variant="ghost" className="size-9 p-0" onClick={onClose} disabled={busy} aria-label="Close composer"><X className="size-4" /></Button></div>

        {stage === "SUCCESS" ? (
          <div className="py-10 text-center"><CheckCircle2 className="mx-auto size-12 text-lime-300" /><h3 className="mt-4 text-xl font-bold">Prediction published</h3><p className="mt-2 text-sm text-neutral-500">Your confirmed DreamDEX trade and Credence record are linked.</p>{predictionId ? <p className="mx-auto mt-4 max-w-full truncate rounded-lg bg-black/20 px-3 py-2 font-mono text-xs text-neutral-400">Record {predictionId}</p> : null}{transactionHash ? <a className="mt-5 inline-flex items-center text-sm text-lime-300 underline" href={`${somniaShannon.blockExplorers.default.url}/tx/${transactionHash}`} target="_blank" rel="noreferrer">View transaction <ExternalLink className="ml-1.5 size-4" /></a> : null}<div className="mt-7"><Button onClick={onClose}>Done</Button></div></div>
        ) : (
          <div className="mt-6 space-y-5">
            <fieldset><legend className="text-xs font-semibold text-neutral-400">Direction</legend><div className="mt-2 grid grid-cols-2 gap-2">{(["UP", "DOWN"] as const).map((value) => <button key={value} type="button" onClick={() => setDirection(value)} className={`rounded-xl border p-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 ${direction === value ? "border-lime-300/40 bg-lime-300/10 text-lime-300" : "border-white/9 bg-white/[.025] text-neutral-400"}`}>{value}<span className="ml-2 font-normal">{market.probabilities ? `${Math.round((value === "UP" ? market.probabilities.yes : market.probabilities.no) * 100)}%` : "—"}</span></button>)}</div></fieldset>
            <label className="block text-xs font-semibold text-neutral-400">Confidence <span className="float-right text-lime-300">{confidence}%</span><input className="mt-3 w-full accent-lime-300" type="range" min="50" max="99" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></label>
            <label className="block text-xs font-semibold text-neutral-400">Stake ({market.collateralSymbol})<input className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-lime-300/50" inputMode="decimal" value={stake} onChange={(event) => setStake(event.target.value)} /></label>
            <label className="block text-xs font-semibold text-neutral-400">Reasoning <span className="text-neutral-600">— optional</span><textarea className="mt-2 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-lime-300/50" maxLength={2000} value={reasoning} onChange={(event) => setReasoning(event.target.value)} placeholder="What does the market appear to be missing?" /></label>
            <fieldset><legend className="text-xs font-semibold text-neutral-400">Visibility</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => setVisibility("PUBLIC")} className={`rounded-xl border p-3 text-sm ${visibility === "PUBLIC" ? "border-lime-300/40 bg-lime-300/10 text-lime-300" : "border-white/9 text-neutral-400"}`}>Public</button><button type="button" disabled={!creatorProfile.data?.verified} onClick={() => setVisibility("LOCKED")} className={`rounded-xl border p-3 text-sm disabled:cursor-not-allowed disabled:opacity-35 ${visibility === "LOCKED" ? "border-lime-300/40 bg-lime-300/10 text-lime-300" : "border-white/9 text-neutral-400"}`}>Locked</button></div>{!creatorProfile.data?.verified ? <p className="mt-2 text-[11px] text-neutral-600">Locked insights require reputation 80+ and 25 resolved predictions.</p> : null}</fieldset>
            <div className="rounded-xl border border-white/8 bg-white/[.025] p-3 text-xs"><div className="flex justify-between"><span className="text-neutral-500">Probability snapshot</span><span>{probability == null ? "Unavailable" : `${Math.round(probability * 1000) / 10}% ${direction}`}</span></div></div>
            {error ? <p className="rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-sm text-red-300">{error}</p> : null}
            {busy ? <div className="flex items-center justify-center gap-2 py-2 text-sm text-neutral-300"><LoaderCircle className="size-4 animate-spin text-lime-300" />{stageLabel[stage as Exclude<Stage, "IDLE" | "SUCCESS">]}</div> : null}
            {chainId !== somniaShannon.id && address ? <Button className="w-full" onClick={() => switchChain({ chainId: somniaShannon.id })}>Switch to Somnia Shannon</Button> : <Button className="w-full" onClick={() => void publish()} disabled={busy}>Publish & Trade</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
