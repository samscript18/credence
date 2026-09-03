import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module.js";
import { DreamDexModule } from "../dreamdex/dreamdex.module.js";
import { Prediction, PredictionSchema } from "../predictions/schemas/prediction.schema.js";
import { PredictionUnlock, PredictionUnlockSchema } from "../unlocks/schemas/prediction-unlock.schema.js";
import { BackedPrediction, BackedPredictionSchema } from "./schemas/backed-prediction.schema.js";
import { BacksController } from "./backs.controller.js";
import { BacksService } from "./backs.service.js";

@Module({
  imports: [
    AuthModule,
    DreamDexModule,
    MongooseModule.forFeature([
      { name: Prediction.name, schema: PredictionSchema },
      { name: PredictionUnlock.name, schema: PredictionUnlockSchema },
      { name: BackedPrediction.name, schema: BackedPredictionSchema },
    ]),
  ],
  controllers: [BacksController],
  providers: [BacksService],
})
export class BacksModule {}
