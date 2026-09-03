import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AuthChallengeDocument = HydratedDocument<AuthChallenge>;

@Schema({ timestamps: true })
export class AuthChallenge {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  walletAddress!: string;

  @Prop({ required: true, unique: true })
  nonce!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ required: true, index: { expires: 0 } })
  expiresAt!: Date;
}

export const AuthChallengeSchema = SchemaFactory.createForClass(AuthChallenge);
