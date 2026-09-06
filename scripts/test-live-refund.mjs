// Shannon-only smoke test. Uses a clearly synthetic, controllable TestWindow;
// no fabricated Credence prediction or DreamDEX market is published.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { createPublicClient, createWalletClient, encodeDeployData, encodeFunctionData, erc20Abi, formatUnits, http, keccak256, parseAbi, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { ConfigService } from "@nestjs/config";
import mongoose from "mongoose";
import { RefundWorkerService } from "../apps/api/dist/unlocks/refund-worker.service.js";
import { RefundJobSchema, RefundWorkerStateSchema } from "../apps/api/dist/unlocks/refund-worker.schema.js";

const env = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
const account = privateKeyToAccount(env.REFUND_WORKER_PRIVATE_KEY);
const transport = http(env.SOMNIA_RPC_URL, { timeout: 15000, retryCount: 1 });
const client = createPublicClient({ chain: somniaShannon, transport });
const wallet = createWalletClient({ account, chain: somniaShannon, transport });
const artifact = JSON.parse(readFileSync(new URL("../contracts/out/InsightEscrow.sol/InsightEscrow.json", import.meta.url), "utf8"));
const testArtifact = JSON.parse(readFileSync(new URL("../contracts/out/InsightEscrow.t.sol/TestWindow.json", import.meta.url), "utf8"));
const escrow = env.UNLOCK_ESCROW_ADDRESS;
const price = BigInt(env.UNLOCK_PRICE_BASE_UNITS);
const cap = "50000000000000000"; // Explicit test-only maximum: 0.05 STT/refund.
const path = new URL("../.local-operations/live-refund-test.json", import.meta.url);
const record = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { escrow, buyer: account.address, prediction: keccak256(stringToHex(`credence-synthetic-refund-smoke:${escrow}:${account.address}`)), transactions: {} };
const save = () => writeFileSync(path, JSON.stringify(record, null, 2), { mode: 0o600 });
let connection;
async function sendOnce(label, request) {
	let tx = record.transactions[label];
	if (!tx) {
		const prepared = await wallet.prepareTransactionRequest({ account, ...request });
		const fee = prepared.maxFeePerGas ?? prepared.gasPrice;
		if (prepared.gas * fee > BigInt(cap) * 4n) throw new Error("TEST_TRANSACTION_FEE_CAP");
		const raw = await wallet.signTransaction(prepared);
		tx = { hash: keccak256(raw), raw };
		record.transactions[label] = tx;
		save();
	}
	let receipt = await client.getTransactionReceipt({ hash: tx.hash }).catch(() => null);
	if (!receipt) {
		await client.sendRawTransaction({ serializedTransaction: tx.raw }).catch(() => undefined);
		receipt = await client.waitForTransactionReceipt({ hash: tx.hash, confirmations: 2, timeout: 120000 });
	}
	if (receipt.status !== "success") throw new Error("TEST_TRANSACTION_REVERTED");
	console.log(JSON.stringify({ stage: label, transactionHash: tx.hash }));
	return receipt;
}
try {
	if ((await client.getChainId()) !== 50312 || env.SOMNIA_CHAIN_ID !== "50312") throw new Error("WRONG_CHAIN");
	if (env.ENABLE_AUTO_UNLOCK_REFUNDS === "true") throw new Error("PAUSE_BACKGROUND_WORKER_FOR_TEST");
	if (record.escrow !== escrow || record.buyer !== account.address) throw new Error("TEST_CONFIG_CHANGED");
	const token = await client.readContract({ address: escrow, abi: artifact.abi, functionName: "token" });
	const configuredPrice = await client.readContract({ address: escrow, abi: artifact.abi, functionName: "price" });
	if (token.toLowerCase() !== env.UNLOCK_TOKEN_ADDRESS.toLowerCase() || configuredPrice !== price) throw new Error("ESCROW_CONFIG_MISMATCH");
	const balance = await client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
	if (!record.transactions.deposit && balance < price) {
		console.log(
			JSON.stringify({
				needsFunding: true,
				wallet: account.address,
				token: env.UNLOCK_TOKEN_SYMBOL,
				required: formatUnits(price, Number(env.UNLOCK_TOKEN_DECIMALS)),
				balance: formatUnits(balance, Number(env.UNLOCK_TOKEN_DECIMALS)),
			}),
		);
		process.exit(2);
	}
	if (record.beforeBalance === undefined) {
		record.beforeBalance = balance.toString();
		save();
	}
	const deployment = await sendOnce("synthetic-window", { data: encodeDeployData({ abi: testArtifact.abi, bytecode: testArtifact.bytecode.object }) });
	const market = deployment.contractAddress;
	const expiry = await client.readContract({ address: market, abi: parseAbi(["function expiry() view returns (uint64)"]), functionName: "expiry" });
	await sendOnce("approve-exact-price", { to: token, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [escrow, price] }) });
	const deposit = await sendOnce("deposit", { to: escrow, data: encodeFunctionData({ abi: artifact.abi, functionName: "deposit", args: [record.prediction, escrow, market, expiry] }) });
	await sendOnce("close-synthetic-window", { to: market, data: encodeFunctionData({ abi: parseAbi(["function close()"]), functionName: "close" }) });
	// Exercise the actual worker with isolated DEV audit collections. It discovers
	// the deposit from logs, signs, broadcasts and reconciles without a browser.
	connection = await mongoose.createConnection(env.MONGODB_URI_DEV, { serverSelectionTimeoutMS: 15000 }).asPromise();
	const jobs = connection.model("RefundJob", RefundJobSchema);
	const states = connection.model("RefundWorkerState", RefundWorkerStateSchema);
	await Promise.all([jobs.init(), states.init()]);
	const config = new ConfigService({ ...env, ENABLE_AUTO_UNLOCK_REFUNDS: "true", UNLOCK_ESCROW_START_BLOCK: deposit.blockNumber.toString(), REFUND_MAX_TX_COST_WEI: cap });
	const worker = new RefundWorkerService(config, jobs, states);
	const key = `${escrow.toLowerCase()}:${record.prediction}:${account.address.toLowerCase()}`;
	for (let tick = 0; tick < 12; tick++) {
		await worker.poll();
		const job = await jobs.findOne({ key }).lean();
		console.log(JSON.stringify({ workerTick: tick + 1, state: job?.state ?? "discovering", transactionHash: job?.transactionHash }));
		if (job?.state === "submitted") await client.waitForTransactionReceipt({ hash: job.transactionHash, confirmations: 3, timeout: 60000 });
		if (job?.state === "refunded") {
			record.refundHash = job.transactionHash;
			break;
		}
	}
	const payment = await client.readContract({ address: escrow, abi: artifact.abi, functionName: "payments", args: [record.prediction, account.address] });
	const finalBalance = await client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
	if (payment[3] !== 3 || !record.refundHash || finalBalance < BigInt(record.beforeBalance)) throw new Error("REFUND_NOT_YET_VERIFIED");
	record.verified = true;
	record.finalBalance = finalBalance.toString();
	save();
	console.log(
		JSON.stringify({
			verified: true,
			refundedAmount: formatUnits(price, Number(env.UNLOCK_TOKEN_DECIMALS)),
			token: env.UNLOCK_TOKEN_SYMBOL,
			buyer: account.address,
			refundHash: record.refundHash,
			syntheticWindow: market,
			database: connection.name,
			backgroundWorkerStillDisabled: true,
		}),
	);
} catch (error) {
	console.error(JSON.stringify({ failed: /^[A-Z_]+$/.test(error.message) ? error.message : error.name, note: "Durable test transactions are reused on retry; no private keys printed." }));
	process.exitCode = 1;
} finally {
	await connection?.close();
}
