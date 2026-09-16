import { binaryModuleWriteAbi } from "@somnia-chain/markets-sdk";
import { encodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";
import { assertRelayedClaimCalldata, assertRelayedClaimEconomics, type RelayedClaimProof } from "./claim-proof.js";

const proof: RelayedClaimProof = {
  owner: "0x1111111111111111111111111111111111111111", nonce: 12n, deadline: 2_000_000_000n,
  signature: `0x${"ab".repeat(65)}`, operatorId: 0, venueId: `0x${"00".repeat(32)}`,
  marketId: `0x${"22".repeat(32)}`, outcomeIdx: 1, amount: 99n,
};
const encode = (value = proof) => encodeFunctionData({ abi: binaryModuleWriteAbi, functionName: "redeemFor", args: [value.owner, value.nonce, value.deadline, value.signature, value.operatorId, value.venueId, value.marketId, value.outcomeIdx, value.amount] });

describe("KeeperHub redeemFor receipt proof", () => {
  it("accepts the exact signed call without requiring executor == owner", () => expect(() => assertRelayedClaimCalldata(encode(), proof)).not.toThrow());
  it("rejects a different amount", () => expect(() => assertRelayedClaimCalldata(encode({ ...proof, amount: 100n }), proof)).toThrow("does not match"));
  it("rejects a different market", () => expect(() => assertRelayedClaimCalldata(encode({ ...proof, marketId: `0x${"33".repeat(32)}` }), proof)).toThrow("does not match"));
});

describe("relayed claim economic proof", () => {
  const valid = { ownerRecovered: 95n, executorRecovered: 0n, outcomeBefore: 100n, outcomeAfter: 0n, collateralBefore: 1_000n, collateralAfter: 1_095n, amount: 100n };
  it("accepts a successful owner payout and exact outcome burn", () => expect(() => assertRelayedClaimEconomics(valid)).not.toThrow());
  it("rejects a successful receipt whose expected post-state is absent", () => expect(() => assertRelayedClaimEconomics({ ...valid, outcomeAfter: 1n })).toThrow("post-state"));
  it("rejects payout to the KeeperHub executor", () => expect(() => assertRelayedClaimEconomics({ ...valid, executorRecovered: 1n })).toThrow("owner"));
  it("rejects a collateral delta different from the receipt payout", () => expect(() => assertRelayedClaimEconomics({ ...valid, collateralAfter: 1_094n })).toThrow("post-state"));
});
