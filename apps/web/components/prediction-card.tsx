import type { PredictionFeedItem } from "@credence/shared";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Card } from "./ui/card";
import { PredictorAvatar } from "./predictor-avatar";
import { ReputationBadge, VerifiedBadge } from "./reputation-badge";

function displayAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function PredictionCard({ prediction }: { prediction: PredictionFeedItem }) {
  const name = prediction.predictor.displayName ?? displayAddress(prediction.predictorAddress);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/profile/${prediction.predictorAddress}`} className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">
          <PredictorAvatar address={prediction.predictorAddress} name={prediction.predictor.displayName} />
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><div className="mt-1 flex flex-wrap gap-1.5"><ReputationBadge score={prediction.predictor.reputationScore} />{prediction.predictor.verified ? <VerifiedBadge /> : null}</div></div>
        </Link>
        <span className="text-[10px] uppercase tracking-wider text-neutral-600">{prediction.status}</span>
      </div>
      <div className="mt-5 border-t border-white/7 pt-5"><p className="text-xs text-neutral-500">{prediction.marketTitle}</p>
        {prediction.locked ? (
          <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><LockKeyhole className="size-4 text-lime-300" /> Prediction locked</div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-neutral-600"><span>Direction<br /><b>Locked</b></span><span>Confidence<br /><b>Locked</b></span><span>Reasoning<br /><b>Locked</b></span></div></div>
        ) : (
          <div className="mt-4"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Prediction</p><p className={`mt-1 text-2xl font-black ${prediction.direction === "UP" ? "text-lime-300" : "text-orange-300"}`}>{prediction.direction}</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-wider text-neutral-600">Confidence</p><p className="mt-1 text-xl font-semibold">{prediction.confidence}%</p></div></div>{prediction.reasoning ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-400">{prediction.reasoning}</p> : null}<div className="mt-4 text-xs text-neutral-600">Market at entry {Math.round(prediction.marketProbabilityAtEntry * 1000) / 10}%</div>{prediction.status === "RESOLVED" ? <div className="mt-3 text-xs font-semibold">Result: {prediction.isCorrect ? "Correct" : "Incorrect"}</div> : null}</div>
        )}
      </div>
    </Card>
  );
}
