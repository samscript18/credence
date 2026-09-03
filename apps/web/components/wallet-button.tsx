"use client";

import { ChevronDown, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

import { Button } from "@/components/ui/button";

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  if (isConnected && chainId !== somniaShannon.id) {
    return (
      <Button onClick={() => switchChain({ chainId: somniaShannon.id })} disabled={isSwitching}>
        {isSwitching ? "Switching…" : "Switch to Somnia Shannon"}
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <Button
        variant="secondary"
        disabled={isPending || !connectors[0]}
        onClick={() => connectors[0] && connect({ connector: connectors[0] })}
      >
        <Wallet className="mr-2 size-4" />
        {isPending ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  return (
    <Button variant="secondary" onClick={() => disconnect()} aria-label="Disconnect wallet">
      <span className="mr-2 size-2 rounded-full bg-lime-300" />
      {address ? shortAddress(address) : "Connected"}
      <ChevronDown className="ml-2 size-4 text-neutral-500" />
    </Button>
  );
}
