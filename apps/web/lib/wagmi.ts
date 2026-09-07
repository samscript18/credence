"use client";

import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet, okxWallet, metaMaskWallet, rainbowWallet,
  coinbaseWallet, trustWallet, rabbyWallet, walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";

const rpcUrl = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ?? somniaShannon.rpcUrls.default.http[0];

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
const config = {
  chains: [somniaShannon] as const,
  multiInjectedProviderDiscovery: true,
  ssr: true,
  transports: {
    [somniaShannon.id]: http(rpcUrl),
  },
};

export const wagmiConfig = createConfig({
      ...config,
      connectors: connectorsForWallets(
        projectId ? [
          { groupName: "Connect a wallet", wallets: [okxWallet, metaMaskWallet, walletConnectWallet, rainbowWallet] },
          { groupName: "More wallets", wallets: [coinbaseWallet, trustWallet, rabbyWallet, injectedWallet] },
        ] : [{ groupName: "Browser wallets", wallets: [injectedWallet] }],
        { appName: "Credence", projectId: projectId ?? "" },
      ),
    });

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
