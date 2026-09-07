import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readWalletProjectId } from "./public-wallet-env";

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "credence-wallet-env-"));
  roots.push(root);
  return root;
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true }); });
describe("public wallet configuration", () => {
  it("loads only the project ID, preferring root .env.local", () => {
    const root = fixture();
    writeFileSync(join(root, ".env"), "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=base\n");
    writeFileSync(join(root, ".env.local"), 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=" local "\nPRIVATE_KEY=private\n');
    expect(readWalletProjectId(root, {})).toBe("local");
  });
  it("preserves host or app-specific settings, including explicit disable", () => {
    const root = fixture();
    writeFileSync(join(root, ".env.local"), "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=local\n");
    expect(readWalletProjectId(root, { NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "host" })).toBe("host");
    expect(readWalletProjectId(root, { NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "" })).toBe("");
  });
  it("supports .env fallback and absent configuration", () => {
    const root = fixture();
    expect(readWalletProjectId(root, {})).toBe("");
    writeFileSync(join(root, ".env"), "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=base\n");
    expect(readWalletProjectId(root, {})).toBe("base");
  });
});
