"use client";

import { Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { ProfileScreen } from "@/components/profile-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function MyProfilePage() {
  const auth = useAuth();
  const { address, isConnecting, isReconnecting } = useAccount();
  // Reading public history needs no signed session. Prefer the currently
  // connected wallet over a previous wallet's still-cached auth response.
  const profileAddress = address ?? auth.data?.walletAddress;
  if (!profileAddress && (auth.isLoading || isConnecting || isReconnecting)) return <Skeleton className="h-72 rounded-2xl bg-white/[0.02]" />;
  if (!profileAddress) {
    return (
      <div className="rounded-xl border border-white/5 bg-[#0B0C0E] p-12 text-center">
        <Wallet className="mx-auto size-9 text-muted" strokeWidth={1.5} />
        <h1 className="mt-4 text-xl font-medium text-foreground">Connect your wallet to view your profile</h1>
        <p className="mt-2 text-sm text-muted">
          Connect your wallet from the top right to view your history. Sign-in is required for claims and profile edits.
        </p>
      </div>
    );
  }
  // Both routes share history, lifecycle states and owner-only claim controls.
  return <ProfileScreen key={profileAddress.toLowerCase()} address={profileAddress} />;
}
