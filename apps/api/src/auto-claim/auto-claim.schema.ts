import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, Types } from "mongoose";

export type AuthorizationStatus = "READY" | "DISABLED" | "EXPIRED" | "USED" | "INVALID";
export type ExecutionState = "PENDING" | "REVALIDATING" | "SUBMITTING" | "SUBMISSION_UNKNOWN" | "EXECUTING" | "CONFIRMED" | "VERIFIED" | "REFUSED" | "STALE" | "FAILED" | "VERIFICATION_FAILED";

@Schema({ timestamps: true })
export class AutoClaimAuthorization {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Prediction", required: true, unique: true }) prediction!: Types.ObjectId;
  @Prop({ required: true, lowercase: true }) owner!: string;
  @Prop({ required: true }) chainId!: number;
  @Prop({ required: true, lowercase: true }) module!: string;
  @Prop({ required: true, lowercase: true }) marketId!: string;
  @Prop({ required: true, lowercase: true }) marketAddress!: string;
  @Prop({ required: true, lowercase: true }) outcomeToken!: string;
  @Prop({ required: true }) outcomeId!: string;
  @Prop({ required: true }) outcomeIdx!: number;
  @Prop({ required: true }) amount!: string;
  @Prop({ required: true }) nonce!: string;
  @Prop({ required: true }) deadline!: string;
  @Prop({ required: true }) operatorId!: number;
  @Prop({ required: true, lowercase: true }) venueId!: string;
  @Prop({ required: true, select: false }) signatureEncrypted!: string;
  @Prop({ required: true, enum: ["READY", "DISABLED", "EXPIRED", "USED", "INVALID"] }) status!: AuthorizationStatus;
  @Prop() approvedAt?: Date;
  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}
export const AutoClaimAuthorizationSchema = SchemaFactory.createForClass(AutoClaimAuthorization);
AutoClaimAuthorizationSchema.index({ owner: 1, nonce: 1 }, { unique: true });
AutoClaimAuthorizationSchema.index({ status: 1, createdAt: 1 });

@Schema({ timestamps: true })
export class AutoClaimExecution {
  @Prop({ required: true, unique: true }) key!: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Prediction", required: true, unique: true }) prediction!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "AutoClaimAuthorization", required: true }) authorization!: Types.ObjectId;
  @Prop({ required: true, enum: ["PENDING", "REVALIDATING", "SUBMITTING", "SUBMISSION_UNKNOWN", "EXECUTING", "CONFIRMED", "VERIFIED", "REFUSED", "STALE", "FAILED", "VERIFICATION_FAILED"] }) state!: ExecutionState;
  @Prop() decisionCode?: string;
  @Prop() failureReason?: string;
  @Prop() keeperhubExecutionId?: string;
  @Prop() keeperhubIdempotencyKey?: string;
  @Prop({ lowercase: true }) transactionHash?: string;
  @Prop() outcomeBalanceBefore?: string;
  @Prop() outcomeBalanceAfter?: string;
  @Prop() collateralBalanceBefore?: string;
  @Prop() collateralBalanceAfter?: string;
  @Prop() recoveredBaseUnits?: string;
  @Prop() expectedPayoutBaseUnits?: string;
  @Prop() submissionStartedAt?: Date;
  @Prop() submittedAt?: Date;
  @Prop() confirmedAt?: Date;
  @Prop() verifiedAt?: Date;
  @Prop() leaseOwner?: string;
  @Prop({ default: () => new Date(0) }) leaseUntil!: Date;
  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}
export const AutoClaimExecutionSchema = SchemaFactory.createForClass(AutoClaimExecution);
AutoClaimExecutionSchema.index({ state: 1, leaseUntil: 1, createdAt: 1 });
