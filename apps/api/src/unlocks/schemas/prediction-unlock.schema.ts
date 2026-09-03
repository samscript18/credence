import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

export type PredictionUnlockDocument = HydratedDocument<PredictionUnlock>;
export type UnlockStatus = "PENDING" | "CONFIRMED" | "FAILED";

@Schema({ timestamps: true })
export class PredictionUnlock {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Prediction", required: true })
  prediction!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  buyerAddress!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  predictorAddress!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  paymentTokenAddress!: string;

  @Prop({ required: true, trim: true })
  paymentTokenSymbol!: string;

  @Prop({ required: true })
  amount!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  transactionHash!: string;

  @Prop({ type: String, required: true, enum: ["PENDING", "CONFIRMED", "FAILED"] })
  status!: UnlockStatus;

  @Prop()
  confirmedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PredictionUnlockSchema = SchemaFactory.createForClass(PredictionUnlock);
PredictionUnlockSchema.index({ prediction: 1, buyerAddress: 1 }, { unique: true });
PredictionUnlockSchema.index({ transactionHash: 1 }, { unique: true });
