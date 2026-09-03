import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";

import { AppController } from "./app.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { validateEnvironment } from "./config/environment.js";
import { DreamDexModule } from "./dreamdex/dreamdex.module.js";
import { MarketsModule } from "./markets/markets.module.js";
import { LeaderboardModule } from "./leaderboard/leaderboard.module.js";
import { ReputationModule } from "./reputation/reputation.module.js";
import { BackedPrediction, BackedPredictionSchema } from "./backs/schemas/backed-prediction.schema.js";
import { Prediction, PredictionSchema } from "./predictions/schemas/prediction.schema.js";
import { PredictionsModule } from "./predictions/predictions.module.js";
import { PredictionUnlock, PredictionUnlockSchema } from "./unlocks/schemas/prediction-unlock.schema.js";
import { User, UserSchema } from "./users/schemas/user.schema.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("MONGODB_URI", "mongodb://localhost:27017/credence"),
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Prediction.name, schema: PredictionSchema },
      { name: PredictionUnlock.name, schema: PredictionUnlockSchema },
      { name: BackedPrediction.name, schema: BackedPredictionSchema },
    ]),
    AuthModule,
    DreamDexModule,
    MarketsModule,
    PredictionsModule,
    UsersModule,
    ReputationModule,
    LeaderboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
