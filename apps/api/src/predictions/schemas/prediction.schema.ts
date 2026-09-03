import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

export type PredictionDocument = HydratedDocument<Prediction>;
export type PredictionDirection = "UP" | "DOWN";
export type PredictionSource = "LIVE" | "DEMO_SEED";
export type PredictionVisibility = "PUBLIC" | "LOCKED";
export type PredictionStatus = "PENDING_TRADE" | "ACTIVE" | "RESOLVED" | "FAILED";
export type PredictionOutcome = PredictionDirection | "VOID";

@Schema({ timestamps: true })
export class Prediction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  predictor!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  predictorAddress!: string;

  @Prop({ required: true, enum: ["LIVE", "DEMO_SEED"] })
  source!: PredictionSource;

  @Prop({ required: true, trim: true })
  marketId!: string;

  @Prop({ trim: true })
  venueId?: string;

  @Prop({ trim: true })
  symbol?: string;

  @Prop({ trim: true })
  underlying?: string;

  @Prop({ required: true, trim: true })
  marketTitle!: string;

  @Prop()
  marketStartAt?: Date;

  @Prop({ required: true })
  marketExpiryAt!: Date;

  @Prop({ required: true, enum: ["UP", "DOWN"] })
  direction!: PredictionDirection;

  @Prop({ required: true, min: 50, max: 99 })
  confidence!: number;

  @Prop({ trim: true, maxlength: 2000 })
  reasoning?: string;

  @Prop({ required: true, enum: ["PUBLIC", "LOCKED"] })
  visibility!: PredictionVisibility;

  @Prop({ required: true, min: 0, max: 1 })
  marketProbabilityAtEntry!: number;

  @Prop({ required: true })
  stakeAmount!: string;

  @Prop({ trim: true })
  collateralSymbol?: string;

  @Prop({ lowercase: true, trim: true })
  collateralTokenAddress?: string;

  @Prop({ lowercase: true, trim: true })
  transactionHash?: string;

  @Prop({ trim: true })
  orderId?: string;

  @Prop({ trim: true })
  positionReference?: string;

  @Prop({
    required: true,
    enum: ["PENDING_TRADE", "ACTIVE", "RESOLVED", "FAILED"],
    default: "PENDING_TRADE",
  })
  status!: PredictionStatus;

  @Prop({ enum: ["UP", "DOWN", "VOID"] })
  finalOutcome?: PredictionOutcome;

  @Prop()
  isCorrect?: boolean;

  @Prop()
  realizedPnl?: string;

  @Prop()
  resolvedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PredictionSchema = SchemaFactory.createForClass(Prediction);
PredictionSchema.index({ predictorAddress: 1, createdAt: -1 });
PredictionSchema.index({ marketId: 1, status: 1 });
PredictionSchema.index({ status: 1, marketExpiryAt: 1 });
PredictionSchema.index({ visibility: 1, status: 1, createdAt: -1 });
PredictionSchema.index({ source: 1 });
PredictionSchema.index(
  { transactionHash: 1 },
  { unique: true, partialFilterExpression: { transactionHash: { $type: "string" } } },
);
