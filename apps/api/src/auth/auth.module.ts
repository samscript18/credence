import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";

import { User, UserSchema } from "../users/schemas/user.schema.js";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { OptionalAuthGuard } from "./optional-auth.guard.js";
import { AuthChallenge, AuthChallengeSchema } from "./schemas/auth-challenge.schema.js";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuthChallenge.name, schema: AuthChallengeSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>("JWT_SECRET") ?? "credence-local-development-secret-change-me",
        signOptions: { expiresIn: "1h" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OptionalAuthGuard],
  exports: [AuthService, AuthGuard, OptionalAuthGuard],
})
export class AuthModule {}
