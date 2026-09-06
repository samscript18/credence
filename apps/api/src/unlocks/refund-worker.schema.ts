import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class RefundJob {
  @Prop({ required: true, unique: true }) key!: string;
  @Prop({ required: true }) escrow!: string;
  @Prop({ required: true }) predictionKey!: string;
  @Prop({ required: true }) buyer!: string;
  @Prop({ required: true }) depositHash!: string;
  @Prop({ default: "pending" }) state!: string;
  @Prop() rawTransaction?: string;
  @Prop() transactionHash?: string;
  @Prop({ default: () => new Date(0) }) nextCheck!: Date;
}
export const RefundJobSchema = SchemaFactory.createForClass(RefundJob);
RefundJobSchema.index({ escrow: 1, state: 1, nextCheck: 1 });

@Schema()
export class RefundWorkerState {
  @Prop({ required: true, unique: true }) key!: string;
  @Prop() nextBlock?: string;
  @Prop() owner?: string;
  @Prop() leaseUntil?: Date;
}
export const RefundWorkerStateSchema = SchemaFactory.createForClass(RefundWorkerState);
