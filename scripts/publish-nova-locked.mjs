// One approved minimum ETH UP demo trade, never a recurring trading worker.
// Uses normal wallet-authenticated draft/confirmation endpoints; durable signed
// bytes prevent a retry from placing another order. No keys/cookies are printed.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { ConfigService } from '@nestjs/config';
import { binaryPoolWriteAbi } from '@somnia-chain/markets-sdk';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';
import { createPublicClient, createWalletClient, encodeFunctionData, erc20Abi, http, keccak256, parseUnits, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { DreamDexService } from '../apps/api/dist/dreamdex/dreamdex.service.js';
const env = parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8'));
const account = privateKeyToAccount(env.NOVA_DEMO_PRIVATE_KEY);
const client = createPublicClient({ chain: somniaShannon, transport: http(env.SOMNIA_RPC_URL) });
const wallet = createWalletClient({ account, chain: somniaShannon, transport: http(env.SOMNIA_RPC_URL) });
const dex = new DreamDexService(new ConfigService(env));
const path = new URL('../.local-operations/nova-publication.json', import.meta.url);
const record = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { wallet: account.address, transactions: {} };
const save = () => writeFileSync(path, JSON.stringify(record, null, 2), { mode: 0o600 });
let cookie = '';
async function api(route, body) {
  const response = await fetch(`http://localhost:${env.PORT || 4000}${route}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Cookie: cookie }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error(`API_${response.status}`);
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  return (await response.json()).data;
}
async function sendOnce(label, request) {
  let tx = record.transactions[label];
  if (!tx) {
    const prepared = await wallet.prepareTransactionRequest({ account, ...request });
    if (prepared.gas * (prepared.maxFeePerGas ?? prepared.gasPrice) > 100000000000000000n) throw new Error('GAS_CAP_EXCEEDED');
    const raw = await wallet.signTransaction(prepared);
    tx = { hash: keccak256(raw), raw }; record.transactions[label] = tx; save();
  }
  let receipt = await client.getTransactionReceipt({ hash: tx.hash }).catch(() => null);
  if (!receipt) {
    await client.sendRawTransaction({ serializedTransaction: tx.raw }).catch(() => undefined);
    receipt = await client.waitForTransactionReceipt({ hash: tx.hash, confirmations: 2, timeout: 120000 });
  }
  if (receipt.status !== 'success') throw new Error('TRANSACTION_REVERTED_NO_RETRADE');
  console.log(JSON.stringify({ stage: label, transactionHash: tx.hash }));
  return tx.hash;
}
try {
  if (env.SOMNIA_CHAIN_ID !== '50312' || await client.getChainId() !== 50312 || env.MONGODB_CONNECTION_KEY !== 'MONGODB_URI_DEV' || record.wallet !== account.address) throw new Error('CONFIG_MISMATCH');
  const nonce = await api(`/auth/nonce?address=${account.address}`);
  await api('/auth/verify', { address: account.address, nonce: nonce.nonce, signature: await account.signMessage({ message: nonce.message }) });
  if (!record.draft) {
    const market = (await dex.listEventMarkets()).find(m => m.underlying === 'ETH' && Date.parse(m.expiryAt) - Date.now() > 40 * 86400000 && Date.parse(m.expiryAt) - Date.now() < 44 * 86400000);
    if (!market || !market.minimumQuantity || market.minimumQuantity > 0.001) throw new Error('REQUESTED_LONG_WINDOW_UNAVAILABLE');
    await dex.assertTradingWindow(market.marketId, market.marketAddress);
    const balance = await client.readContract({ address: market.collateralTokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
    if (balance < parseUnits('0.001', market.collateralDecimals) || await client.getBalance({ address: account.address }) === 0n) throw new Error('NOVA_NEEDS_STT_AND_TUSDC');
    record.market = market;
    record.draft = await api('/predictions/draft', { marketId: market.marketId, direction: 'UP', confidence: 60, visibility: 'LOCKED', stakeAmount: String(market.minimumQuantity), reasoning: 'Testnet onboarding demonstration, not investment advice. Nova’s Verified qualification comes from seeded demo history, not earned live performance. This illustrative ETH UP forecast uses 60% confidence to demonstrate escrow reveal and same-window backing; it is not based on a researched market edge.' });
    save();
  }
  const m = record.market;
  if (!record.transactions.trade) {
    const quantity = parseUnits(record.draft.stakeAmount, m.baseDecimals);
    // A BUY_YES cannot cost more than full collateral quantity; this bounded
    // allowance covers only the minimum lot, not an unlimited token allowance.
    await sendOnce('approval', { to: m.collateralTokenAddress, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [m.poolAddress, quantity] }) });
    await dex.assertTradingWindow(record.draft.marketId, record.draft.marketAddress);
    const q = await dex.getMarketProbabilities(record.draft.marketId);
    if (q.bestYesAsk == null || q.bestYesAsk <= 0 || q.bestYesAsk >= 0.98) throw new Error('NO_EXECUTABLE_QUOTE');
    const exchange = dex.getExchange();
    const p = exchange.priceToPrecision(m.yesSymbol, Math.min(0.999, q.bestYesAsk + 0.02));
    const args = [0, parseUnits(p.toFixed(m.collateralDecimals), m.collateralDecimals), quantity, BigInt(Date.parse(m.expiryAt)) * 1000000n, 2, 0, zeroAddress, 0n, 0n];
    await client.simulateContract({ account, address: m.poolAddress, abi: binaryPoolWriteAbi, functionName: 'placeBinaryOrder', args });
    await sendOnce('trade', { to: m.poolAddress, data: encodeFunctionData({ abi: binaryPoolWriteAbi, functionName: 'placeBinaryOrder', args }) });
  } else {
    await sendOnce('trade');
  }
  const prediction = await api(`/predictions/draft/${record.draft.id}/confirm`, { transactionHash: record.transactions.trade.hash });
  record.predictionId = prediction.id; save();
  console.log(JSON.stringify({ predictionId: prediction.id, marketId: prediction.marketId, expiry: prediction.marketExpiryAt, status: prediction.status, marketStatus: prediction.marketStatus, visibility: prediction.visibility, transactionHash: prediction.transactionHash, profile: `/profile/${account.address}` }));
  process.exit(0);
} catch (e) { console.error(JSON.stringify({ failed: /^[A-Z_0-9]+$/.test(e.message) ? e.message : e.name, note: 'Retry this script only; saved signed transactions are reused. No secrets printed.' })); process.exit(1); }
