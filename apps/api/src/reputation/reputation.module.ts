import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { Prediction, PredictionSchema } from "../predictions/schemas/prediction.schema.js";
import { User, UserSchema } from "../users/schemas/user.schema.js";
import { ReputationService } from "./reputation.service.js";

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Prediction.name, schema: PredictionSchema }, { name: User.name, schema: UserSchema }])],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
