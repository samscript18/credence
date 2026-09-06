import { Body, Controller, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AvatarUploadService } from "./avatar-upload.service.js";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedRequest, OptionalAuthenticatedRequest } from "../auth/auth.types.js";
import { OptionalAuthGuard } from "../auth/optional-auth.guard.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";
import { UserParamsDto } from "./dto/user-params.dto.js";
import { UsersService } from "./users.service.js";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService, private readonly avatars: AvatarUploadService) {}

  @Post("profile/avatar")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async uploadAvatar(@Req() request: AuthenticatedRequest, @UploadedFile() file?: { buffer: Buffer; size: number }) {
    return { data: await this.avatars.upload(request.user.walletAddress, file) };
  }

  @Patch("profile")
  @UseGuards(AuthGuard)
  async updateProfile(@Req() request: AuthenticatedRequest, @Body() body: UpdateProfileDto) {
    return { data: await this.users.updateProfile(request.user.walletAddress, body) };
  }

  @Get(":address")
  @UseGuards(OptionalAuthGuard)
  async profile(@Param() params: UserParamsDto, @Req() request: OptionalAuthenticatedRequest) {
    return { data: await this.users.getProfile(params.address, request.user?.walletAddress) };
  }

  @Get(":address/history")
  @UseGuards(OptionalAuthGuard)
  async history(@Param() params: UserParamsDto) {
    return { data: await this.users.getHistory(params.address) };
  }
}
