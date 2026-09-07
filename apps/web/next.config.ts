import type { NextConfig } from "next";
import { resolve } from "node:path";
import { readWalletProjectId } from "./lib/public-wallet-env";

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  transpilePackages: ["@credence/shared"],
  env: {
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: readWalletProjectId(resolve(__dirname, "../..")),
  },
};

export default nextConfig;
