"use client";

import { ChevronDown, Wallet } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useConnect, useDisconnect, useSignMessage, useSwitchChain } from "wagmi";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

import { Button } from "@/components/ui/button";
import { authKey, useAuth } from "@/hooks/use-auth";
import { authService } from "@/services/auth.service";
import { apiErrorMessage } from "@/services/api";
import { Toast } from "./ui/toast";

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
  const auth = useAuth();
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
    return <>
      <Button className="px-3 sm:px-4" onClick={() => switchChain({ chainId: somniaShannon.id })} disabled={isSwitching}>
        {isSwitching ? "Switching…" : <><span className="sm:hidden">Switch network</span><span className="hidden sm:inline">Switch to Somnia Shannon</span></>}
      </Button>
      {switchError ? <Toast message={apiErrorMessage(switchError)} /> : null}
    </>;
  }

  if (!isConnected) {
    return <>
      <Button
        variant="secondary"
        disabled={isPending || !connectors[0]}
        onClick={() => connectors[0] && connect({ connector: connectors[0] })}
      >
        <Wallet className="mr-1.5 size-4 sm:mr-2" />
        {isPending ? "Connecting…" : <><span className="sm:hidden">Connect</span><span className="hidden sm:inline">Connect wallet</span></>}
      </Button>
      {connectError ? <Toast message={apiErrorMessage(connectError)} /> : null}
    </>;
  }

  if (!auth.data || auth.data.walletAddress !== address?.toLowerCase()) {
    return <>
      <Button onClick={() => signIn.mutate()} disabled={signIn.isPending || auth.isLoading}>
        <Wallet className="mr-2 size-4" />
        {signIn.isPending ? "Check wallet…" : <><span className="sm:hidden">Sign in</span><span className="hidden sm:inline">Sign in with wallet</span></>}
      </Button>
      {signIn.error ? <Toast message={apiErrorMessage(signIn.error)} /> : null}
    </>;
  }

  return (
    <Button variant="secondary" onClick={() => { void authService.logout(); queryClient.removeQueries({ queryKey: authKey }); disconnect(); }} aria-label="Disconnect wallet">
      <span className="mr-2 size-2 rounded-full bg-lime-300" />
      {address ? shortAddress(address) : "Connected"}
      <ChevronDown className="ml-2 size-4 text-neutral-500" />
    </Button>
  );
}
