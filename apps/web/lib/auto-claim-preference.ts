import type { CredencePrediction } from "@credence/shared";

type SetupCandidate = Pick<
  CredencePrediction,
  "id" | "source" | "claimTransactionHash" | "autoClaimEnabled" | "autoClaimStatus" | "positionReference"
>;

export function autoClaimPreferenceEnabled(value: boolean | undefined): boolean {
  return value === true;
}

export function canUpdateAutoClaimPreference(wallet: string, authenticatedWallet: string | undefined): boolean {
  return Boolean(wallet) && wallet.toLowerCase() === authenticatedWallet?.toLowerCase();
}

export function eligibleForAutoClaimSetup(prediction: SetupCandidate): boolean {
  return prediction.source === "LIVE" && !prediction.claimTransactionHash && !prediction.autoClaimEnabled && Boolean(prediction.positionReference);
}

export function countEligibleForAutoClaimSetup(predictions: SetupCandidate[]): number {
  return predictions.filter(eligibleForAutoClaimSetup).length;
}

export function shouldAutoStartSetup(preference: boolean | undefined, prediction: SetupCandidate): boolean {
  return autoClaimPreferenceEnabled(preference) && eligibleForAutoClaimSetup(prediction);
}

export function isKeeperHubVerifiedAutoClaim(prediction: Pick<CredencePrediction, "autoClaimStatus" | "claimTransactionHash" | "keeperhubExecutionId">): boolean {
  return prediction.autoClaimStatus === "VERIFIED" && Boolean(prediction.keeperhubExecutionId);
}

export function isAutoClaimReady(prediction: Pick<CredencePrediction, "autoClaimEnabled" | "autoClaimStatus">): boolean {
  return prediction.autoClaimEnabled === true && prediction.autoClaimStatus === "READY";
}

export function turningPreferenceOffRevokesAuthorizations(): boolean {
  return false;
}

export function predictionCreationDependsOnAutoClaimSetup(): boolean {
  return false;
}
