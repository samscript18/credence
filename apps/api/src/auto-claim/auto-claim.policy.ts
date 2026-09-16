import { encodePacked, keccak256, type Address, type Hex } from "viem";

export type AutoClaimReason =
  | "REDEEMABLE_WINNER" | "REDEEMABLE_VOID_UP" | "REDEEMABLE_VOID_DOWN"
  | "MARKET_NOT_FINAL" | "LOSING_POSITION" | "NO_REDEEMABLE_BALANCE"
  | "MISSING_AUTHORIZATION" | "INVALID_AUTHORIZATION" | "EXPIRED_AUTHORIZATION"
  | "MISSING_TOKEN_APPROVAL" | "DUPLICATE_EXECUTION" | "POSITION_STATE_CHANGED"
  | "MARKET_BINDING_MISMATCH" | "ZERO_PAYOUT";

export type EligibilityInput = {
  expectedMarketAddress: Address;
  actualMarketAddress: Address;
  finalized: boolean;
  resolved: boolean;
  voided: boolean;
  payoutNumerators: readonly bigint[];
  outcomeIdx: 0 | 1;
  balance: bigint;
  amount: bigint;
  authorization: "READY" | "MISSING" | "INVALID" | "EXPIRED";
  approved: boolean;
  duplicate: boolean;
  positionChanged?: boolean;
};

export type EligibilityDecision = { eligible: boolean; code: AutoClaimReason; expectedPayout: bigint };

export function evaluateAutoClaim(input: EligibilityInput): EligibilityDecision {
  const refuse = (code: AutoClaimReason): EligibilityDecision => ({ eligible: false, code, expectedPayout: 0n });
  if (input.actualMarketAddress.toLowerCase() !== input.expectedMarketAddress.toLowerCase()) return refuse("MARKET_BINDING_MISMATCH");
  if (!input.finalized || (!input.resolved && !input.voided)) return refuse("MARKET_NOT_FINAL");
  if (input.authorization !== "READY") return refuse(input.authorization === "MISSING" ? "MISSING_AUTHORIZATION" : input.authorization === "EXPIRED" ? "EXPIRED_AUTHORIZATION" : "INVALID_AUTHORIZATION");
  if (input.duplicate) return refuse("DUPLICATE_EXECUTION");
  if (input.positionChanged) return refuse("POSITION_STATE_CHANGED");
  if (input.amount <= 0n || input.balance === 0n) return refuse("NO_REDEEMABLE_BALANCE");
  if (input.balance < input.amount) return refuse("POSITION_STATE_CHANGED");
  const vector = input.payoutNumerators;
  if (vector.length !== 2 || vector.some(value => value < 0n)) return refuse("MARKET_NOT_FINAL");
  const total = vector[0]! + vector[1]!;
  if (total <= 0n) return refuse("MARKET_NOT_FINAL");
  if (!input.voided && vector[input.outcomeIdx] === 0n) return refuse("LOSING_POSITION");
  const expectedPayout = input.amount * vector[input.outcomeIdx]! / total;
  if (expectedPayout <= 0n) return refuse("ZERO_PAYOUT");
  if (!input.approved) return refuse("MISSING_TOKEN_APPROVAL");
  return { eligible: true, code: input.voided ? input.outcomeIdx === 0 ? "REDEEMABLE_VOID_UP" : "REDEEMABLE_VOID_DOWN" : "REDEEMABLE_WINNER", expectedPayout };
}

export function redemptionKey(input: { predictionId: string; chainId: number; owner: Address; marketId: Hex; outcomeId: bigint; amount: bigint }): Hex {
  // Prediction identity disambiguates two legitimate fills of the same size in one market.
  return keccak256(encodePacked(
    ["string", "uint256", "address", "bytes32", "uint256", "uint256"],
    [input.predictionId, BigInt(input.chainId), input.owner, input.marketId, input.outcomeId, input.amount],
  ));
}
