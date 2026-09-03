"use client";

import type { GatedPrediction } from "@credence/shared";
import { CheckCircle2, ExternalLink, LoaderCircle, LockKeyhole, X } from "lucide-react";
import { erc20Abi, formatUnits } from "viem";
import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

import { useAuth } from "@/hooks/use-auth";
import { predictionFeedKey } from "@/hooks/use-predictions";
import { apiErrorMessage } from "@/services/api";
import { unlocksService } from "@/services/unlocks.service";
import { Button } from "./ui/button";

type Stage = "IDLE" | "PREPARING" | "WALLET" | "SUBMITTED" | "VERIFYING" | "SUCCESS";

export function UnlockDialog({ prediction, onClose }: { prediction: GatedPrediction; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const busy = stage !== "IDLE" && stage !== "SUCCESS";

  async function finish(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: predictionFeedKey }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
    ]);
    onClose();
  }

  async function unlock(): Promise<void> {
    setError(null);
    try {
      if (!address || !walletClient || !publicClient) throw new Error("Connect your wallet first.");
      if (!auth.data || auth.data.walletAddress !== address.toLowerCase()) throw new Error("Sign in with your wallet first.");
      if (chainId !== somniaShannon.id) throw new Error("Switch to Somnia Shannon before paying.");
      setStage("PREPARING");
      const instructions = await unlocksService.prepare(prediction.id);
      setPrice(`${formatUnits(BigInt(instructions.amountBaseUnits), instructions.tokenDecimals)} ${instructions.tokenSymbol}`);
      setStage("WALLET");
      const hash = await walletClient.writeContract({
        account: address,
        chain: somniaShannon,
        address: instructions.tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "transfer",
        args: [instructions.recipient as `0x${string}`, BigInt(instructions.amountBaseUnits)],
      });
      setTransactionHash(hash);
      setStage("SUBMITTED");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Payment transaction failed.");
      setStage("VERIFYING");
      const confirmation = await unlocksService.confirm(prediction.id, hash);
      setTransactionHash(confirmation.transactionHash);
      setStage("SUCCESS");
    } catch (caught) {
      setError(apiErrorMessage(caught));
      setStage("IDLE");
    }
  }

  const labels: Record<Exclude<Stage, "IDLE" | "SUCCESS">, string> = { PREPARING: "Preparing payment", WALLET: "Waiting for wallet", SUBMITTED: "Confirming on Somnia", VERIFYING: "Verifying payment" };
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#11130f] p-6 sm:rounded-3xl"><div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-lime-300">Unlock insight</p><h2 className="mt-2 text-xl font-bold">{prediction.predictor.displayName ?? "Predictor"}&apos;s prediction</h2></div><Button variant="ghost" className="size-9 p-0" onClick={() => stage === "SUCCESS" ? void finish() : onClose()} disabled={busy}><X className="size-4" /></Button></div>{stage === "SUCCESS" ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto size-11 text-lime-300" /><h3 className="mt-4 text-lg font-bold">Prediction unlocked</h3><p className="mt-2 text-sm text-neutral-500">The payment was verified on Somnia and the structured insight is now available to this wallet.</p>{transactionHash ? <a className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-mono text-xs text-lime-300 hover:border-lime-300/40" href={`${somniaShannon.blockExplorers.default.url}/tx/${transactionHash}`} rel="noreferrer" target="_blank"><span className="truncate">{transactionHash}</span><ExternalLink className="size-3 shrink-0" /></a> : null}<Button className="mt-6 w-full" onClick={() => void finish()}>View prediction</Button></div> : <div className="mt-6"><div className="rounded-xl border border-white/8 bg-black/20 p-4"><div className="flex items-center gap-3"><LockKeyhole className="size-5 text-lime-300" /><div><p className="text-sm font-semibold">{prediction.marketTitle}</p><p className="mt-1 text-xs text-neutral-500">Reputation {Math.round(prediction.predictor.reputationScore * 10) / 10} · {Math.round(prediction.predictor.accuracy * 10) / 10}% accuracy</p></div></div><div className="mt-4 flex justify-between border-t border-white/7 pt-4 text-sm"><span className="text-neutral-500">Unlock price</span><b>{price ?? "1 tUSDC"}</b></div></div>{error ? <p className="mt-4 rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-sm text-red-300">{error}</p> : null}{busy ? <p className="mt-5 flex items-center justify-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin text-lime-300" />{labels[stage as Exclude<Stage, "IDLE" | "SUCCESS">]}</p> : null}{address && chainId !== somniaShannon.id ? <Button className="mt-5 w-full" onClick={() => switchChain({ chainId: somniaShannon.id })}>Switch to Somnia Shannon</Button> : <Button className="mt-5 w-full" onClick={() => void unlock()} disabled={busy || !auth.data}>Unlock prediction</Button>}{!auth.data ? <p className="mt-2 text-center text-xs text-neutral-600">Connect and sign in from the header first.</p> : null}</div>}</div></div>;
}
