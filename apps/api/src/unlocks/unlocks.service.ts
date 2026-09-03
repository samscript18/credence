import type { UnlockConfirmation, UnlockInstructions } from "@credence/shared";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { createPublicClient, decodeEventLog, erc20Abi, getAddress, http, isHex, type Hex } from "viem";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

import { Prediction } from "../predictions/schemas/prediction.schema.js";
import { PredictionUnlock } from "./schemas/prediction-unlock.schema.js";

export function isMatchingUnlockTransfer(
  log: { address: string; data: `0x${string}`; topics: readonly unknown[] },
  expected: { token: string; buyer: string; recipient: string; minimumAmount: bigint },
): boolean {
  if (log.address.toLowerCase() !== expected.token.toLowerCase()) return false;
  try {
    const topics = log.topics.filter((topic): topic is Hex => typeof topic === "string" && isHex(topic));
    if (topics.length === 0) return false;
    const decoded = decodeEventLog({
      abi: erc20Abi,
      eventName: "Transfer",
      data: log.data,
      topics: topics as [Hex, ...Hex[]],
    });
    return (
      decoded.args.from.toLowerCase() === expected.buyer.toLowerCase() &&
      decoded.args.to.toLowerCase() === expected.recipient.toLowerCase() &&
      decoded.args.value >= expected.minimumAmount
    );
  } catch {
    return false;
  }
}

@Injectable()
export class UnlocksService {
  constructor(
    @InjectModel(Prediction.name) private readonly predictionModel: Model<Prediction>,
    @InjectModel(PredictionUnlock.name) private readonly unlockModel: Model<PredictionUnlock>,
    private readonly config: ConfigService,
  ) {}

  async prepare(predictionId: string, buyerAddress: string): Promise<UnlockInstructions> {
    const prediction = await this.predictionModel.findById(predictionId).exec();
    if (!prediction) throw new NotFoundException("Prediction was not found");
    if (prediction.status !== "ACTIVE" || prediction.visibility !== "LOCKED") {
      throw new BadRequestException({ message: "Prediction is not an active locked insight", code: "PREDICTION_NOT_LOCKED" });
    }
    if (prediction.predictorAddress === buyerAddress.toLowerCase()) {
      throw new BadRequestException("A predictor already has access to their own prediction");
    }
    const existing = await this.unlockModel.findOne({ prediction: prediction._id, buyerAddress: buyerAddress.toLowerCase(), status: "CONFIRMED" }).exec();
    if (existing) throw new ConflictException({ message: "Prediction is already unlocked", code: "ALREADY_UNLOCKED" });
    return {
      predictionId,
      chainId: somniaShannon.id,
      recipient: prediction.predictorAddress,
      tokenAddress: this.tokenAddress(),
      tokenSymbol: this.config.get<string>("UNLOCK_TOKEN_SYMBOL", "tUSDC"),
      tokenDecimals: this.tokenDecimals(),
      amountBaseUnits: this.priceBaseUnits().toString(),
    };
  }

  async confirm(predictionId: string, buyerAddress: string, transactionHash: `0x${string}`): Promise<UnlockConfirmation> {
    const instructions = await this.prepare(predictionId, buyerAddress);
    const client = createPublicClient({ chain: somniaShannon, transport: http(this.config.get<string>("SOMNIA_RPC_URL", "https://dream-rpc.somnia.network")) });
    const [receipt, transaction] = await Promise.all([
      client.getTransactionReceipt({ hash: transactionHash }),
      client.getTransaction({ hash: transactionHash }),
    ]);
    const buyer = getAddress(buyerAddress);
    const recipient = getAddress(instructions.recipient);
    const token = getAddress(instructions.tokenAddress);
    const paid = receipt.logs.some((log) =>
      isMatchingUnlockTransfer(log, {
        token,
        buyer,
        recipient,
        minimumAmount: BigInt(instructions.amountBaseUnits),
      }),
    );
    if (
      receipt.status !== "success" ||
      transaction.from.toLowerCase() !== buyer.toLowerCase() ||
      transaction.to?.toLowerCase() !== token.toLowerCase() ||
      !paid
    ) {
      throw new BadRequestException({ message: "Payment transaction does not match the unlock instructions", code: "PAYMENT_VERIFICATION_FAILED" });
    }
    const prediction = await this.predictionModel.findById(predictionId).orFail().exec();
    try {
      const unlock = await this.unlockModel.create({
        prediction: prediction._id,
        buyerAddress: buyer.toLowerCase(),
        predictorAddress: recipient.toLowerCase(),
        paymentTokenAddress: token.toLowerCase(),
        paymentTokenSymbol: instructions.tokenSymbol,
        amount: instructions.amountBaseUnits,
        transactionHash: transactionHash.toLowerCase(),
        status: "CONFIRMED",
        confirmedAt: new Date(),
      });
      return {
        unlocked: true,
        unlockId: unlock._id.toString(),
        transactionHash: unlock.transactionHash,
      };
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === 11_000) {
        throw new ConflictException({ message: "Payment transaction or unlock was already used", code: "PAYMENT_ALREADY_USED" });
      }
      throw error;
    }
  }

  private tokenAddress(): string {
    const value = this.config.get<string>("UNLOCK_TOKEN_ADDRESS", "0x70a86d8842fb63c4ad2b7cdddf530ebf1bb25d8e");
    return getAddress(value);
  }

  private tokenDecimals(): number {
    const value = Number(this.config.get<string>("UNLOCK_TOKEN_DECIMALS", "6"));
    if (!Number.isInteger(value) || value < 0) throw new Error("UNLOCK_TOKEN_DECIMALS is invalid");
    return value;
  }

  private priceBaseUnits(): bigint {
    const value = this.config.get<string>("UNLOCK_PRICE_BASE_UNITS", "1000000");
    if (!/^\d+$/.test(value) || BigInt(value) <= 0n) throw new Error("UNLOCK_PRICE_BASE_UNITS is invalid");
    return BigInt(value);
  }
}
