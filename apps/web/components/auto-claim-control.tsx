"use client";

import type { VisiblePrediction } from "@credence/shared";
import { erc6909Abi } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { createPublicClient, http } from "viem";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useWalletClient } from "wagmi";
import { predictionsService } from "@/services/predictions.service";
import { apiErrorMessage } from "@/services/api";
import { Button } from "./ui/button";

const labels: Record<string, string> = {
  READY: "Auto-Claim Ready", WATCHING: "Watching for settlement", ELIGIBLE: "Eligible for Auto-Claim",
  EXECUTING: "Executing via KeeperHub", VERIFIED: "Auto-claimed by KeeperHub", REFUSED: "Auto-Claim Refused",
  FAILED: "Auto-Claim Failed", STALE: "Position changed", EXPIRED: "Authorization expired", INVALID: "Authorization invalid",
};

export function AutoClaimControl({ prediction }: { prediction: VisiblePrediction }) {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (prediction.source !== "LIVE" || address?.toLowerCase() !== prediction.predictorAddress || prediction.claimTransactionHash) return null;
  const pending = prediction.autoClaimStatus === "EXECUTING";

  async function enable() {
    setBusy(true); setError("");
    try {
      if (!walletClient || !address || chainId !== somniaShannon.id) throw new Error("Connect the predictor wallet on Somnia Shannon first.");
      const prepared = await predictionsService.prepareAutoClaim(prediction.id);
      if (prepared.owner !== address.toLowerCase()) throw new Error("Authorization owner does not match the connected wallet.");
      if (prepared.approvalRequired) {
        const hash = await walletClient.writeContract({ account: address, chain: somniaShannon, address: prepared.outcomeToken as `0x${string}`, abi: erc6909Abi, functionName: "approve", args: [prepared.module as `0x${string}`, BigInt(prepared.outcomeId), BigInt(prepared.approvalAmount)] });
        const rpc = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || "https://dream-rpc.somnia.network";
        const receipt = await createPublicClient({ chain: somniaShannon, transport: http(rpc) }).waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Outcome approval failed.");
      }
      const signature = await walletClient.signTypedData({ account: address, domain: { name: "SomniaMarkets", version: "1", chainId: prepared.chainId, verifyingContract: prepared.module as `0x${string}` }, types: { RedeemAuthorization: [
        { name: "owner", type: "address" }, { name: "operatorId", type: "uint32" }, { name: "venueId", type: "bytes32" },
        { name: "marketId", type: "bytes32" }, { name: "outcomeIdx", type: "uint8" }, { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
      ] }, primaryType: "RedeemAuthorization", message: { owner: address, operatorId: prepared.operatorId, venueId: prepared.venueId as `0x${string}`, marketId: prepared.marketId as `0x${string}`, outcomeIdx: prepared.outcomeIdx, amount: BigInt(prepared.amount), nonce: BigInt(prepared.nonce), deadline: BigInt(prepared.deadline) } });
      await predictionsService.enableAutoClaim(prediction.id, { module: prepared.module, marketId: prepared.marketId, outcomeIdx: prepared.outcomeIdx, amount: prepared.amount, nonce: prepared.nonce, deadline: prepared.deadline, operatorId: prepared.operatorId, venueId: prepared.venueId, signature });
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

  return <div className="space-y-2 rounded-lg border border-signal/15 bg-signal/[0.025] p-3">
    <p className="text-xs font-medium text-foreground">{prediction.autoClaimStatus ? labels[prediction.autoClaimStatus] ?? prediction.autoClaimStatus : "Auto-Claim Off"}</p>
    <p className="text-[10px] leading-relaxed text-muted">Authorize this exact DreamDEX position and amount. KeeperHub may submit redemption after settlement and pay gas; collateral remains payable to your wallet. Manual claiming remains available unless execution is pending.</p>
    {prediction.autoClaimReason && <p className="text-[10px] text-muted">{prediction.autoClaimReason.replaceAll("_", " ").toLowerCase()}</p>}
    {prediction.autoClaimEnabled ? <Button disabled={busy || pending || prediction.autoClaimStatus === "VERIFIED"} onClick={() => void disable()}>{busy ? "Updating…" : pending ? "KeeperHub execution pending" : "Turn off Auto-Claim"}</Button> : <Button disabled={busy} onClick={() => void enable()}>{busy ? "Check wallet…" : "Auto-Claim winnings with KeeperHub"}</Button>}
    {error && <p role="alert" className="text-xs text-down">{error}</p>}
  </div>;
}
