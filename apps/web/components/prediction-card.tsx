"use client";

import type { PredictionFeedItem } from "@credence/shared";
import { CircleCheck, CircleX, ExternalLink, LockKeyhole, Repeat2 } from "lucide-react";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";

import { BackPredictionDialog } from "./back-prediction-dialog";
import { MarketCountdown } from "./market-countdown";
import { PredictorAvatar } from "./predictor-avatar";
import { ReputationBadge, VerifiedBadge } from "./reputation-badge";
import { StatusChip } from "./status-chip";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { UnlockDialog } from "./unlock-dialog";

function displayAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function PredictionCard({ prediction }: { prediction: PredictionFeedItem }) {
  const [showUnlock, setShowUnlock] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const { address } = useAccount();
  const name = prediction.predictor.displayName ?? displayAddress(prediction.predictorAddress);

  return (
    <Card className="overflow-hidden p-5 transition-colors hover:border-white/14">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/profile/${prediction.predictorAddress}`} className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">
          <PredictorAvatar address={prediction.predictorAddress} name={prediction.predictor.displayName} />
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><div className="mt-1 flex flex-wrap gap-1.5"><ReputationBadge score={prediction.predictor.reputationScore} />{prediction.predictor.verified ? <VerifiedBadge /> : null}</div></div>
        </Link>
        <StatusChip status={prediction.status} />
      </div>

      <div className="mt-5 border-t border-white/7 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><p className="max-w-[75%] text-sm font-medium text-neutral-300">{prediction.marketTitle}</p><span className="rounded-full bg-white/[.04] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-600">{prediction.source === "LIVE" ? "On-chain" : "Demo history"}</span></div>
        {prediction.locked ? (
          <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><LockKeyhole className="size-4 text-lime-300" /> Structured insight locked</div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-neutral-600"><span>Direction<br /><b className="text-neutral-500">Locked</b></span><span>Confidence<br /><b className="text-neutral-500">Locked</b></span><span>Reasoning<br /><b className="text-neutral-500">Locked</b></span></div><Button className="mt-4 min-h-11 w-full" onClick={() => setShowUnlock(true)}>Unlock — 1 tUSDC</Button></div>
        ) : (
          <div className="mt-4 animate-reveal">
            <div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Prediction</p><p className={`mt-1 text-2xl font-black ${prediction.direction === "UP" ? "text-lime-300" : "text-orange-300"}`}>{prediction.direction}</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-wider text-neutral-600">Confidence</p><p className="mt-1 text-xl font-semibold tabular-nums">{prediction.confidence}%</p></div></div>
            {prediction.reasoning ? <p className="mt-4 text-sm leading-6 text-neutral-400">{prediction.reasoning}</p> : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600"><span>Market at entry <b className="text-neutral-400">{Math.round(prediction.marketProbabilityAtEntry * 1000) / 10}%</b></span>{prediction.status === "ACTIVE" ? <MarketCountdown expiryAt={prediction.marketExpiryAt} /> : null}</div>
            {prediction.status === "RESOLVED" ? <div className={`mt-4 flex items-center gap-3 rounded-xl border p-3 ${prediction.isCorrect ? "border-lime-300/15 bg-lime-300/[.045]" : "border-orange-300/15 bg-orange-300/[.04]"}`}>{prediction.isCorrect ? <CircleCheck className="size-5 text-lime-300" /> : <CircleX className="size-5 text-orange-300" />}<div><p className="text-xs font-bold">{prediction.isCorrect ? "Correct prediction" : "Incorrect prediction"}</p><p className="mt-0.5 text-[11px] text-neutral-500">Final outcome: {prediction.finalOutcome}</p></div></div> : null}
            {prediction.transactionHash ? <a className="mt-4 inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-lime-300" href={`${somniaShannon.blockExplorers.default.url}/tx/${prediction.transactionHash}`} target="_blank" rel="noreferrer">View verified transaction <ExternalLink className="size-3" /></a> : null}
            {prediction.status === "ACTIVE" && address?.toLowerCase() !== prediction.predictorAddress ? <Button className="mt-4 min-h-11 w-full" variant="secondary" onClick={() => setShowBack(true)}><Repeat2 className="mr-2 size-4" />Back Prediction</Button> : null}
          </div>
        )}
      </div>
      {prediction.locked && showUnlock ? <UnlockDialog prediction={prediction} onClose={() => setShowUnlock(false)} /> : null}
      {!prediction.locked && showBack ? <BackPredictionDialog prediction={prediction} onClose={() => setShowBack(false)} /> : null}
    </Card>
  );
}
