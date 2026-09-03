import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module.js";
import { User, UserSchema } from "../users/schemas/user.schema.js";
import { PredictionUnlock, PredictionUnlockSchema } from "../unlocks/schemas/prediction-unlock.schema.js";
import { PredictionsController } from "./predictions.controller.js";
import { PredictionsService } from "./predictions.service.js";
import { Prediction, PredictionSchema } from "./schemas/prediction.schema.js";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Prediction.name, schema: PredictionSchema },
      { name: User.name, schema: UserSchema },
      { name: PredictionUnlock.name, schema: PredictionUnlockSchema },
    ]),
  ],
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
