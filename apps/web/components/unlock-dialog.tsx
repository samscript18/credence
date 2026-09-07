"use client";

import { insightEscrowSignatures, MIN_UNLOCK_BUFFER_SECONDS, type PredictionFeedItem } from "@credence/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { erc20Abi, formatUnits, parseAbi } from "viem";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { useAuth } from "@/hooks/use-auth";
import { useWindowLive } from "@/hooks/use-window-live";
import { unlocksService } from "@/services/unlocks.service";
import { apiErrorMessage } from "@/services/api";
import { ModalShell } from "./modal-shell";
import { Button } from "./ui/button";

const abi = parseAbi(insightEscrowSignatures);

export function UnlockDialog({ prediction, onClose }: { prediction: PredictionFeedItem; onClose: () => void }) {
	const { address, chainId } = useAccount();
	const { data: walletClient } = useWalletClient();
	const publicClient = usePublicClient();
	const { switchChain } = useSwitchChain();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const windowLive = useWindowLive(prediction);
	const salesOpen = useWindowLive(prediction, MIN_UNLOCK_BUFFER_SECONDS);
	const [stage, setStage] = useState("");
	const [error, setError] = useState<string | null>(null);
	const storageKey = `credence:escrow:${address?.toLowerCase()}:${prediction.id}`;
	const [hash, setHash] = useState<`0x${string}` | null>(() => {
		try {
			if (typeof window === "undefined") return null;
			const saved = localStorage.getItem(storageKey);
			if (saved && /^0x[a-f0-9]{64}$/i.test(saved)) return saved as `0x${string}`;
		} catch {
			/* Storage may be disabled. On-chain payment remains recoverable. */
		}
		return null;
	});
	const [unlocked, setUnlocked] = useState(false);
	const instructions = useQuery({
		queryKey: ["unlock-instructions", prediction.id, address],
		queryFn: () => unlocksService.prepare(prediction.id),
		enabled: Boolean(address && auth.data?.walletAddress === address.toLowerCase()),
		refetchInterval: 15_000,
		retry: false,
	});
	const state = instructions.data?.escrowState ?? 0;
	const busy = Boolean(stage);

	async function sync(txHash: `0x${string}`) {
		const result = await unlocksService.confirm(prediction.id, txHash);
		setUnlocked(result.unlocked);
		await instructions.refetch();
		if (result.unlocked) {
			await Promise.all([queryClient.invalidateQueries({ queryKey: ["predictions"] }), queryClient.invalidateQueries({ queryKey: ["profile"] })]);
		}
	}

	async function transact(action: "deposit" | "reveal" | "refund") {
		setError(null);
		try {
			if (!address || !walletClient || !publicClient || auth.data?.walletAddress !== address.toLowerCase()) throw new Error("Connect and sign in with your wallet first.");
			if (chainId !== somniaShannon.id) throw new Error("Switch to Somnia Shannon first.");
			setStage("Checking escrow and window");
			const current = await unlocksService.prepare(prediction.id);
			if (action !== "refund" && !current.windowLive) throw new Error("This window has ended. Any unused deposit can be refunded.");
			if (action === "deposit" && !current.salesOpen) throw new Error("Insight sales are closed because this market is ending.");
			const escrow = current.escrowAddress as `0x${string}`;
			if (action === "deposit") {
				const allowance = await publicClient.readContract({ address: current.tokenAddress as `0x${string}`, abi: erc20Abi, functionName: "allowance", args: [address, escrow] });
				if (allowance < BigInt(current.amountBaseUnits)) {
					setStage("Approve the escrow payment token in your wallet");
					const approval = await walletClient.writeContract({
						account: address,
						chain: somniaShannon,
						address: current.tokenAddress as `0x${string}`,
						abi: erc20Abi,
						functionName: "approve",
						args: [escrow, BigInt(current.amountBaseUnits)],
					});
					if ((await publicClient.waitForTransactionReceipt({ hash: approval })).status !== "success") throw new Error("Token approval failed.");
				}
			}
			setStage(`Confirm ${action} in your wallet`);
			const common = { account: address, chain: somniaShannon, address: escrow, abi };
			const txHash =
				action === "deposit"
					? await walletClient.writeContract({
							...common,
							functionName: "deposit",
							args: [current.predictionKey, current.recipient as `0x${string}`, current.marketAddress as `0x${string}`, BigInt(current.expiry)],
						})
					: action === "reveal"
						? await walletClient.writeContract({ ...common, functionName: "reveal", args: [current.predictionKey] })
						: await walletClient.writeContract({ ...common, functionName: "refund", args: [current.predictionKey, address] });
			setHash(txHash);
			try {
				localStorage.setItem(storageKey, txHash);
			} catch {
				/* Optional recovery aid. */
			}
			setStage("Confirming on Somnia");
			if ((await publicClient.waitForTransactionReceipt({ hash: txHash })).status !== "success") throw new Error("Escrow transaction failed.");
			setStage("Verifying payment state");
			await sync(txHash);
		} catch (caught) {
			setError(apiErrorMessage(caught));
		} finally {
			setStage("");
		}
	}

	return (
		<ModalShell titleId="unlock-title" onClose={onClose} busy={busy}>
			<div className="space-y-5 p-6">
				<h2 id="unlock-title" className="text-xl font-medium">
					Unlock {prediction.predictor.displayName ?? "Predictor"}&apos;s insight
				</h2>
				<p className="text-sm text-muted">{prediction.marketTitle}</p>
				<p className="text-xs leading-6 text-muted">Payment stays in escrow until you explicitly reveal. If this window closes before you reveal, reclaim the full deposit. Backing is a separate trade.</p>
				{instructions.isLoading && <p role="status">Checking escrow…</p>}
				{(error || instructions.error) && (
					<p role="alert" className="text-sm text-down">
						{error ?? apiErrorMessage(instructions.error)}
					</p>
				)}
				{instructions.data && (
					<p className="font-mono text-sm">
						{formatUnits(BigInt(instructions.data.amountBaseUnits), instructions.data.tokenDecimals)} {instructions.data.tokenSymbol} · {windowLive ? "Live window" : "Window closed"}
					</p>
				)}
				{busy && (
					<p role="status" className="text-sm text-signal">
						{stage}
					</p>
				)}
				{hash && (
					<a className="block break-all text-xs text-signal" href={`${somniaShannon.blockExplorers.default.url}/tx/${hash}`} target="_blank" rel="noreferrer">
						View transaction: {hash}
					</a>
				)}
				{unlocked ? (
					<>
						<p className="text-signal">Insight unlocked. Access remains available to this wallet.</p>
						<Button onClick={onClose}>View prediction</Button>
					</>
				) : state === 3 ? (
					<p className="text-signal">Unused payment refunded.</p>
				) : (
					<>
						{address && chainId !== somniaShannon.id ? (
							<Button onClick={() => switchChain({ chainId: somniaShannon.id })}>Switch to Somnia Shannon</Button>
						) : (
							<>
								{state === 0 && (
									<Button disabled={busy || !salesOpen || !instructions.data?.salesOpen} onClick={() => void transact("deposit")}>
										{salesOpen && instructions.data?.salesOpen ? "Pay into escrow" : "Insight sales closed"}
									</Button>
								)}
								{state === 1 && (
									<Button disabled={busy} onClick={() => void transact(windowLive && instructions.data?.windowLive ? "reveal" : "refund")}>
										{windowLive && instructions.data?.windowLive ? "Reveal insight & release payment" : "Refund unused payment"}
									</Button>
								)}
							</>
						)}
						{hash && (
							<Button
								variant="secondary"
								disabled={busy}
								className="ml-4!"
								onClick={() => {
									setStage("Recovering payment state");
									void sync(hash)
										.catch((caught) => setError(apiErrorMessage(caught)))
										.finally(() => setStage(""));
								}}
							>
								Retry verification
							</Button>
						)}
						{state === 2 && !hash && <p className="text-xs text-muted">This wallet has revealed the insight. Enter your escrow transaction hash to restore API access.</p>}
						{state === 2 && !unlocked && (
							<input
								aria-label="Escrow transaction hash"
								className="w-full rounded border border-white/10 bg-surface p-3 text-xs"
								placeholder="0x…"
								onChange={(event) => {
									if (/^0x[a-f0-9]{64}$/i.test(event.target.value)) setHash(event.target.value as `0x${string}`);
								}}
							/>
						)}
					</>
				)}
				<Button variant="ghost" className="ml-4!" onClick={onClose} disabled={busy}>
					Close
				</Button>
			</div>
		</ModalShell>
	);
}
