"use client";

import { MIN_UNLOCK_BUFFER_SECONDS, type PredictionFeedItem } from "@credence/shared";
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
import { UnlockDialog } from "./unlock-dialog";
import { useWindowLive } from "@/hooks/use-window-live";

function displayAddress(address: string): string {
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function PredictionCard({ prediction }: { prediction: PredictionFeedItem }) {
	const [showUnlock, setShowUnlock] = useState(false);
	const [showBack, setShowBack] = useState(false);
	const { address } = useAccount();
	const windowLive = useWindowLive(prediction);
	const salesOpen = useWindowLive(prediction, MIN_UNLOCK_BUFFER_SECONDS);
	const name = prediction.predictor.displayName ?? displayAddress(prediction.predictorAddress);
	const demoLabel = prediction.predictor.isDemo ? "" : null;

	return (
		<div id={`prediction-${prediction.id}`} className="group relative flex flex-col justify-between rounded-xl border border-white/5 bg-[#0B0C0E] p-5 sm:p-6 transition-colors duration-200 hover:border-white/10">
			<div>
				{/* Card Header */}
				<div className="flex items-start justify-between gap-3">
					<Link href={`/profile/${prediction.predictorAddress}`} className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
						<PredictorAvatar address={prediction.predictorAddress} name={prediction.predictor.displayName} avatarUrl={prediction.predictor.avatarUrl} className="size-8" />
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<p className="truncate font-mono text-[12px] font-medium text-foreground">{name}</p>
								{demoLabel && <p className="text-[10px] text-signal">{demoLabel}</p>}
								{prediction.predictor.verified && <VerifiedBadge />}
							</div>
							<div className="mt-1 flex items-center gap-2">
								<ReputationBadge score={prediction.predictor.reputationScore} />
							</div>
						</div>
					</Link>
					<span className="font-mono text-[10px] uppercase text-muted">{prediction.status === "ACTIVE" ? windowLive ? "Live" : "Closed · awaiting settlement" : <StatusChip status={prediction.status} />}</span>
				</div>

				{/* Contract Market Info */}
				<div className="mt-4 border-t border-white/5 pt-4">
					<div className="flex items-center justify-between gap-2">
						<span className="font-mono text-[11px] text-muted">{prediction.marketTitle}</span>
						<span className="rounded-sm border border-white/10 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
							{prediction.source === "LIVE" ? "On-chain" : "Demo record"}
						</span>
					</div>

					{/* Locked Insight or Revealed Call */}
					{prediction.locked ? (
						<div className="mt-4 rounded-lg border border-signal/15 bg-signal/[0.025] p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-signal font-medium">
									<LockKeyhole className="size-3.5" />
									{windowLive ? "Active Insight" : "Closed insight"}
								</div>
								<span className="font-mono text-[10px] text-muted">{windowLive ? "Paid access" : "Public after resolution"}</span>
							</div>
							<div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/5 py-3 text-center font-mono text-[11px]">
								<div>
									<span className="text-muted/60 text-[9px] uppercase tracking-[0.14em] block">Direction</span>
									<span className="text-muted font-medium">Locked</span>
								</div>
								<div>
									<span className="text-muted/60 text-[9px] uppercase tracking-[0.14em] block">Confidence</span>
									<span className="text-muted font-medium">Locked</span>
								</div>
								<div>
									<span className="text-muted/60 text-[9px] uppercase tracking-[0.14em] block">Reasoning</span>
									<span className="text-muted font-medium">Locked</span>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setShowUnlock(true)}
								className="mt-4 w-full cursor-pointer rounded-full bg-signal py-2.5 text-center font-mono text-xs font-semibold text-[#04131f] transition-all hover:bg-signal/90 active:scale-[0.98]"
							>
								{salesOpen ? "Unlock Insight" : "Check payment / refund"}
							</button>
						</div>
					) : (
						<div className="mt-4 space-y-4">
							<div className="flex items-baseline justify-between">
								<div>
									<span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Direction</span>
									<p className={`mt-0.5 font-mono text-2xl font-semibold tracking-tight ${prediction.direction === "UP" ? "text-up" : "text-down"}`}>{prediction.direction}</p>
								</div>
								<div className="text-right">
									<span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Confidence</span>
									<p className="mt-0.5 font-mono text-2xl font-medium tabular-nums text-foreground">{prediction.confidence}%</p>
								</div>
							</div>

							{prediction.reasoning && <p className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-[13px] leading-relaxed text-foreground/80">{prediction.reasoning}</p>}

							<div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 font-mono text-[11px] text-muted">
								<span>
									Entry probability: <b className="text-signal font-normal">{Math.round(prediction.marketProbabilityAtEntry * 1000) / 10}%</b>
								</span>
								{prediction.status === "ACTIVE" && <MarketCountdown expiryAt={prediction.marketExpiryAt} />}
							</div>

							{prediction.status === "RESOLVED" && (
								<div
									className={`flex items-center gap-3 rounded-lg border p-3 ${
										prediction.isCorrect ? "border-emerald-400/20 bg-emerald-400/[0.04]" : "border-rose-400/20 bg-rose-400/[0.04]"
									}`}
								>
									{prediction.isCorrect ? <CircleCheck className="size-4 text-emerald-400 shrink-0" /> : <CircleX className="size-4 text-rose-400 shrink-0" />}
									<div className="min-w-0">
										<p className="font-mono text-xs font-medium">{prediction.isCorrect ? "Correct prediction" : "Incorrect prediction"}</p>
										<p className="font-mono text-[10px] text-muted">Final outcome: {prediction.finalOutcome}</p>
									</div>
								</div>
							)}

							{prediction.transactionHash && (
								<a
									className="inline-flex items-center gap-1.5 font-mono text-[10px] text-signal transition-colors hover:text-signal"
									href={`${somniaShannon.blockExplorers.default.url}/tx/${prediction.transactionHash}`}
									target="_blank"
									rel="noreferrer"
								>
									View verified trade on Somnia <ExternalLink className="size-3" />
								</a>
							)}

							{windowLive && address?.toLowerCase() !== prediction.predictorAddress && (
								<button
									type="button"
									onClick={() => setShowBack(true)}
									className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-2.5 font-mono text-xs font-medium text-foreground transition-all hover:bg-white/[0.08] active:scale-[0.98]"
								>
									<Repeat2 className="size-3.5 text-signal" />
									Back Prediction on DreamDEX
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			{!prediction.locked && prediction.source === "LIVE" && address?.toLowerCase() !== prediction.predictorAddress && (
				<button type="button" onClick={() => setShowUnlock(true)} className="mt-4 text-xs text-muted underline">
					Manage insight payment / refund
				</button>
			)}
			{showUnlock && <UnlockDialog key={`${prediction.id}:${address}`} prediction={prediction} onClose={() => setShowUnlock(false)} />}
			{!prediction.locked && showBack && <BackPredictionDialog prediction={prediction} onClose={() => setShowBack(false)} />}
		</div>
	);
}
