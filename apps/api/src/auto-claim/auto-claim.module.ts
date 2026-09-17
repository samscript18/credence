import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module.js";
import { Prediction, PredictionSchema } from "../predictions/schemas/prediction.schema.js";
import { PredictionsModule } from "../predictions/predictions.module.js";
import { AutoClaimController } from "./auto-claim.controller.js";
import { AutoClaimAuthorization, AutoClaimAuthorizationSchema, AutoClaimExecution, AutoClaimExecutionSchema } from "./auto-claim.schema.js";
import { AutoClaimService } from "./auto-claim.service.js";
import { KeeperHubClient } from "./keeperhub.client.js";

@Module({
  imports: [AuthModule, PredictionsModule, MongooseModule.forFeature([
    { name: Prediction.name, schema: PredictionSchema },
    { name: AutoClaimAuthorization.name, schema: AutoClaimAuthorizationSchema },
    { name: AutoClaimExecution.name, schema: AutoClaimExecutionSchema },
  ])],
  controllers: [AutoClaimController],
  providers: [AutoClaimService, KeeperHubClient],
  exports: [AutoClaimService],
})
export class AutoClaimModule {}
