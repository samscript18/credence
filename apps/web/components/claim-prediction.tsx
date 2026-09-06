"use client";
import type { VisiblePrediction } from "@credence/shared";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { dreamDex } from "@/lib/dreamdex/adapter";
import { predictionsService } from "@/services/predictions.service";
import { apiErrorMessage } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";

export function ClaimPrediction({ prediction }: { prediction: VisiblePrediction }) {
	const { address, chainId } = useAccount();
	const { data: walletClient } = useWalletClient();
	const { switchChain } = useSwitchChain();
	const auth = useAuth();
	const cache = useQueryClient();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [hash, setHash] = useState("");
	if (prediction.source !== "LIVE" || prediction.status !== "RESOLVED") return null;
	const owner = address?.toLowerCase() === prediction.predictorAddress;
	const payoutKnown = prediction.settlementPayout !== undefined;
	const zeroPayout = payoutKnown && /^0(?:\.0+)?$/.test(prediction.settlementPayout!);
	async function claim() {
		setError("");
		setBusy(true);
		try {
			if (!address || !walletClient || auth.data?.walletAddress !== address.toLowerCase()) throw new Error("Sign in with the predictor wallet first.");
			if (chainId !== somniaShannon.id) throw new Error("Switch to Somnia Shannon.");
			if (!prediction.marketAddress || !prediction.positionReference) throw new Error("This older record needs window migration before claiming here.");
			const tx =
				hash ||
				(await dreamDex.claimPrediction({
					marketId: prediction.marketId,
					marketAddress: prediction.marketAddress,
					direction: prediction.direction,
					quantity: prediction.positionReference,
					account: address,
					walletClient,
				}));
			setHash(tx);
			await predictionsService.confirmClaim(prediction.id, tx);
			await Promise.all([cache.invalidateQueries({ queryKey: ["profile"] }), cache.invalidateQueries({ queryKey: ["leaderboard"] }), cache.invalidateQueries({ queryKey: ["predictions"] })]);
		} catch (caught) {
			setError(apiErrorMessage(caught));
		} finally {
			setBusy(false);
		}
	}
	return (
		<div className="mt-4 space-y-3 border-t border-white/10 pt-4">
			<p>
				Settled P&amp;L (estimated, before redemption fees): {prediction.unrealizedPnl ?? "Unavailable"} {prediction.collateralSymbol}
			</p>
			<p>Claimed P&amp;L: {prediction.claimTransactionHash ? `${prediction.realizedPnl ?? "Unavailable"} ${prediction.collateralSymbol ?? ""}` : "No claim recorded"}</p>
			{zeroPayout && <p className="text-xs">Settled with zero payout — nothing to claim. Your entry cost is already included in settled P&amp;L. No further payment or transaction is required.</p>}
			{!payoutKnown && <p className="text-xs">Settlement payout verification is pending or this older record needs accounting recovery. No new claim is offered until its payout is known.</p>}
			{owner && !prediction.claimTransactionHash && (
				<>
					{payoutKnown && !zeroPayout && (
						<p className="text-xs">
							Pending claim: estimated gross payout {prediction.settlementPayout} {prediction.collateralSymbol}. Redemption fees may apply. Already claimed elsewhere? Verify the existing hash
							below.
						</p>
					)}
					{(hash || (payoutKnown && !zeroPayout)) &&
						(chainId !== somniaShannon.id ? (
							<Button onClick={() => switchChain({ chainId: somniaShannon.id })}>Switch to Somnia Shannon</Button>
						) : (
							<Button disabled={busy} onClick={() => void claim()}>
								{busy ? "Confirming claim…" : hash ? "Verify existing claim" : "Claim on DreamDEX"}
							</Button>
						))}
					<input
						aria-label="Existing claim transaction hash"
						placeholder="Already claimed? Paste transaction hash"
						value={hash}
						onChange={(event) => setHash(event.target.value)}
						className="block w-full rounded border border-white/10 bg-surface p-2 text-xs"
						disabled={busy}
					/>
				</>
			)}
			{(hash || prediction.claimTransactionHash) && (
				<a className="block break-all text-signal" target="_blank" rel="noreferrer" href={`${somniaShannon.blockExplorers.default.url}/tx/${hash || prediction.claimTransactionHash}`}>
					View claim transaction
				</a>
			)}
			{error && (
				<p role="alert" className="text-down">
					{error}
				</p>
			)}
		</div>
	);
}
