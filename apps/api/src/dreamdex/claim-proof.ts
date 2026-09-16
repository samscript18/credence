import { binaryModuleWriteAbi } from "@somnia-chain/markets-sdk";
import { decodeFunctionData, type Address, type Hex } from "viem";

export type RelayedClaimProof = {
  owner: Address; nonce: bigint; deadline: bigint; signature: Hex; operatorId: number;
  venueId: Hex; marketId: Hex; outcomeIdx: 0 | 1; amount: bigint;
};

export function assertRelayedClaimCalldata(data: Hex, expected: RelayedClaimProof): void {
  const decoded = decodeFunctionData({ abi: binaryModuleWriteAbi, data });
  if (decoded.functionName !== "redeemFor") throw new Error("Claim was not a DreamDEX redeemFor call");
  const a = decoded.args;
  if (a[0].toLowerCase() !== expected.owner.toLowerCase() || a[1] !== expected.nonce || a[2] !== expected.deadline || a[3].toLowerCase() !== expected.signature.toLowerCase() || a[4] !== expected.operatorId || a[5].toLowerCase() !== expected.venueId.toLowerCase() || a[6].toLowerCase() !== expected.marketId.toLowerCase() || a[7] !== expected.outcomeIdx || a[8] !== expected.amount) throw new Error("Relayed claim calldata does not match the authorization");
}

export function assertRelayedClaimEconomics(input: { ownerRecovered: bigint; executorRecovered: bigint; outcomeBefore: bigint; outcomeAfter: bigint; collateralBefore: bigint; collateralAfter: bigint; amount: bigint }): void {
  if (input.ownerRecovered <= 0n || input.executorRecovered !== 0n) throw new Error("Collateral payout was not exclusively paid to the owner");
  if (input.outcomeBefore - input.outcomeAfter !== input.amount || input.collateralAfter - input.collateralBefore !== input.ownerRecovered) throw new Error("Relayed claim post-state did not match the payout receipt");
}
