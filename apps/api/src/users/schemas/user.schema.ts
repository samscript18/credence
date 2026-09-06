import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  walletAddress!: string;

  @Prop({ trim: true })
  displayName?: string;

  @Prop({ trim: true })
  avatarSeed?: string;

  @Prop({ trim: true })
  avatarUrl?: string;

  @Prop({ required: true, default: false, index: true })
  isDemo!: boolean;

  @Prop({ required: true, default: 50, min: 0, max: 100, index: true })
  reputationScore!: number;

  @Prop({ required: true, default: 0, min: 0 })
  resolvedPredictions!: number;

  @Prop({ required: true, default: 0, min: 0 })
  correctPredictions!: number;

  @Prop({ required: true, default: 0, min: 0 })
  incorrectPredictions!: number;

  @Prop({ required: true, default: 0, min: 0, max: 100 })
  accuracy!: number;

  @Prop({ required: true, default: "0" })
  realizedPnl!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

export function isVerifiedPredictor(
  user: Pick<User, "reputationScore" | "resolvedPredictions">,
): boolean {
  return user.reputationScore >= 80 && user.resolvedPredictions >= 25;
}
