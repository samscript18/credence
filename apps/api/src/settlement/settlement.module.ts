import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { DreamDexModule } from "../dreamdex/dreamdex.module.js";
import { Prediction, PredictionSchema } from "../predictions/schemas/prediction.schema.js";
import { SettlementService } from "./settlement.service.js";

@Module({
  imports: [
    DreamDexModule,
    MongooseModule.forFeature([{ name: Prediction.name, schema: PredictionSchema }]),
  ],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
