import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

// Only this public value may cross from the root env files into Next's bundle.
// Never pass a parsed root env object to nextConfig.env.
export function readWalletProjectId(root: string, env: Record<string, string | undefined> = process.env): string {
  const key = "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID";
  if (env[key] !== undefined) return env[key]!.trim();
  for (const name of [".env.local", ".env"]) {
    const path = resolve(root, name);
    if (!existsSync(path)) continue;
    const value = parseEnv(readFileSync(path, "utf8"))[key];
    if (value !== undefined) return value.trim();
  }
  return "";
}
