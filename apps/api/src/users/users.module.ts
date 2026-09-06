import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module.js";
import { PredictionsModule } from "../predictions/predictions.module.js";
import { User, UserSchema } from "./schemas/user.schema.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";
import { AvatarUploadService } from "./avatar-upload.service.js";

@Module({
  imports: [
    AuthModule,
    PredictionsModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService, AvatarUploadService],
  exports: [UsersService],
})
export class UsersModule {}
