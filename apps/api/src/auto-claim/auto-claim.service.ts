import { randomBytes, randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { encodePacked, formatUnits, keccak256, recoverTypedDataAddress, type Address, type Hex } from "viem";

import { DreamDexService, type RedemptionSnapshot } from "../dreamdex/dreamdex.service.js";
import { Prediction } from "../predictions/schemas/prediction.schema.js";
import { PredictionsService } from "../predictions/predictions.service.js";
import { decryptSignature, encryptSignature } from "./authorization-crypto.js";
import { EnableAutoClaimDto } from "./auto-claim.dto.js";
import { evaluateAutoClaim, redemptionKey, type AutoClaimReason } from "./auto-claim.policy.js";
import { AutoClaimAuthorization, AutoClaimExecution } from "./auto-claim.schema.js";
import { KeeperHubClient, KeeperHubSubmissionUnknownError } from "./keeperhub.client.js";

const ZERO_BYTES32 = `0x${"00".repeat(32)}`;

@Injectable()
export class AutoClaimService {
  private readonly logger = new Logger(AutoClaimService.name);
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly dreamDex: DreamDexService,
    private readonly keeperHub: KeeperHubClient,
    private readonly predictions: PredictionsService,
    @InjectModel(Prediction.name) private readonly predictionModel: Model<Prediction>,
    @InjectModel(AutoClaimAuthorization.name) private readonly authorizations: Model<AutoClaimAuthorization>,
    @InjectModel(AutoClaimExecution.name) private readonly executions: Model<AutoClaimExecution>,
  ) {}

  private encryptionKey(): string {
    return this.config.get<string>("AUTO_CLAIM_ENCRYPTION_KEY", "");
  }

  private assertSetupConfigured(): void {
    if (!/^[a-f\d]{64}$/i.test(this.encryptionKey())) throw new ServiceUnavailableException("Auto-Claim authorization storage is not configured on this Credence deployment.");
  }

  async prepare(predictionId: string, wallet: string) {
    this.assertSetupConfigured();
    const prediction = await this.ownedPrediction(predictionId, wallet);
    const module = SOMNIA_TESTNET_ADDRESSES.binaryModule;
    if (!module || !prediction.marketAddress || !prediction.positionReference) throw new BadRequestException("This prediction cannot be authorized for Auto-Claim.");
    if (prediction.claimTransactionHash) throw new ConflictException("This prediction is already claimed.");
    const outcomeIdx = prediction.direction === "UP" ? 0 : 1;
    const snapshot = await this.dreamDex.redemptionSnapshot(prediction.marketId as Hex, wallet as Address, outcomeIdx);
    if (snapshot.chainId !== 50_312 || snapshot.marketAddress.toLowerCase() !== prediction.marketAddress.toLowerCase()) throw new BadRequestException("DreamDEX market binding mismatch.");
    const amount = BigInt(prediction.positionReference);
    const ttl = BigInt(this.config.get<string>("AUTO_CLAIM_AUTH_TTL_SECONDS", "2592000"));
    if (ttl < 3600n || ttl > 7_776_000n) throw new Error("AUTO_CLAIM_AUTH_TTL_SECONDS must be between one hour and 90 days");
    return {
      chainId: snapshot.chainId, owner: wallet.toLowerCase(), module, marketId: prediction.marketId,
      marketAddress: prediction.marketAddress, outcomeToken: snapshot.outcomeToken, outcomeId: snapshot.outcomeId.toString(),
      outcomeIdx, amount: amount.toString(), nonce: BigInt(`0x${randomBytes(32).toString("hex")}`).toString(),
      deadline: (BigInt(Math.floor(Date.now() / 1000)) + ttl).toString(), operatorId: 0,
      venueId: /^0x[a-f\d]{64}$/i.test(prediction.venueId ?? "") ? prediction.venueId! : ZERO_BYTES32,
      approvalRequired: !snapshot.operatorApproved && snapshot.outcomeAllowance < amount,
      approvalAmount: amount.toString(),
    };
  }

  async enable(predictionId: string, wallet: string, input: EnableAutoClaimDto) {
    this.assertSetupConfigured();
    const prediction = await this.ownedPrediction(predictionId, wallet);
    if (!prediction.marketAddress || !prediction.positionReference) throw new BadRequestException("This prediction cannot be authorized for Auto-Claim.");
    if (prediction.claimTransactionHash) throw new ConflictException("This prediction is already claimed.");
    const module = SOMNIA_TESTNET_ADDRESSES.binaryModule;
    const outcomeIdx = prediction.direction === "UP" ? 0 : 1;
    const amount = BigInt(prediction.positionReference);
    const deadline = BigInt(input.deadline);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const venueId = /^0x[a-f\d]{64}$/i.test(prediction.venueId ?? "") ? prediction.venueId!.toLowerCase() : ZERO_BYTES32;
    if (!module || input.module.toLowerCase() !== module.toLowerCase() || input.marketId.toLowerCase() !== prediction.marketId.toLowerCase() || input.outcomeIdx !== outcomeIdx || BigInt(input.amount) !== amount || input.operatorId !== 0 || input.venueId.toLowerCase() !== venueId || deadline <= now || deadline > now + 7_776_000n) throw new BadRequestException("Authorization does not match this prediction or has an unsafe deadline.");
    const active = await this.executions.findOne({ prediction: prediction._id, state: { $in: ["REVALIDATING", "SUBMITTING", "SUBMISSION_UNKNOWN", "EXECUTING", "CONFIRMED"] } }).exec();
    if (active) throw new ConflictException("Auto-Claim execution is already in progress.");
    const snapshot = await this.dreamDex.redemptionSnapshot(prediction.marketId as Hex, wallet as Address, outcomeIdx);
    if (snapshot.chainId !== 50_312 || snapshot.marketAddress.toLowerCase() !== prediction.marketAddress.toLowerCase()) throw new BadRequestException("DreamDEX market binding mismatch.");
    if (!snapshot.operatorApproved && snapshot.outcomeAllowance < amount) throw new BadRequestException({ message: "Approve the exact outcome amount before enabling Auto-Claim.", code: "AUTO_CLAIM_APPROVAL_REQUIRED" });
    const recovered = await recoverTypedDataAddress({
      domain: { name: "SomniaMarkets", version: "1", chainId: snapshot.chainId, verifyingContract: module },
      types: { RedeemAuthorization: [
        { name: "owner", type: "address" }, { name: "operatorId", type: "uint32" }, { name: "venueId", type: "bytes32" },
        { name: "marketId", type: "bytes32" }, { name: "outcomeIdx", type: "uint8" }, { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
      ] }, primaryType: "RedeemAuthorization",
      message: { owner: wallet as Address, operatorId: input.operatorId, venueId: input.venueId as Hex, marketId: input.marketId as Hex, outcomeIdx: input.outcomeIdx, amount, nonce: BigInt(input.nonce), deadline },
      signature: input.signature as Hex,
    });
    if (recovered.toLowerCase() !== wallet.toLowerCase()) throw new BadRequestException({ message: "RedeemAuthorization signature is invalid.", code: "AUTO_CLAIM_SIGNATURE_INVALID" });
    // `redeemFor` is itself a settlement operation, so it correctly reverts
    // before an ACTIVE market finalizes. The recovered EIP-712 signer and exact
    // allowance above are sufficient to retain an active position's authorization.
    // The existing worker still simulates this exact call after settlement and
    // immediately before KeeperHub submission.
    if (prediction.status === "RESOLVED") {
      try {
        await this.dreamDex.assertRedeemAuthorization({ module, owner: wallet as Address, nonce: BigInt(input.nonce), deadline, signature: input.signature as Hex, operatorId: input.operatorId, venueId: input.venueId as Hex, marketId: input.marketId as Hex, outcomeIdx: input.outcomeIdx, amount });
      } catch {
        throw new BadRequestException({ message: "DreamDEX rejected this redemption authorization. Prepare and sign a fresh one.", code: "AUTO_CLAIM_AUTHORIZATION_INVALID" });
      }
    }
    const encrypted = encryptSignature(input.signature, this.encryptionKey());
    try {
      const authorization = await this.authorizations.findOneAndUpdate(
        { prediction: prediction._id },
        { $set: { owner: wallet.toLowerCase(), chainId: snapshot.chainId, module: module.toLowerCase(), marketId: prediction.marketId.toLowerCase(), marketAddress: prediction.marketAddress, outcomeToken: snapshot.outcomeToken.toLowerCase(), outcomeId: snapshot.outcomeId.toString(), outcomeIdx, amount: amount.toString(), nonce: input.nonce, deadline: input.deadline, operatorId: input.operatorId, venueId: input.venueId.toLowerCase(), signatureEncrypted: encrypted, status: "READY", approvedAt: new Date() } },
        { upsert: true, returnDocument: "after", runValidators: true },
      ).exec();
      await this.predictionModel.updateOne({ _id: prediction._id }, { $set: { autoClaimEnabled: true, autoClaimStatus: prediction.status === "RESOLVED" ? "READY" : "WATCHING" }, $unset: { autoClaimReason: 1 } }).exec();
      // A fresh signature may retry work that was definitively refused or failed before broadcast.
      // Records with a hash or unknown submission are never reset because a transaction may exist.
      await this.executions.updateMany(
        { prediction: prediction._id, state: { $in: ["REFUSED", "STALE", "FAILED"] }, transactionHash: { $exists: false } },
        { $set: { state: "PENDING", authorization: authorization._id, leaseUntil: new Date(0) }, $unset: { decisionCode: 1, failureReason: 1, keeperhubExecutionId: 1, keeperhubIdempotencyKey: 1, submissionStartedAt: 1, submittedAt: 1 } },
      ).exec();
      return { enabled: true, authorizationStatus: authorization.status };
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === 11000) throw new ConflictException("This redemption nonce or prediction is already authorized.");
      throw error;
    }
  }

  async disable(predictionId: string, wallet: string) {
    const prediction = await this.ownedPrediction(predictionId, wallet);
    const execution = await this.executions.findOne({ prediction: prediction._id, state: { $in: ["REVALIDATING", "SUBMITTING", "SUBMISSION_UNKNOWN", "EXECUTING", "CONFIRMED"] } }).exec();
    if (execution) throw new ConflictException("Auto-Claim execution is already in progress.");
    await this.authorizations.updateOne({ prediction: prediction._id, status: "READY" }, { $set: { status: "DISABLED" } }).exec();
    await this.executions.updateMany({ prediction: prediction._id, state: "PENDING" }, { $set: { state: "REFUSED", decisionCode: "MISSING_AUTHORIZATION", failureReason: "Auto-Claim was disabled before submission" } }).exec();
    await this.predictionModel.updateOne({ _id: prediction._id }, { $set: { autoClaimEnabled: false, autoClaimStatus: "OFF" }, $unset: { autoClaimReason: 1 } }).exec();
    return { enabled: false };
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async poll(): Promise<void> {
    if (this.running || this.config.get<string>("ENABLE_AUTO_CLAIM") !== "true") return;
    this.running = true;
    try {
      await this.discover();
      await this.processOne();
    } catch {
      this.logger.warn("Auto-Claim worker deferred; no authorization or credential material was logged.");
    } finally { this.running = false; }
  }

  async discover(): Promise<void> {
    const ready = await this.authorizations.find({ status: "READY" }).sort({ createdAt: 1 }).limit(25).exec();
    for (const auth of ready) {
      const prediction = await this.predictionModel.findOne({ _id: auth.prediction, status: "RESOLVED", source: "LIVE", claimTransactionHash: { $exists: false }, autoClaimEnabled: true }).exec();
      if (!prediction) continue;
      const key = redemptionKey({ predictionId: prediction._id.toString(), chainId: auth.chainId, owner: auth.owner as Address, marketId: auth.marketId as Hex, outcomeId: BigInt(auth.outcomeId), amount: BigInt(auth.amount) });
      await this.executions.updateOne({ key }, { $setOnInsert: { key, prediction: prediction._id, authorization: auth._id, state: "PENDING", leaseUntil: new Date(0) } }, { upsert: true }).exec();
    }
  }

  async processOne(): Promise<void> {
    const leaseOwner = randomUUID();
    const execution = await this.executions.findOneAndUpdate(
      { state: { $in: ["PENDING", "SUBMITTING", "EXECUTING", "CONFIRMED"] }, leaseUntil: { $lte: new Date() } },
      { $set: { leaseOwner, leaseUntil: new Date(Date.now() + 90_000) } }, { returnDocument: "after", sort: { createdAt: 1 } },
    ).exec();
    if (!execution) return;
    try {
      if (execution.state === "EXECUTING" || execution.state === "CONFIRMED") await this.reconcile(execution._id.toString());
      else if (execution.state === "SUBMITTING") await this.resumeSubmission(execution._id.toString());
      else await this.execute(execution._id.toString());
    } finally {
      await this.executions.updateOne({ _id: execution._id, leaseOwner }, { $set: { leaseUntil: new Date(0) }, $unset: { leaseOwner: 1 } }).exec().catch(() => undefined);
    }
  }

  private async execute(executionId: string): Promise<void> {
    const execution = await this.executions.findById(executionId).exec();
    if (!execution) return;
    const [auth, prediction] = await Promise.all([
      this.authorizations.findById(execution.authorization).select("+signatureEncrypted").exec(),
      this.predictionModel.findById(execution.prediction).exec(),
    ]);
    if (!auth || !prediction || auth.status !== "READY" || prediction.claimTransactionHash) return this.refuse(executionId, prediction?._id.toString(), "DUPLICATE_EXECUTION", "REFUSED");
    const signature = decryptSignature(auth.signatureEncrypted, this.encryptionKey()) as Hex;
    const first = await this.dreamDex.redemptionSnapshot(auth.marketId as Hex, auth.owner as Address, auth.outcomeIdx as 0 | 1);
    const decision = this.decide(auth, first, false);
    if (!decision.eligible) return this.refuse(executionId, prediction._id.toString(), decision.code, decision.code === "POSITION_STATE_CHANGED" ? "STALE" : "REFUSED");
    const evaluating = await this.executions.updateOne({ _id: execution._id, state: "PENDING" }, { $set: { state: "REVALIDATING", decisionCode: decision.code } }).exec();
    if (!evaluating.modifiedCount) return;
    // A second independent chain read is the final authority immediately before KeeperHub submission.
    const live = await this.dreamDex.redemptionSnapshot(auth.marketId as Hex, auth.owner as Address, auth.outcomeIdx as 0 | 1);
    const changed = live.balance !== first.balance || live.collateralBalance !== first.collateralBalance || live.finalized !== first.finalized || live.resolved !== first.resolved || live.voided !== first.voided;
    const revalidated = this.decide(auth, live, changed);
    if (!revalidated.eligible) return this.refuse(executionId, prediction._id.toString(), revalidated.code, "STALE");
    const args = [auth.owner, BigInt(auth.nonce), BigInt(auth.deadline), signature, auth.operatorId, auth.venueId, auth.marketId, auth.outcomeIdx, BigInt(auth.amount)] as const;
    try {
      await this.dreamDex.assertRedeemAuthorization({ module: auth.module as Address, owner: auth.owner as Address, nonce: BigInt(auth.nonce), deadline: BigInt(auth.deadline), signature, operatorId: auth.operatorId, venueId: auth.venueId as Hex, marketId: auth.marketId as Hex, outcomeIdx: auth.outcomeIdx as 0 | 1, amount: BigInt(auth.amount) });
    } catch {
      return this.refuse(executionId, prediction._id.toString(), "INVALID_AUTHORIZATION", "REFUSED");
    }
    const keeperhubIdempotencyKey = keccak256(encodePacked(["bytes32", "uint256"], [execution.key as Hex, BigInt(auth.nonce)]));
    const submitting = await this.executions.updateOne({ _id: execution._id, state: "REVALIDATING" }, { $set: { state: "SUBMITTING", submissionStartedAt: new Date(), keeperhubIdempotencyKey, outcomeBalanceBefore: live.balance.toString(), collateralBalanceBefore: live.collateralBalance.toString(), expectedPayoutBaseUnits: revalidated.expectedPayout.toString() } }).exec();
    if (!submitting.modifiedCount) return;
    await this.predictionModel.updateOne({ _id: prediction._id }, { $set: { autoClaimStatus: "EXECUTING", autoClaimReason: revalidated.code } }).exec();
    try {
      const response = await this.keeperHub.submit({ key: keeperhubIdempotencyKey, module: auth.module as Address, chainId: auth.chainId, args });
      if (!response.executionId) throw new Error("KeeperHub response did not include an execution ID");
      await this.executions.updateOne({ _id: execution._id, state: "SUBMITTING" }, { $set: { state: response.status === "failed" ? "FAILED" : "EXECUTING", keeperhubExecutionId: response.executionId, transactionHash: response.transactionHash?.toLowerCase(), submittedAt: new Date(), ...(response.status === "failed" ? { failureReason: "KeeperHub execution failed" } : {}) } }).exec();
      await this.predictionModel.updateOne({ _id: prediction._id }, { $set: { keeperhubExecutionId: response.executionId, ...(response.status === "failed" ? { autoClaimStatus: "FAILED", autoClaimReason: "KEEPERHUB_EXECUTION_FAILED" } : {}) } }).exec();
      if (response.status === "completed") await this.reconcile(executionId);
    } catch (error) {
      const unknown = error instanceof KeeperHubSubmissionUnknownError;
      await this.executions.updateOne({ _id: execution._id }, { $set: { state: unknown ? "SUBMITTING" : "FAILED", failureReason: unknown ? "KeeperHub result is pending recovery with the same idempotency key" : "KeeperHub submission failed" } }).exec();
      if (!unknown) await this.predictionModel.updateOne({ _id: prediction._id }, { $set: { autoClaimStatus: "FAILED", autoClaimReason: "KEEPERHUB_SUBMISSION_FAILED" } }).exec();
    }
  }

  private async reconcile(executionId: string): Promise<void> {
    const execution = await this.executions.findById(executionId).exec();
    if (!execution?.keeperhubExecutionId) return;
    const polled = await this.keeperHub.status(execution.keeperhubExecutionId);
    const hash = polled.value.transactionHash ?? polled.value.receipts?.[0]?.hash;
    if (!polled.terminal) {
      if (hash) await this.executions.updateOne({ _id: execution._id }, { $set: { transactionHash: hash.toLowerCase() } }).exec();
      return;
    }
    const [auth, prediction] = await Promise.all([this.authorizations.findById(execution.authorization).select("+signatureEncrypted").exec(), this.predictionModel.findById(execution.prediction).exec()]);
    if (!auth || !prediction) return;
    if (polled.value.status !== "completed" || !hash || !polled.value.receipts?.some(receipt => receipt.hash.toLowerCase() === hash.toLowerCase() && receipt.verified && receipt.receiptStatus === "success")) {
      await this.executions.updateOne({ _id: execution._id }, { $set: { state: "FAILED", transactionHash: hash?.toLowerCase(), failureReason: "KeeperHub did not return a verified successful receipt" } }).exec();
      await this.predictionModel.updateOne({ _id: prediction._id }, { $set: { autoClaimStatus: "FAILED", autoClaimReason: "KEEPERHUB_RECEIPT_FAILED" } }).exec();
      return;
    }
    await this.executions.updateOne({ _id: execution._id, state: { $in: ["EXECUTING", "CONFIRMED"] } }, { $set: { state: "CONFIRMED", transactionHash: hash.toLowerCase(), confirmedAt: new Date() } }).exec();
    const signature = decryptSignature(auth.signatureEncrypted, this.encryptionKey()) as Hex;
    let verified;
    try {
      verified = await this.dreamDex.verifyAutoClaim({ hash, marketId: auth.marketId as Hex, marketAddress: auth.marketAddress as Address, owner: auth.owner as Address, module: auth.module as Address, outcomeIdx: auth.outcomeIdx as 0 | 1, outcomeId: BigInt(auth.outcomeId), amount: BigInt(auth.amount), nonce: BigInt(auth.nonce), deadline: BigInt(auth.deadline), operatorId: auth.operatorId, venueId: auth.venueId as Hex, signature, outcomeToken: auth.outcomeToken as Address, collateral: prediction.collateralTokenAddress as Address, outcomeBefore: BigInt(execution.outcomeBalanceBefore!), collateralBefore: BigInt(execution.collateralBalanceBefore!), cost: BigInt(prediction.entryCostBaseUnits!), decimals: prediction.collateralDecimals! });
    } catch {
      await this.executions.updateOne({ _id: execution._id }, { $set: { state: "VERIFICATION_FAILED", transactionHash: hash.toLowerCase(), failureReason: "Receipt succeeded but DreamDEX post-state verification failed" } }).exec();
      await this.predictionModel.updateOne({ _id: prediction._id }, { $set: { autoClaimStatus: "FAILED", autoClaimReason: "VERIFICATION_FAILED", keeperhubExecutionId: execution.keeperhubExecutionId } }).exec();
      return;
    }
    const verifiedAt = new Date();
    try {
      await this.predictions.recordVerifiedClaim(prediction._id.toString(), hash, verified.pnl, prediction.predictorAddress, { executionId: execution.keeperhubExecutionId, verifiedAt, recovered: formatUnits(verified.recovered, prediction.collateralDecimals!), reason: execution.decisionCode ?? "REDEEMABLE_WINNER" });
    } catch {
      await this.executions.updateOne({ _id: execution._id }, { $set: { state: "CONFIRMED", failureReason: "Verified claim accounting is pending retry" } }).exec();
      return;
    }
    await this.executions.updateOne({ _id: execution._id }, { $set: { state: "VERIFIED", transactionHash: hash.toLowerCase(), outcomeBalanceAfter: verified.outcomeAfter.toString(), collateralBalanceAfter: verified.collateralAfter.toString(), recoveredBaseUnits: verified.recovered.toString(), verifiedAt }, $unset: { failureReason: 1 } }).exec();
    await this.authorizations.updateOne({ _id: auth._id }, { $set: { status: "USED" }, $unset: { signatureEncrypted: 1 } }).exec();
  }

  private async resumeSubmission(executionId: string): Promise<void> {
    const execution = await this.executions.findById(executionId).exec();
    if (!execution?.submissionStartedAt || !execution.keeperhubIdempotencyKey) return;
    // KeeperHub retains an idempotent response for 24 hours. Stay one hour inside
    // that bound; after it, a retry could broadcast a second transaction.
    if (Date.now() - execution.submissionStartedAt.getTime() >= 23 * 60 * 60 * 1000) {
      await this.executions.updateOne({ _id: execution._id, state: "SUBMITTING" }, { $set: { state: "SUBMISSION_UNKNOWN", failureReason: "KeeperHub result was not recovered inside its idempotency window" } }).exec();
      await this.predictionModel.updateOne({ _id: execution.prediction }, { $set: { autoClaimStatus: "FAILED", autoClaimReason: "SUBMISSION_UNKNOWN" } }).exec();
      return;
    }
    const auth = await this.authorizations.findById(execution.authorization).select("+signatureEncrypted").exec();
    if (!auth?.signatureEncrypted) return;
    const signature = decryptSignature(auth.signatureEncrypted, this.encryptionKey()) as Hex;
    const args = [auth.owner, BigInt(auth.nonce), BigInt(auth.deadline), signature, auth.operatorId, auth.venueId, auth.marketId, auth.outcomeIdx, BigInt(auth.amount)] as const;
    try {
      const response = await this.keeperHub.submit({ key: execution.keeperhubIdempotencyKey, module: auth.module as Address, chainId: auth.chainId, args });
      if (!response.executionId) throw new Error("KeeperHub response did not include an execution ID");
      await this.executions.updateOne({ _id: execution._id, state: "SUBMITTING" }, { $set: { state: response.status === "failed" ? "FAILED" : "EXECUTING", keeperhubExecutionId: response.executionId, transactionHash: response.transactionHash?.toLowerCase(), submittedAt: new Date(), ...(response.status === "failed" ? { failureReason: "KeeperHub execution failed" } : {}) } }).exec();
      await this.predictionModel.updateOne(
        { _id: execution.prediction },
        { $set: { keeperhubExecutionId: response.executionId, ...(response.status === "failed" ? { autoClaimStatus: "FAILED", autoClaimReason: "KEEPERHUB_EXECUTION_FAILED" } : {}) } },
      ).exec();
      if (response.status === "completed") await this.reconcile(executionId);
    } catch (error) {
      if (!(error instanceof KeeperHubSubmissionUnknownError)) {
        await this.executions.updateOne({ _id: execution._id }, { $set: { state: "FAILED", failureReason: "KeeperHub submission failed" } }).exec();
        await this.predictionModel.updateOne({ _id: execution.prediction }, { $set: { autoClaimStatus: "FAILED", autoClaimReason: "KEEPERHUB_SUBMISSION_FAILED" } }).exec();
      }
    }
  }

  private decide(auth: AutoClaimAuthorization, snapshot: RedemptionSnapshot, positionChanged: boolean) {
    const deadlineState = BigInt(auth.deadline) <= BigInt(Math.floor(Date.now() / 1000)) ? "EXPIRED" : "READY";
    return evaluateAutoClaim({ expectedMarketAddress: auth.marketAddress as Address, actualMarketAddress: snapshot.marketAddress, finalized: snapshot.finalized, resolved: snapshot.resolved, voided: snapshot.voided, payoutNumerators: snapshot.payoutNumerators, outcomeIdx: auth.outcomeIdx as 0 | 1, balance: snapshot.balance, amount: BigInt(auth.amount), authorization: deadlineState, approved: snapshot.operatorApproved || snapshot.outcomeAllowance >= BigInt(auth.amount), duplicate: false, positionChanged });
  }

  private async refuse(executionId: string, predictionId: string | undefined, code: AutoClaimReason, state: "REFUSED" | "STALE") {
    await this.executions.updateOne({ _id: executionId }, { $set: { state, decisionCode: code, failureReason: code } }).exec();
    if (code === "EXPIRED_AUTHORIZATION" || code === "INVALID_AUTHORIZATION") {
      const execution = await this.executions.findById(executionId).select("authorization").exec();
      if (execution) await this.authorizations.updateOne(
        { _id: execution.authorization },
        { $set: { status: code === "EXPIRED_AUTHORIZATION" ? "EXPIRED" : "INVALID" }, $unset: { signatureEncrypted: 1 } },
      ).exec();
    }
    if (predictionId) await this.predictionModel.updateOne(
      { _id: predictionId },
      { $set: { autoClaimStatus: code === "EXPIRED_AUTHORIZATION" ? "EXPIRED" : code === "INVALID_AUTHORIZATION" ? "INVALID" : state, autoClaimReason: code } },
    ).exec();
  }

  private async ownedPrediction(id: string, wallet: string) {
    const prediction = await this.predictionModel.findOne({ _id: id, predictorAddress: wallet.toLowerCase(), source: "LIVE" }).exec();
    if (!prediction) throw new NotFoundException("Prediction was not found");
    if (!prediction.positionReference || !prediction.marketAddress) throw new BadRequestException("Prediction lacks exact DreamDEX position binding.");
    return prediction;
  }
}
