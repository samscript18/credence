import type { Metadata } from "next";
import { DreamDexFaucet } from "@/components/test-token-faucet";

export const metadata: Metadata = { title: "Test token faucet" };

export default function FaucetPage() {
  return <DreamDexFaucet />;
}
