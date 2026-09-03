import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

export type BackedPredictionDocument = HydratedDocument<BackedPrediction>;
export type BackStatus = "CONFIRMED" | "FAILED";

@Schema({ timestamps: true })
export class BackedPrediction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Prediction", required: true })
  prediction!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  backerAddress!: string;

  @Prop({ required: true, enum: ["UP", "DOWN"] })
  direction!: "UP" | "DOWN";

  @Prop({ required: true })
  stakeAmount!: string;

  @Prop({ min: 0, max: 1 })
  marketProbabilityAtExecution?: number;

  @Prop({ required: true, lowercase: true, trim: true })
  transactionHash!: string;

  @Prop({ trim: true })
  orderId?: string;

  @Prop({ required: true, enum: ["CONFIRMED", "FAILED"] })
  status!: BackStatus;

  createdAt!: Date;
  updatedAt!: Date;
}

export const BackedPredictionSchema = SchemaFactory.createForClass(BackedPrediction);
BackedPredictionSchema.index({ transactionHash: 1 }, { unique: true });
BackedPredictionSchema.index({ backerAddress: 1, createdAt: -1 });
