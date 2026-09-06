// Offline key generation. Never prints the secret or replaces an existing key.
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { parseEnv } from "node:util";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const path = new URL("../.env.local", import.meta.url);
const original = readFileSync(path, "utf8");
const env = parseEnv(original);
const key = env.REFUND_WORKER_PRIVATE_KEY || generatePrivateKey();
const account = privateKeyToAccount(key);
if (!env.REFUND_WORKER_PRIVATE_KEY) {
	const line = `REFUND_WORKER_PRIVATE_KEY=${key}`;
	const updated = /^REFUND_WORKER_PRIVATE_KEY=.*$/m.test(original) ? original.replace(/^REFUND_WORKER_PRIVATE_KEY=.*$/m, line) : `${original.trimEnd()}\n${line}\n`;
	writeFileSync(path, updated, { mode: 0o600 });
}
chmodSync(path, 0o600);
console.log(JSON.stringify({ address: account.address, created: !env.REFUND_WORKER_PRIVATE_KEY, keySavedTo: ".env.local" }));
