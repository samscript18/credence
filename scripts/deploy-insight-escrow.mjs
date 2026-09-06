import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { createPublicClient, createWalletClient, encodeDeployData, erc20Abi, formatEther, formatUnits, http, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

const envPath = new URL("../.env.local", import.meta.url);
const env = parseEnv(readFileSync(envPath, "utf8"));
const account = privateKeyToAccount(env.REFUND_WORKER_PRIVATE_KEY);
const transport = http(env.SOMNIA_RPC_URL || somniaShannon.rpcUrls.default.http[0], { timeout: 15000, retryCount: 1 });
const client = createPublicClient({ chain: somniaShannon, transport });
const wallet = createWalletClient({ account, chain: somniaShannon, transport });
const artifact = JSON.parse(readFileSync(new URL("../contracts/out/InsightEscrow.sol/InsightEscrow.json", import.meta.url), "utf8"));
const args = [env.UNLOCK_TOKEN_ADDRESS, BigInt(env.UNLOCK_PRICE_BASE_UNITS)];
const recordPath = new URL("../.local-operations/escrow-deployment.json", import.meta.url);
const save = (record) => writeFileSync(recordPath, JSON.stringify(record, null, 2), { mode: 0o600 });
function setEnv(values) {
	let text = readFileSync(envPath, "utf8");
	for (const [key, value] of Object.entries(values)) {
		const pattern = new RegExp(`^${key}=.*$`, "m");
		text = pattern.test(text) ? text.replace(pattern, `${key}=${value}`) : `${text.trimEnd()}\n${key}=${value}\n`;
	}
	writeFileSync(envPath, text, { mode: 0o600 });
}
try {
	if ((await client.getChainId()) !== 50312 || env.SOMNIA_CHAIN_ID !== "50312") throw new Error("WRONG_CHAIN");
	if (env.ENABLE_AUTO_UNLOCK_REFUNDS === "true") throw new Error("PAUSE_WORKER_BEFORE_DEPLOYMENT_SIGNER_USE");
	const [decimals, symbol, balance, tokens] = await Promise.all([
		client.readContract({ address: args[0], abi: erc20Abi, functionName: "decimals" }),
		client.readContract({ address: args[0], abi: erc20Abi, functionName: "symbol" }),
		client.getBalance({ address: account.address }),
		client.readContract({ address: args[0], abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
	]);
	if (String(decimals) !== env.UNLOCK_TOKEN_DECIMALS || symbol !== env.UNLOCK_TOKEN_SYMBOL || args[1] <= 0n) throw new Error("TOKEN_CONFIG_MISMATCH");
	console.log(JSON.stringify({ chain: 50312, wallet: account.address, gasBalanceSTT: formatEther(balance), token: args[0], symbol, tokenBalance: formatUnits(tokens, decimals), unlockPrice: formatUnits(args[1], decimals) }));
	if (!process.argv.includes("--deploy")) process.exit(0);
	mkdirSync(new URL("../.local-operations/", import.meta.url), { recursive: true, mode: 0o700 });
	let record = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, "utf8")) : undefined;
	if (record && (record.sender !== account.address || record.token !== args[0] || record.price !== args[1].toString())) throw new Error("DEPLOYMENT_RECORD_CONFIG_MISMATCH");
	if (env.UNLOCK_ESCROW_ADDRESS && !record) throw new Error("ESCROW_ALREADY_CONFIGURED");
	if (!record) {
		const data = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode.object, args });
		const gas = await client.estimateGas({ account, data });
		const request = await wallet.prepareTransactionRequest({ account, data, gas: (gas * 12n) / 10n });
		const fee = request.maxFeePerGas ?? request.gasPrice;
		const maxCost = request.gas * fee;
		console.log(JSON.stringify({ estimatedMaximumDeploymentGasSTT: formatEther(maxCost) }));
		if (balance < maxCost) throw new Error("INSUFFICIENT_TESTNET_GAS");
		const raw = await wallet.signTransaction(request);
		record = { sender: account.address, token: args[0], price: args[1].toString(), hash: keccak256(raw), raw };
		save(record); // Durable before broadcast: retries reuse exactly these bytes.
	}
	let receipt = await client.getTransactionReceipt({ hash: record.hash }).catch(() => null);
	if (!receipt) {
		await client.sendRawTransaction({ serializedTransaction: record.raw }).catch(() => undefined);
		console.log(JSON.stringify({ submittedHash: record.hash }));
		receipt = await client.waitForTransactionReceipt({ hash: record.hash, confirmations: 2, timeout: 120000 });
	}
	if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("DEPLOYMENT_REVERTED");
	const address = receipt.contractAddress;
	const [token, price, code] = await Promise.all([client.readContract({ address, abi: artifact.abi, functionName: "token" }), client.readContract({ address, abi: artifact.abi, functionName: "price" }), client.getCode({ address })]);
	if (!code || code === "0x" || token.toLowerCase() !== args[0].toLowerCase() || price !== args[1]) throw new Error("DEPLOYED_CONFIG_MISMATCH");
	record.address = address;
	record.block = receipt.blockNumber.toString();
	save(record);
	setEnv({ UNLOCK_ESCROW_ADDRESS: address, UNLOCK_ESCROW_START_BLOCK: record.block });
	console.log(JSON.stringify({ deployed: address, transactionHash: record.hash, block: record.block, envUpdated: true }));
} catch (error) {
	console.error(JSON.stringify({ failed: /^[A-Z_]+$/.test(error.message) ? error.message : error.name, note: "No secrets printed. A saved deployment transaction is reused on retry." }));
	process.exitCode = 1;
}
