"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";

import { wagmiConfig } from "@/lib/wagmi";

const walletTheme = darkTheme({
  accentColor: "#9bdcff",
  accentColorForeground: "#04131f",
  borderRadius: "large",
  overlayBlur: "small",
});
walletTheme.fonts.body = "var(--font-satoshi), ui-sans-serif, system-ui, sans-serif";
walletTheme.colors.modalBackground = "#0f1012";
walletTheme.colors.modalBorder = "rgba(255, 255, 255, 0.1)";
walletTheme.colors.modalText = "#f5f5f5";
walletTheme.colors.modalTextSecondary = "#999999";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={walletTheme} modalSize="wide">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
