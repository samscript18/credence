"use client";

import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { canUpdateAutoClaimPreference, countEligibleForAutoClaimSetup } from "@/lib/auto-claim-preference";
import { PageHeader } from "./page-header";

export function AutoClaimSettings() {
  const auth = useAuth();
  const { address } = useAccount();
  const wallet = address ?? auth.data?.walletAddress ?? "";
  const profile = useProfile(wallet);
  const update = useUpdateProfile();
  const authenticated = canUpdateAutoClaimPreference(wallet, auth.data?.walletAddress);
  const enabled = profile.data?.autoClaimPreference === true;
  const eligible = profile.data
    ? countEligibleForAutoClaimSetup([
        ...profile.data.activePredictions.flatMap((row) => (row.locked ? [] : [row])),
        ...profile.data.resolvedHistory,
      ])
    : 0;

  async function toggle() {
    if (!authenticated || update.isPending) return;
    try {
      await update.mutateAsync({ autoClaimPreference: !enabled });
    } catch {
      // The mutation state renders the error; do not leave a browser rejection.
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="These preferences only change Credence setup prompts. They never grant KeeperHub blanket authority over your positions."
      />
      <section className="max-w-xl space-y-4 rounded-xl border border-white/5 bg-[#0B0C0E] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-foreground">Auto-Claim</h2>
            <p className="mt-2 text-[13px] leading-6 text-muted">
              Automatically prepare new Credence predictions for KeeperHub redemption. You&apos;ll authorize each prediction individually. If it becomes redeemable, KeeperHub claims it automatically and sends the proceeds directly to your wallet.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`Auto-Claim ${enabled ? "on" : "off"}`}
            disabled={!authenticated || update.isPending || profile.isLoading}
            onClick={() => void toggle()}
            className={`relative mt-0.5 h-8 w-[72px] shrink-0 rounded-full border p-1 font-mono text-[9px] font-semibold tracking-[0.12em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C0E] disabled:cursor-not-allowed disabled:opacity-40 ${enabled ? "border-signal/60 bg-signal/15 text-signal shadow-[0_0_16px_rgba(155,220,255,0.16)]" : "border-white/15 bg-white/[0.04] text-muted hover:border-white/30 hover:bg-white/[0.07]"}`}
          >
            <span className={`absolute inset-y-0 flex items-center transition-opacity ${enabled ? "left-2.5 opacity-100" : "right-2.5 opacity-100"}`}>
              {enabled ? "ON" : "OFF"}
            </span>
            <span className={`absolute left-1 top-1 size-6 rounded-full border transition-all duration-200 ${enabled ? "translate-x-10 border-signal bg-signal shadow-[0_0_10px_rgba(155,220,255,0.42)]" : "translate-x-0 border-white/20 bg-white/90 shadow-sm"}`} />
          </button>
        </div>
        <p className="font-mono text-[10px] leading-5 text-muted/80">
          Default is off. Turning this on does not enroll existing predictions, sign, approve tokens, or submit a KeeperHub execution. Turning it off does not revoke Auto-Claim on predictions you already authorized.
        </p>
        {!authenticated && wallet && <p className="text-xs text-muted">Sign in with this wallet to change Auto-Claim settings.</p>}
        {!wallet && <p className="text-xs text-muted">Connect and sign in with your wallet to change Auto-Claim settings.</p>}
        {eligible > 0 && (
          <p className="font-mono text-[10px] text-muted">
            You have {eligible} existing prediction{eligible === 1 ? "" : "s"} that can be set up for Auto-Claim.
          </p>
        )}
        {update.isError && <p role="alert" className="text-xs text-down">Could not save Auto-Claim preference.</p>}
      </section>
    </div>
  );
}
