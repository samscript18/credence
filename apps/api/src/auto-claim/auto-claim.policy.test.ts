import { describe, expect, it } from "vitest";
import { evaluateAutoClaim, redemptionKey, type EligibilityInput } from "./auto-claim.policy.js";

const market = "0x1111111111111111111111111111111111111111" as const;
const base: EligibilityInput = {
  expectedMarketAddress: market, actualMarketAddress: market, finalized: true, resolved: true, voided: false,
  payoutNumerators: [10n, 0n], outcomeIdx: 0, balance: 100n, amount: 100n,
  authorization: "READY", approved: true, duplicate: false,
};
const decide = (overrides: Partial<EligibilityInput> = {}) => evaluateAutoClaim({ ...base, ...overrides });

describe("Auto-Claim deterministic eligibility", () => {
  it("allows a resolved UP winner", () => expect(decide()).toEqual({ eligible: true, code: "REDEEMABLE_WINNER", expectedPayout: 100n }));
  it("allows a resolved DOWN winner", () => expect(decide({ payoutNumerators: [0n, 10n], outcomeIdx: 1 })).toMatchObject({ eligible: true, code: "REDEEMABLE_WINNER" }));
  it("refuses UP resolution when only DOWN is authorized", () => expect(decide({ outcomeIdx: 1 })).toMatchObject({ eligible: false, code: "LOSING_POSITION" }));
  it("refuses DOWN resolution when only UP is authorized", () => expect(decide({ payoutNumerators: [0n, 10n] })).toMatchObject({ eligible: false, code: "LOSING_POSITION" }));
  it("refuses zero outcome balance", () => expect(decide({ balance: 0n })).toMatchObject({ code: "NO_REDEEMABLE_BALANCE" }));
  it("refuses a trading market", () => expect(decide({ finalized: false, resolved: false })).toMatchObject({ code: "MARKET_NOT_FINAL" }));
  it("refuses a locked but non-final market", () => expect(decide({ finalized: false })).toMatchObject({ code: "MARKET_NOT_FINAL" }));
  it("allows void UP with its actual payout fraction", () => expect(decide({ voided: true, resolved: false, payoutNumerators: [3n, 7n], outcomeIdx: 0 })).toEqual({ eligible: true, code: "REDEEMABLE_VOID_UP", expectedPayout: 30n }));
  it("allows void DOWN with its actual payout fraction", () => expect(decide({ voided: true, resolved: false, payoutNumerators: [3n, 7n], outcomeIdx: 1 })).toEqual({ eligible: true, code: "REDEEMABLE_VOID_DOWN", expectedPayout: 70n }));
  it("evaluates both void sides independently", () => {
    expect(decide({ voided: true, resolved: false, payoutNumerators: [5n, 5n], outcomeIdx: 0 }).eligible).toBe(true);
    expect(decide({ voided: true, resolved: false, payoutNumerators: [5n, 5n], outcomeIdx: 1 }).eligible).toBe(true);
  });
  it("refuses missing authorization", () => expect(decide({ authorization: "MISSING" })).toMatchObject({ code: "MISSING_AUTHORIZATION" }));
  it("refuses invalid authorization", () => expect(decide({ authorization: "INVALID" })).toMatchObject({ code: "INVALID_AUTHORIZATION" }));
  it("refuses expired authorization", () => expect(decide({ authorization: "EXPIRED" })).toMatchObject({ code: "EXPIRED_AUTHORIZATION" }));
  it("refuses a duplicate pending or confirmed execution", () => expect(decide({ duplicate: true })).toMatchObject({ code: "DUPLICATE_EXECUTION" }));
  it("refuses when a manual claim changed the position before submission", () => expect(decide({ positionChanged: true, balance: 0n })).toMatchObject({ code: "POSITION_STATE_CHANGED" }));
  it("refuses exact market binding mismatch", () => expect(decide({ actualMarketAddress: "0x2222222222222222222222222222222222222222" })).toMatchObject({ code: "MARKET_BINDING_MISMATCH" }));
  it("uses the supplied chain snapshot rather than indexed result", () => expect(decide({ finalized: false, resolved: false })).toMatchObject({ eligible: false, code: "MARKET_NOT_FINAL" }));
  it("refuses when current balance is below the signed amount", () => expect(decide({ balance: 99n })).toMatchObject({ code: "POSITION_STATE_CHANGED" }));
  it("refuses when the exact outcome allowance is absent", () => expect(decide({ approved: false })).toMatchObject({ code: "MISSING_TOKEN_APPROVAL" }));
  it("refuses an outcome whose payout vector is zero", () => expect(decide({ voided: true, resolved: false, payoutNumerators: [0n, 10n], outcomeIdx: 0 })).toMatchObject({ code: "ZERO_PAYOUT" }));
});

describe("redemption idempotency key", () => {
  const fields = { predictionId: "prediction-a", chainId: 50312, owner: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const, marketId: `0x${"01".repeat(32)}` as const, outcomeId: 7n, amount: 10n };
  it("is deterministic for retries", () => expect(redemptionKey(fields)).toBe(redemptionKey({ ...fields })));
  it("does not collide across predictions in one reused pool/market", () => expect(redemptionKey(fields)).not.toBe(redemptionKey({ ...fields, predictionId: "prediction-b" })));
  it("does not collide across exact markets", () => expect(redemptionKey(fields)).not.toBe(redemptionKey({ ...fields, marketId: `0x${"02".repeat(32)}` })));
  it("does not collide across outcome IDs", () => expect(redemptionKey(fields)).not.toBe(redemptionKey({ ...fields, outcomeId: 8n })));
});
