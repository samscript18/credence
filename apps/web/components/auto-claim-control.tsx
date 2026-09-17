"use client";

import type { AutoClaimPreparation, VisiblePrediction } from "@credence/shared";
import { erc6909Abi } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createPublicClient, http } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { useAuth } from "@/hooks/use-auth";
import { apiErrorMessage } from "@/services/api";
import { predictionsService } from "@/services/predictions.service";
import { Button } from "./ui/button";

const labels: Record<string, string> = {
  READY: "Auto-Claim Ready", WATCHING: "Watching for settlement", ELIGIBLE: "Eligible for Auto-Claim",
  EXECUTING: "Executing via KeeperHub", VERIFIED: "Auto-claimed by KeeperHub", REFUSED: "Auto-Claim Refused",
  FAILED: "Auto-Claim Failed", STALE: "Position changed", EXPIRED: "Authorization expired", INVALID: "Authorization invalid",
};

type SetupStep = "idle" | "approval" | "authorization";

export function AutoClaimControl({ prediction }: { prediction: VisiblePrediction }) {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const auth = useAuth();
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [prepared, setPrepared] = useState<AutoClaimPreparation | null>(null);
  const [step, setStep] = useState<SetupStep>("idle");

  if (prediction.source !== "LIVE" || address?.toLowerCase() !== prediction.predictorAddress || prediction.claimTransactionHash) return null;
  const pending = prediction.autoClaimStatus === "EXECUTING";

  function assertOwner(expected?: AutoClaimPreparation) {
    if (!walletClient || !address || chainId !== somniaShannon.id) throw new Error("Connect the predictor wallet on Somnia Shannon first.");
    if (auth.data?.walletAddress !== address.toLowerCase()) throw new Error("Sign in to Credence with the predictor wallet first.");
    if (expected && expected.owner !== address.toLowerCase()) throw new Error("Authorization owner does not match the connected wallet.");
  }

  async function prepare() {
    setBusy(true); setError("");
    try {
      assertOwner();
      const next = await predictionsService.prepareAutoClaim(prediction.id);
      assertOwner(next);
      if (next.chainId !== somniaShannon.id || next.marketId.toLowerCase() !== prediction.marketId.toLowerCase() || next.outcomeIdx !== (prediction.direction === "UP" ? 0 : 1) || next.amount !== prediction.positionReference) throw new Error("Prepared redemption does not match this prediction.");
      setPrepared(next);
      setStep(next.approvalRequired ? "approval" : "authorization");
    } catch (caught) { setError(apiErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function approve() {
    setBusy(true); setError("");
    try {
      if (!prepared) throw new Error("Prepare this position again.");
      assertOwner(prepared);
      const rpc = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || "https://dream-rpc.somnia.network";
      const publicClient = createPublicClient({ chain: somniaShannon, transport: http(rpc) });
      const hash = await walletClient!.writeContract({ account: address!, chain: somniaShannon, address: prepared.outcomeToken as `0x${string}`, abi: erc6909Abi, functionName: "approve", args: [prepared.module as `0x${string}`, BigInt(prepared.outcomeId), BigInt(prepared.approvalAmount)] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Outcome approval failed.");
      const allowance = await publicClient.readContract({ address: prepared.outcomeToken as `0x${string}`, abi: erc6909Abi, functionName: "allowance", args: [address!, prepared.module as `0x${string}`, BigInt(prepared.outcomeId)] });
      if (allowance < BigInt(prepared.amount)) throw new Error("The exact outcome allowance is still below the redemption amount.");
      setStep("authorization");
    } catch (caught) { setError(apiErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function authorize() {
    setBusy(true); setError("");
    try {
      if (!prepared) throw new Error("Prepare this position again.");
      assertOwner(prepared);
      const signature = await walletClient!.signTypedData({ account: address!, domain: { name: "SomniaMarkets", version: "1", chainId: prepared.chainId, verifyingContract: prepared.module as `0x${string}` }, types: { RedeemAuthorization: [
        { name: "owner", type: "address" }, { name: "operatorId", type: "uint32" }, { name: "venueId", type: "bytes32" },
        { name: "marketId", type: "bytes32" }, { name: "outcomeIdx", type: "uint8" }, { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
      ] }, primaryType: "RedeemAuthorization", message: { owner: address!, operatorId: prepared.operatorId, venueId: prepared.venueId as `0x${string}`, marketId: prepared.marketId as `0x${string}`, outcomeIdx: prepared.outcomeIdx, amount: BigInt(prepared.amount), nonce: BigInt(prepared.nonce), deadline: BigInt(prepared.deadline) } });
      await predictionsService.enableAutoClaim(prediction.id, { module: prepared.module, marketId: prepared.marketId, outcomeIdx: prepared.outcomeIdx, amount: prepared.amount, nonce: prepared.nonce, deadline: prepared.deadline, operatorId: prepared.operatorId, venueId: prepared.venueId, signature });
      setPrepared(null); setStep("idle");
      await cache.invalidateQueries({ queryKey: ["profile"] });
    } catch (caught) { setError(apiErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setError("");
    try { await predictionsService.disableAutoClaim(prediction.id); await cache.invalidateQueries({ queryKey: ["profile"] }); }
    catch (caught) { setError(apiErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  const status = prediction.autoClaimEnabled
    ? labels[prediction.autoClaimStatus ?? "READY"] ?? prediction.autoClaimStatus
    : step === "approval" ? "Approval required" : step === "authorization" ? "Authorization required" : "Auto-Claim Off";

  return <div className="space-y-2 rounded-lg border border-signal/15 bg-signal/[0.025] p-3">
    <p className="text-xs font-medium text-foreground">{status}</p>
    <p className="text-[10px] leading-relaxed text-muted">Authorize this exact DreamDEX position and amount. KeeperHub may submit redemption after settlement and pay gas; collateral remains payable to your wallet. Manual claiming remains available unless execution is pending.</p>
    {prepared && <p className="text-[10px] text-muted">Outcome amount: {prepared.amount} units. Authorization expires {new Date(Number(prepared.deadline) * 1000).toLocaleString()}.</p>}
    {prediction.autoClaimReason && <p className="text-[10px] text-muted">{prediction.autoClaimReason.replaceAll("_", " ").toLowerCase()}</p>}
    {prediction.autoClaimEnabled ? <Button disabled={busy || pending || prediction.autoClaimStatus === "VERIFIED"} onClick={() => void disable()}>{busy ? "Updating…" : pending ? "KeeperHub execution pending" : "Turn off Auto-Claim"}</Button>
      : step === "approval" && prepared ? <Button disabled={busy} onClick={() => void approve()}>{busy ? "Waiting for approval…" : `Approve ${prepared.approvalAmount} outcome units`}</Button>
      : step === "authorization" ? <Button disabled={busy} onClick={() => void authorize()}>{busy ? "Waiting for authorization…" : "Sign RedeemAuthorization"}</Button>
      : <Button disabled={busy} onClick={() => void prepare()}>{busy ? "Checking position…" : "Set up Auto-Claim"}</Button>}
    {error && <p role="alert" className="text-xs text-down">{error}</p>}
  </div>;
}
