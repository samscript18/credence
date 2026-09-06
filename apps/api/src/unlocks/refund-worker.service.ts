import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import type { Model } from "mongoose";
import { createPublicClient, createWalletClient, encodeFunctionData, getAddress, http, keccak256, parseAbi, parseAbiItem, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { insightEscrowSignatures } from "@credence/shared";
import { RefundJob, RefundWorkerState } from "./refund-worker.schema.js";
import { refundDue } from "./refund-policy.js";

const abi = parseAbi(insightEscrowSignatures);
const deposited = parseAbiItem("event Deposited(bytes32 indexed prediction,address indexed buyer,address predictor,address market,uint64 expiry)");

@Injectable()
export class RefundWorkerService {
  private running = false;
  private readonly logger = new Logger(RefundWorkerService.name);
  constructor(
    private readonly config: ConfigService,
    @InjectModel(RefundJob.name) private readonly jobs: Model<RefundJob>,
    @InjectModel(RefundWorkerState.name) private readonly states: Model<RefundWorkerState>,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async poll(): Promise<void> {
    if (this.running || this.config.get<string>("ENABLE_AUTO_UNLOCK_REFUNDS") !== "true") return;
    this.running = true;
    const owner = randomUUID();
    let lockKey: string | undefined;
    try {
      const secret = this.config.get<string>("REFUND_WORKER_PRIVATE_KEY", "");
      const start = this.config.get<string>("UNLOCK_ESCROW_START_BLOCK", "");
      const cap = this.config.get<string>("REFUND_MAX_TX_COST_WEI", "");
      if (!/^0x[0-9a-f]{64}$/i.test(secret) || !/^\d+$/.test(start) || !/^\d+$/.test(cap) || BigInt(cap) <= 0n) throw new Error("Invalid worker configuration");
      const escrow = getAddress(this.config.get<string>("UNLOCK_ESCROW_ADDRESS", ""));
      const account = privateKeyToAccount(secret as Hex);
      const transport = http(this.config.get<string>("SOMNIA_RPC_URL", "https://dream-rpc.somnia.network"), { timeout: 10_000, retryCount: 0 });
      const client = createPublicClient({ chain: somniaShannon, transport });
      const wallet = createWalletClient({ account, chain: somniaShannon, transport });
      if (await client.getChainId() !== somniaShannon.id) throw new Error("Wrong chain");
      // One global lease prevents two API replicas from racing the worker nonce.
      lockKey = `shannon-refund-worker`;
      await this.states.updateOne({ key: lockKey }, { $setOnInsert: { leaseUntil: new Date(0) } }, { upsert: true }).exec();
      const lease = await this.states.findOneAndUpdate({ key: lockKey, leaseUntil: { $lte: new Date() } }, { $set: { owner, leaseUntil: new Date(Date.now() + 120_000) } }, { returnDocument: "after" }).exec();
      if (!lease) return;
      const [token, price, head] = await Promise.all([
        client.readContract({ address: escrow, abi, functionName: "token" }),
        client.readContract({ address: escrow, abi, functionName: "price" }), client.getBlockNumber(),
      ]);
      if (token.toLowerCase() !== this.config.get<string>("UNLOCK_TOKEN_ADDRESS", "").toLowerCase() || price.toString() !== this.config.get<string>("UNLOCK_PRICE_BASE_UNITS", "")) throw new Error("Escrow config mismatch");
      // Keep two blocks behind the head; replay is harmless due to job keys.
      if (head < 2n) return;
      const safeHead = head - 2n;
      const cursorKey = `deposits:${somniaShannon.id}:${escrow.toLowerCase()}`;
      const cursor = await this.states.findOne({ key: cursorKey }).exec();
      const fromBlock = BigInt(cursor?.nextBlock ?? start);
      if (fromBlock <= safeHead) {
        const toBlock = fromBlock + 499n < safeHead ? fromBlock + 499n : safeHead;
        const logs = await client.getLogs({ address: escrow, event: deposited, fromBlock, toBlock, strict: true });
        for (const log of logs) {
          const key = `${escrow.toLowerCase()}:${log.args.prediction}:${log.args.buyer.toLowerCase()}`;
          await this.jobs.updateOne({ key }, { $setOnInsert: { escrow: escrow.toLowerCase(), predictionKey: log.args.prediction, buyer: log.args.buyer.toLowerCase(), depositHash: log.transactionHash, state: "pending", nextCheck: new Date(0) } }, { upsert: true }).exec();
        }
        await this.states.updateOne({ key: cursorKey }, { $set: { nextBlock: (toBlock + 1n).toString() } }, { upsert: true }).exec();
      }
      // Always reconcile/rebroadcast a durable signed transaction before preparing
      // another nonce. Never create a replacement automatically on a timeout.
      const submitted = await this.jobs.findOne({ state: "submitted" }).exec();
      const job = submitted ?? await this.jobs.findOne({ escrow: escrow.toLowerCase(), state: "pending", nextCheck: { $lte: new Date() } }).sort({ nextCheck: 1 }).exec();
      if (!job) return;
      const jobEscrow = getAddress(job.escrow);
      const predictionKey = job.predictionKey as Hex;
      const buyer = getAddress(job.buyer);
      const payment = await client.readContract({ address: jobEscrow, abi, functionName: "payments", args: [predictionKey, buyer] });
      if (submitted) {
        // The nonce must be mined before another refund is prepared, including
        // when a buyer's concurrent reveal/refund made our transaction revert.
        const receipt = await client.getTransactionReceipt({ hash: job.transactionHash as Hex }).catch(() => null);
        if (!receipt) {
          await client.sendRawTransaction({ serializedTransaction: job.rawTransaction as Hex }).catch(() => undefined);
          return;
        }
        if (head < receipt.blockNumber + 2n) return;
        const state = payment[3] === 3 ? "refunded" : payment[3] === 2 ? "revealed" : "pending";
        await this.jobs.updateOne({ _id: job._id }, { $set: { state, nextCheck: new Date(Date.now() + 60_000) }, $unset: { rawTransaction: 1 } }).exec();
        return;
      }
      if (payment[3] !== 1) {
        await this.jobs.updateOne({ _id: job._id }, { $set: { state: payment[3] === 3 ? "refunded" : payment[3] === 2 ? "revealed" : "missing" } }).exec();
        return;
      }
      const block = await client.getBlock();
      // RPC failures throw, not "closed". Do not pay gas on an uncertain state.
      const status = block.timestamp < payment[2] ? await client.readContract({ address: payment[1], abi: parseAbi(["function status() view returns (uint8)"]), functionName: "status" }) : undefined;
      await this.jobs.updateOne({ _id: job._id }, { $set: { nextCheck: new Date(Date.now() + 60_000) } }).exec();
      if (!refundDue(payment[3], payment[2], block.timestamp, status)) return;
      await client.simulateContract({ account, address: jobEscrow, abi, functionName: "refund", args: [predictionKey, buyer] });
      const request = await wallet.prepareTransactionRequest({ account, to: jobEscrow, data: encodeFunctionData({ abi, functionName: "refund", args: [predictionKey, buyer] }), value: 0n });
      const fee = request.maxFeePerGas ?? request.gasPrice;
      if (fee === undefined || request.gas * fee > BigInt(cap)) throw new Error("Gas cost cap exceeded or unavailable");
      const raw = await wallet.signTransaction(request);
      // Renew ownership immediately before saving/broadcasting, preventing an
      // expired process from sending after another replica acquired the lease.
      const renewed = await this.states.updateOne({ key: lockKey, owner, leaseUntil: { $gt: new Date() } }, { $set: { leaseUntil: new Date(Date.now() + 120_000) } }).exec();
      if (!renewed.modifiedCount) return;
      const saved = await this.jobs.updateOne({ _id: job._id, state: "pending" }, { $set: { state: "submitted", rawTransaction: raw, transactionHash: keccak256(raw) } }).exec();
      if (!saved.modifiedCount) return;
      await client.sendRawTransaction({ serializedTransaction: raw });
    } catch {
      // RPC/wallet errors may include request material. Never log raw errors.
      this.logger.warn("Refund worker deferred: check RPC, escrow configuration, gas balance/cap and durable refund jobs. No secrets logged.");
    } finally {
      if (lockKey) await this.states.updateOne({ key: lockKey, owner }, { $set: { leaseUntil: new Date(0) } }).exec().catch(() => undefined);
      this.running = false;
    }
  }
}
