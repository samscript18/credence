"use client";

import type { VisiblePrediction } from "@credence/shared";
import { CircleCheck, CircleX, ExternalLink, Minus } from "lucide-react";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { ClaimPrediction } from "./claim-prediction";

export function PredictionHistoryRow({ prediction }: { prediction: VisiblePrediction }) {
  const voided = prediction.finalOutcome === "VOID";
  const Icon = voided ? Minus : prediction.isCorrect ? CircleCheck : CircleX;

  return (
    <details id={`prediction-${prediction.id}`} className="group border-b border-white/[0.04] last:border-0">
      <summary className="cursor-pointer list-none px-5 py-4 transition-colors hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] ${
                voided
                  ? "border-white/10 text-muted"
                  : prediction.isCorrect
                  ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                  : "border-rose-400/20 bg-rose-400/[0.07] text-rose-300"
              }`}
            >
              <Icon className="size-2.5" />
              {voided ? "Void" : prediction.isCorrect ? "Correct" : "Incorrect"}
            </span>

            <span className="font-mono text-[13px] font-medium text-foreground">
              {prediction.underlying ?? "Contract"} ·{" "}
              <span className={prediction.direction === "UP" ? "text-emerald-400" : "text-rose-400"}>
                {prediction.direction}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs">
            <span className="text-muted">
              Entry: <b className="text-foreground font-normal">{Math.round(prediction.marketProbabilityAtEntry * 1000) / 10}%</b>
            </span>
            <span className="text-muted">
              Conf: <b className="text-foreground font-normal">{prediction.confidence}%</b>
            </span>
            {prediction.realizedPnl && (
              <span className={prediction.realizedPnl.startsWith("+") ? "text-emerald-400" : prediction.realizedPnl.startsWith("-") ? "text-rose-400" : "text-muted"}>
                {prediction.realizedPnl}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted/60">
          <span>{prediction.marketTitle}</span>
          <span className="text-signal group-open:hidden">+ Show details</span>
          <span className="text-signal hidden group-open:inline">− Hide details</span>
        </div>
      </summary>

      <div className="border-t border-white/[0.04] bg-white/[0.015] px-5 py-4 font-mono text-xs leading-relaxed text-muted">
        <p className="text-foreground/90 font-sans">{prediction.reasoning || "No written reasoning was attached to this prediction."}</p>
        <ClaimPrediction prediction={prediction} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2.5 text-[10px] text-muted/70">
          <span>Outcome: {prediction.finalOutcome ?? "Settled"}</span>
          <span>{prediction.createdAt.slice(0, 10)}</span>
          {prediction.transactionHash && (
            <a
              href={`${somniaShannon.blockExplorers.default.url}/tx/${prediction.transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-signal hover:underline"
            >
              Somnia Transaction <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </details>
  );
}
