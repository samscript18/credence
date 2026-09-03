import { getAddress, isAddress } from "viem";

export const AUTH_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function normalizeWalletAddress(address: string): string {
  if (!isAddress(address, { strict: false })) {
    throw new Error("Invalid wallet address");
  }

  return address.toLowerCase();
}

export function buildAuthMessage(address: string, nonce: string): string {
  return [
    "Sign in to Credence",
    "",
    "This signature does not trigger a blockchain transaction or cost gas.",
    "",
    `Wallet: ${getAddress(address)}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}
