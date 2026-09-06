"use client";

import { ChevronDown, Copy, ExternalLink, LogOut, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useConnect, useDisconnect, useSignMessage, useSwitchChain } from "wagmi";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

import { Button } from "@/components/ui/button";
import { authKey, useAuth } from "@/hooks/use-auth";
import { authService } from "@/services/auth.service";
import { apiErrorMessage } from "@/services/api";
import { Toast } from "./ui/toast";
import { PredictorAvatar } from "./predictor-avatar";

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function WalletButton() {
  const [copied, setCopied] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
  const auth = useAuth();
  const profile = useProfile(address ?? "");
  const queryClient = useQueryClient();
  const signIn = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Connect a wallet first.");
      const challenge = await authService.nonce(address);
      const signature = await signMessageAsync({ message: challenge.message });
      return authService.verify({ address, nonce: challenge.nonce, signature });
    },
    onSuccess: (user) => queryClient.setQueryData(authKey, user),
  });

  if (isConnected && chainId !== somniaShannon.id) {
    return (
      <>
        <Button
          className="rounded-full px-4 text-xs font-medium"
          onClick={() => switchChain({ chainId: somniaShannon.id })}
          disabled={isSwitching}
        >
          {isSwitching ? "Switching…" : <><span className="sm:hidden">Switch</span><span className="hidden sm:inline">Switch to Somnia Shannon</span></>}
        </Button>
        {switchError ? <Toast message={apiErrorMessage(switchError)} /> : null}
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <button
          type="button"
          disabled={isPending || !connectors[0]}
          onClick={() => connectors[0] && connect({ connector: connectors[0] })}
          className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-black transition-all duration-200 ease-out hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-40"
        >
          <Wallet className="size-3.5" />
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {connectError ? <Toast message={apiErrorMessage(connectError)} /> : null}
      </>
    );
  }

  if (!auth.data || auth.data.walletAddress !== address?.toLowerCase()) {
    return (
      <>
        <button
          type="button"
          onClick={() => signIn.mutate()}
          disabled={signIn.isPending || auth.isLoading}
          className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-signal px-4 py-2 text-sm font-medium text-[#04131f] transition-all duration-200 ease-out hover:bg-signal/90 active:scale-[0.98] disabled:opacity-40"
        >
          <Wallet className="size-3.5" />
          {signIn.isPending ? "Check wallet…" : "Sign in with wallet"}
        </button>
        {signIn.error ? <Toast message={apiErrorMessage(signIn.error)} /> : null}
      </>
    );
  }

  return (
    <details
      className="group relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 text-[12px] font-medium transition-colors hover:border-white/10 hover:bg-white/[0.05] [&::-webkit-details-marker]:hidden">
        <PredictorAvatar address={address ?? ""} name={profile.data?.displayName} avatarUrl={profile.data?.avatarUrl} className="size-5" />
        <span className="max-w-32 truncate font-mono text-[11px] text-foreground/90">{profile.data?.displayName || (address ? shortAddress(address) : "Connected")}</span>
        <span className="hidden rounded-sm border border-white/10 bg-white/[0.03] px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-muted sm:inline">Shannon</span>
        <ChevronDown className="size-3 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-white/10 bg-[#0F1012] p-1.5 shadow-2xl backdrop-blur-md">
        <Link
          href={`/profile/${address}`}
          className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <UserRound className="size-4 text-muted" />
          Profile
        </Link>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground"
          onClick={() => {
            if (address) {
              void navigator.clipboard
                .writeText(address)
                .then(() => setCopied(true))
                .catch(() => setMenuError("Address could not be copied. Please try again."));
            }
          }}
        >
          <Copy className="size-4 text-muted" />
          {copied ? "Address copied" : "Copy address"}
        </button>
        <a
          href={`${somniaShannon.blockExplorers.default.url}/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <ExternalLink className="size-4 text-muted" />
          View on explorer
        </a>
        <div className="my-1 border-t border-white/5" />
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-rose-400 transition-colors hover:bg-white/[0.04]"
          onClick={() => {
            void authService
              .logout()
              .catch(() => setMenuError("Wallet disconnected. Session sign-out could not be confirmed."));
            queryClient.removeQueries({ queryKey: authKey });
            disconnect();
          }}
        >
          <LogOut className="size-4" />
          Disconnect
        </button>
      </div>
      {menuError ? <Toast message={menuError} /> : null}
    </details>
  );
}
