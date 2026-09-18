import { describe, expect, it } from "vitest";
import {
  autoClaimPreferenceEnabled,
  canUpdateAutoClaimPreference,
  countEligibleForAutoClaimSetup,
  eligibleForAutoClaimSetup,
  isAutoClaimReady,
  isKeeperHubVerifiedAutoClaim,
  predictionCreationDependsOnAutoClaimSetup,
  shouldAutoStartSetup,
  turningPreferenceOffRevokesAuthorizations,
} from "./auto-claim-preference";

const live = {
  id: "new-prediction",
  source: "LIVE" as const,
  positionReference: "1000000",
};

describe("global Auto-Claim preference", () => {
  it("defaults OFF", () => {
    expect(autoClaimPreferenceEnabled(undefined)).toBe(false);
    expect(autoClaimPreferenceEnabled(false)).toBe(false);
  });

  it("persisted true is ON", () => {
    expect(autoClaimPreferenceEnabled(true)).toBe(true);
  });

  it("requires a matching Credence session before saving the preference", () => {
    expect(canUpdateAutoClaimPreference("0xowner", undefined)).toBe(false);
    expect(canUpdateAutoClaimPreference("0xowner", "0xother")).toBe(false);
    expect(canUpdateAutoClaimPreference("0xOwner", "0xowner")).toBe(true);
  });

  it("OFF leaves the confirmed prediction flow unchanged", () => {
    expect(shouldAutoStartSetup(false, live)).toBe(false);
    expect(shouldAutoStartSetup(undefined, live)).toBe(false);
  });

  it("ON starts Auto-Claim setup only after a confirmed live prediction", () => {
    expect(shouldAutoStartSetup(true, live)).toBe(true);
    expect(shouldAutoStartSetup(true, { ...live, source: "DEMO_SEED" })).toBe(false);
    expect(shouldAutoStartSetup(true, { ...live, claimTransactionHash: "0xabc" })).toBe(false);
  });

  it("setup targets the exact newly created prediction", () => {
    const created = { ...live, id: "6aab9aa2e331e954813914b8" };
    expect(shouldAutoStartSetup(true, created)).toBe(true);
    expect(created.id).toBe("6aab9aa2e331e954813914b8");
  });

  it("does not silently enroll historical predictions when the toggle is enabled", () => {
    const historical = [
      { id: "old-enrolled", source: "LIVE" as const, autoClaimEnabled: true, positionReference: "1" },
      { id: "old-claimed", source: "LIVE" as const, claimTransactionHash: "0x1", positionReference: "1" },
      { id: "old-open", source: "LIVE" as const, positionReference: "1" },
    ];
    expect(countEligibleForAutoClaimSetup(historical)).toBe(1);
    expect(eligibleForAutoClaimSetup(historical[0]!)).toBe(false);
    expect(shouldAutoStartSetup(true, historical[0]!)).toBe(false);
  });

  it("turning the preference OFF does not revoke existing authorizations", () => {
    expect(turningPreferenceOffRevokesAuthorizations()).toBe(false);
  });

  it("rejected approval, rejected signature, or failed setup leave the prediction usable", () => {
    expect(predictionCreationDependsOnAutoClaimSetup()).toBe(false);
    expect(shouldAutoStartSetup(true, live)).toBe(true);
  });

  it("ordinary manual claims are not labeled Auto-Claim", () => {
    expect(isKeeperHubVerifiedAutoClaim({ claimTransactionHash: "0xmanual" })).toBe(false);
    expect(isKeeperHubVerifiedAutoClaim({ claimTransactionHash: "0xmanual", autoClaimStatus: "VERIFIED" })).toBe(false);
  });

  it("hides manual claiming only while a prediction is Auto-Claim Ready", () => {
    expect(isAutoClaimReady({ autoClaimEnabled: true, autoClaimStatus: "READY" })).toBe(true);
    expect(isAutoClaimReady({ autoClaimEnabled: true, autoClaimStatus: "FAILED" })).toBe(false);
    expect(isAutoClaimReady({ autoClaimEnabled: false, autoClaimStatus: "READY" })).toBe(false);
  });

  it("keeps the successful verified Auto-Claim presentation", () => {
    expect(isKeeperHubVerifiedAutoClaim({
      autoClaimStatus: "VERIFIED",
      claimTransactionHash: "0x5bf4ec934fb613e7cde312ed7686614ba1a379207234c6eab3cad0f0e6b52000",
      keeperhubExecutionId: "9m45szijwukq6ua8oxg6b",
    })).toBe(true);
  });
});
