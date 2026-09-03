"use client";

import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { injected } from "@wagmi/connectors/injected";
import { createConfig, http } from "wagmi";

const rpcUrl = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ?? somniaShannon.rpcUrls.default.http[0];

export const wagmiConfig = createConfig({
  chains: [somniaShannon],
  connectors: [injected()],
  ssr: true,
  transports: {
    [somniaShannon.id]: http(rpcUrl),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
