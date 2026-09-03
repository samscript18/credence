import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module.js";
import { Prediction, PredictionSchema } from "../predictions/schemas/prediction.schema.js";
import { PredictionUnlock, PredictionUnlockSchema } from "./schemas/prediction-unlock.schema.js";
import { UnlocksController } from "./unlocks.controller.js";
import { UnlocksService } from "./unlocks.service.js";

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: Prediction.name, schema: PredictionSchema }, { name: PredictionUnlock.name, schema: PredictionUnlockSchema }])],
  controllers: [UnlocksController],
  providers: [UnlocksService],
})
export class UnlocksModule {}
