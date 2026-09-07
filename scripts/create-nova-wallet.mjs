import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
const path = new URL('../.env.local', import.meta.url);
const original = readFileSync(path, 'utf8');
const env = parseEnv(original);
const key = env.NOVA_DEMO_PRIVATE_KEY || generatePrivateKey();
const account = privateKeyToAccount(key);
if (!env.NOVA_DEMO_PRIVATE_KEY) {
  const line = `NOVA_DEMO_PRIVATE_KEY=${key}`;
  const updated = /^NOVA_DEMO_PRIVATE_KEY=.*$/m.test(original) ? original.replace(/^NOVA_DEMO_PRIVATE_KEY=.*$/m, line) : `${original.trimEnd()}\n${line}\n`;
  writeFileSync(path, updated, { mode: 0o600 });
}
chmodSync(path, 0o600);
console.log(JSON.stringify({ address: account.address, created: !env.NOVA_DEMO_PRIVATE_KEY, keySavedTo: '.env.local', purpose: 'Nova testnet demo predictor, separate from refund worker' }));
