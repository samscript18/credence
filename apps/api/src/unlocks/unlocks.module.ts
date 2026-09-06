import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module.js";
import { Prediction, PredictionSchema } from "../predictions/schemas/prediction.schema.js";
import { PredictionUnlock, PredictionUnlockSchema } from "./schemas/prediction-unlock.schema.js";
import { UnlocksController } from "./unlocks.controller.js";
import { EscrowUnlocksService } from "./escrow-unlocks.service.js";
import { DreamDexModule } from "../dreamdex/dreamdex.module.js";
import { RefundWorkerService } from "./refund-worker.service.js";
import { RefundJob, RefundJobSchema, RefundWorkerState, RefundWorkerStateSchema } from "./refund-worker.schema.js";

@Module({
  imports: [AuthModule, DreamDexModule, MongooseModule.forFeature([{ name: RefundJob.name, schema: RefundJobSchema }, { name: RefundWorkerState.name, schema: RefundWorkerStateSchema }, { name: Prediction.name, schema: PredictionSchema }, { name: PredictionUnlock.name, schema: PredictionUnlockSchema }])],
  controllers: [UnlocksController],
  providers: [EscrowUnlocksService, RefundWorkerService],
})
export class UnlocksModule {}
