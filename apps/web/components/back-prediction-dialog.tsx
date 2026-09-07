"use client";

import { TransactionStepper } from "./transaction-stepper";
import { ModalShell } from "./modal-shell";

import type { BackedPredictionRecord, DreamDexMarketQuote, VisiblePrediction } from "@credence/shared";
import { CheckCircle2, ExternalLink, Repeat2, X } from "lucide-react";
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

type Stage = "REFRESHING" | "IDLE" | "PREPARING" | "WALLET" | "SUBMITTED" | "RECORDING" | "SUCCESS";

const labels: Record<Exclude<Stage, "IDLE" | "SUCCESS">, string> = {
	REFRESHING: "Refreshing market quote",
	PREPARING: "Preparing DreamDEX trade",
	WALLET: "Waiting for wallet",
	SUBMITTED: "Confirming on Somnia",
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
	const currentProbability = market?.probabilities ? (prediction.direction === "UP" ? market.probabilities.yes : market.probabilities.no) : null;

	useEffect(() => {
		let active = true;
		void marketsService
			.get(prediction.marketId)
			.then((fresh) => {
				if (!active) return;
				setMarket(fresh);
				setStake(String(fresh.minimumQuantity ?? ""));
				setStage("IDLE");
			})
			.catch((caught) => {
				if (!active) return;
				setError(apiErrorMessage(caught));
				setStage("IDLE");
			});
		return () => {
			active = false;
		};
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
			if (fresh.minimumQuantity !== null && Number(stake) < fresh.minimumQuantity) throw new Error(`Minimum stake is ${fresh.minimumQuantity} ${fresh.collateralSymbol}.`);

			setStage("PREPARING");
			await Promise.resolve();
			setStage("WALLET");
			const trade = await dreamDex.prepareOrExecutePredictionTrade({
				marketId: prediction.marketId,
				marketAddress: prediction.marketAddress ?? fresh.marketAddress,
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
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: marketKeys.all }),
				queryClient.invalidateQueries({ queryKey: ["profile"] }),
			]);
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
			await queryClient.invalidateQueries({ queryKey: ["profile"] });
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
			await queryClient.invalidateQueries({ queryKey: ["profile"] });
			setStage("SUCCESS");
		} catch (caught) {
			setError(apiErrorMessage(caught));
			setStage("IDLE");
		}
	}

	return (
		<ModalShell titleId="back-title" onClose={onClose} busy={busy}>
			<div className="flex flex-col overflow-hidden bg-[#0B0C0E]">
				{/* Modal Top Header */}
				<div className="flex items-center justify-between border-b border-white/5 bg-[#0F1012] px-6 py-4">
					<div>
						<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal flex items-center gap-1.5">
							<Repeat2 className="size-3" />
							Back Call
						</span>
						<h2 id="back-title" className="text-lg font-medium text-foreground mt-0.5">
							Back {prediction.predictor.displayName ?? "Predictor"}
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={busy}
						aria-label="Close Back Prediction dialog"
						className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-white/[0.05] hover:text-foreground transition-colors disabled:opacity-40"
					>
						<X className="size-4" />
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
					{stage === "SUCCESS" && record ? (
						<div className="py-8 text-center space-y-4">
							<CheckCircle2 className="mx-auto size-12 text-emerald-400" />
							<div>
								<h3 className="text-xl font-medium text-foreground">Position Opened</h3>
								<p className="mt-1 text-sm text-muted">Your filled DreamDEX trade was confirmed and linked to this prediction call.</p>
							</div>

							<div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left font-mono text-xs space-y-2">
								<div className="flex justify-between">
									<span className="text-muted">Direction</span>
									<span className="text-foreground">{record.direction}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted">Filled Quantity</span>
									<span className="text-foreground">{record.stakeAmount}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted">Execution Probability</span>
									<span className="text-signal">{Math.round(record.marketProbabilityAtExecution * 1000) / 10}%</span>
								</div>
							</div>

							<a
								className="inline-flex items-center gap-1.5 font-mono text-xs text-signal hover:underline"
								href={`${somniaShannon.blockExplorers.default.url}/tx/${record.transactionHash}`}
								rel="noreferrer"
								target="_blank"
							>
								View on Somnia Explorer <ExternalLink className="size-3.5" />
							</a>

							<div className="pt-4">
								<button
									type="button"
									onClick={onClose}
									className="w-full cursor-pointer rounded-full bg-signal py-2.5 font-mono text-xs font-semibold text-[#04131f] transition-all hover:bg-signal/90"
								>
									Done
								</button>
							</div>
						</div>
					) : (
						<>
							{/* Call comparison card */}
							<div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3 font-mono">
								<div className="flex items-center justify-between">
									<span className="text-[10px] uppercase tracking-[0.16em] text-muted">Original Call</span>
									<span className={`text-sm font-semibold ${prediction.direction === "UP" ? "text-emerald-400" : "text-rose-400"}`}>{prediction.direction}</span>
								</div>
								<div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3 text-xs">
									<div>
										<span className="text-muted text-[10px] block">Predictor Entry</span>
										<span className="text-foreground font-medium mt-0.5 block">{Math.round(prediction.marketProbabilityAtEntry * 1000) / 10}%</span>
									</div>
									<div>
										<span className="text-muted text-[10px] block">Current DreamDEX</span>
										<span className="text-signal font-medium mt-0.5 block">{currentProbability === null ? "—" : `${Math.round(currentProbability * 1000) / 10}%`}</span>
									</div>
								</div>
							</div>

							{/* Stake quantity input */}
							<div>
								<label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
									Your Position Size ({market?.collateralSymbol ?? prediction.collateralSymbol ?? "tokens"})
								</label>
								<input
									className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 font-mono text-sm text-foreground outline-none focus:border-signal"
									disabled={busy}
									inputMode="decimal"
									placeholder="10"
									value={stake}
									onChange={(event) => setStake(event.target.value)}
								/>
							</div>

							{pendingHash && (
								<div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 font-mono text-xs text-amber-300">
									<p>Transaction submitted. Retry verification without duplicating trade.</p>
									<a
										className="mt-2 inline-flex items-center gap-1 underline"
										href={`${somniaShannon.blockExplorers.default.url}/tx/${pendingHash}`}
										rel="noreferrer"
										target="_blank"
									>
										View submitted tx <ExternalLink className="size-3" />
									</a>
								</div>
							)}

							{error && (
								<p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 font-mono text-xs text-rose-300">
									{error}
								</p>
							)}

							{busy && <TransactionStepper steps={Object.values(labels)} current={labels[stage as Exclude<Stage, "IDLE" | "SUCCESS">]} />}

							{pendingHash ? (
								<button
									type="button"
									onClick={() => void retryVerification()}
									disabled={busy}
									className="w-full cursor-pointer rounded-full bg-signal py-3 font-mono text-xs font-semibold text-[#04131f] transition-all hover:bg-signal/90"
								>
									Retry Verification
								</button>
							) : address && chainId !== somniaShannon.id ? (
								<button
									type="button"
									onClick={() => switchChain({ chainId: somniaShannon.id })}
									className="w-full cursor-pointer rounded-full bg-signal py-3 font-mono text-xs font-semibold text-[#04131f] transition-all hover:bg-signal/90"
								>
									Switch to Somnia Shannon
								</button>
							) : (
								<div className="space-y-2">
									<button type="button" onClick={() => void back()} disabled={busy || !market} className="brand-button w-full cursor-pointer disabled:opacity-40">
										<span>Confirm DreamDEX Trade</span>
									</button>
									<button
										type="button"
										onClick={() => void recoverLatest()}
										disabled={busy || !auth.data}
										className="w-full cursor-pointer rounded-md py-2 font-mono text-xs text-muted hover:text-foreground transition-colors disabled:opacity-40"
									>
										Recover latest filled trade
									</button>
								</div>
							)}

							<p className="text-center font-mono text-[10px] text-muted/60">This creates your own position on DreamDEX Event Contracts.</p>
						</>
					)}
				</div>
			</div>
		</ModalShell>
	);
}
