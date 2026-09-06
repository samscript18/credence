import { insightEscrowSignatures, insightSalesOpen, type UnlockConfirmation, type UnlockInstructions } from "@credence/shared";
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { createPublicClient, decodeFunctionData, getAddress, http, keccak256, parseAbi, stringToHex } from "viem";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { DreamDexService } from "../dreamdex/dreamdex.service.js";
import { Prediction } from "../predictions/schemas/prediction.schema.js";
import { PredictionUnlock } from "./schemas/prediction-unlock.schema.js";

const abi = parseAbi(insightEscrowSignatures);

@Injectable()
export class EscrowUnlocksService {
  constructor(
    @InjectModel(Prediction.name) private readonly predictions: Model<Prediction>,
    @InjectModel(PredictionUnlock.name) private readonly unlocks: Model<PredictionUnlock>,
    private readonly config: ConfigService,
    private readonly dex: DreamDexService,
  ) {}

  private client() {
    return createPublicClient({ chain: somniaShannon, transport: http(this.config.get<string>("SOMNIA_RPC_URL", "https://dream-rpc.somnia.network")) });
  }

  async prepare(id: string, buyerAddress: string): Promise<UnlockInstructions> {
    const prediction = await this.predictions.findById(id).exec();
    if (!prediction) throw new NotFoundException("Prediction was not found");
    if (prediction.source !== "LIVE" || !prediction.transactionHash || !prediction.marketAddress) throw new BadRequestException("This prediction has no escrow-compatible live entry. Historical records cannot be sold.");
    if (prediction.predictorAddress === buyerAddress.toLowerCase()) throw new BadRequestException("You already have access to your own prediction.");
    const configured = this.config.get<string>("UNLOCK_ESCROW_ADDRESS");
    if (!configured) throw new ServiceUnavailableException("Paid unlocks are paused until the escrow contract is deployed and configured.");
    const escrowAddress = getAddress(configured);
    const client = this.client();
    if (await client.getChainId() !== somniaShannon.id) throw new ServiceUnavailableException("Escrow RPC is not on Somnia Shannon.");
    const predictionKey = keccak256(stringToHex(`credence:${id}`));
    const [token, price, payment] = await Promise.all([
      client.readContract({ address: escrowAddress, abi, functionName: "token" }),
      client.readContract({ address: escrowAddress, abi, functionName: "price" }),
      client.readContract({ address: escrowAddress, abi, functionName: "payments", args: [predictionKey, getAddress(buyerAddress)] }),
    ]);
    if (token.toLowerCase() !== this.config.get<string>("UNLOCK_TOKEN_ADDRESS", "").toLowerCase() || price.toString() !== this.config.get<string>("UNLOCK_PRICE_BASE_UNITS", "")) throw new ServiceUnavailableException("Escrow token or price does not match server configuration.");
    const expiry = BigInt(Math.floor(prediction.marketExpiryAt.getTime() / 1000));
    if (payment[3] !== 0 && (payment[0].toLowerCase() !== prediction.predictorAddress || payment[1].toLowerCase() !== prediction.marketAddress.toLowerCase() || payment[2] !== expiry)) throw new BadRequestException("Escrow payment is bound to a different prediction window.");
    const windowLive = prediction.status === "ACTIVE" && prediction.visibility === "LOCKED" &&
      await this.dex.assertTradingWindow(prediction.marketId, prediction.marketAddress).then(() => true).catch(() => false);
    const salesOpen = insightSalesOpen(windowLive, prediction.marketExpiryAt.getTime(), Date.now(), Number(this.config.get<string>("PREDICTION_UNLOCK_BUFFER_SECONDS", "60")));
    return { predictionId: id, escrowAddress, predictionKey, marketAddress: prediction.marketAddress, expiry: expiry.toString(), escrowState: payment[3], windowLive, salesOpen, chainId: somniaShannon.id, recipient: prediction.predictorAddress, tokenAddress: token, tokenSymbol: this.config.get<string>("UNLOCK_TOKEN_SYMBOL", "tUSDC"), tokenDecimals: Number(this.config.get<string>("UNLOCK_TOKEN_DECIMALS", "6")), amountBaseUnits: price.toString() };
  }

  async confirm(id: string, buyerAddress: string, transactionHash: `0x${string}`): Promise<UnlockConfirmation> {
    // Recovery must work after closure: payment/reveal/refund state is permanent.
    const instructions = await this.prepare(id, buyerAddress);
    const client = this.client();
    const [receipt, tx] = await Promise.all([client.getTransactionReceipt({ hash: transactionHash }), client.getTransaction({ hash: transactionHash })]);
    if (receipt.status !== "success" || tx.to?.toLowerCase() !== instructions.escrowAddress.toLowerCase() || tx.from.toLowerCase() !== buyerAddress.toLowerCase()) throw new BadRequestException("This is not your confirmed escrow transaction.");
    const call = decodeFunctionData({ abi, data: tx.input });
    if (!["deposit", "reveal", "refund"].includes(call.functionName) || call.args?.[0] !== instructions.predictionKey) throw new BadRequestException("Transaction belongs to another prediction.");
    if (instructions.escrowState === 0) throw new BadRequestException("No escrow payment exists.");
    const status = instructions.escrowState === 2 ? "CONFIRMED" : instructions.escrowState === 3 ? "REFUNDED" : "PENDING";
    const row = await this.unlocks.findOneAndUpdate({ prediction: id, buyerAddress: buyerAddress.toLowerCase() }, { $set: {
      predictorAddress: instructions.recipient, paymentTokenAddress: instructions.tokenAddress.toLowerCase(), paymentTokenSymbol: instructions.tokenSymbol,
      amount: instructions.amountBaseUnits, transactionHash: transactionHash.toLowerCase(), status,
      ...(status === "CONFIRMED" ? { confirmedAt: new Date() } : {}),
    } }, { upsert: true, returnDocument: "after", runValidators: true }).orFail().exec();
    return { unlocked: status === "CONFIRMED", escrowState: instructions.escrowState, unlockId: row._id.toString(), transactionHash: row.transactionHash };
  }
}
