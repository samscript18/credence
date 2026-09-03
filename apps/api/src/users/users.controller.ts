import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";

import type { OptionalAuthenticatedRequest } from "../auth/auth.types.js";
import { OptionalAuthGuard } from "../auth/optional-auth.guard.js";
import { UserParamsDto } from "./dto/user-params.dto.js";
import { UsersService } from "./users.service.js";

@Controller("users")
@UseGuards(OptionalAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(":address")
  async profile(@Param() params: UserParamsDto, @Req() request: OptionalAuthenticatedRequest) {
    return { data: await this.users.getProfile(params.address, request.user?.walletAddress) };
  }

  @Get(":address/history")
  async history(@Param() params: UserParamsDto) {
    return { data: await this.users.getHistory(params.address) };
  }
}
