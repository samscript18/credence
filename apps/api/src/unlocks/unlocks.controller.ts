import { Body, Controller, HttpCode, Param, Post, Req, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { ConfirmUnlockDto } from "./dto/confirm-unlock.dto.js";
import { EscrowUnlocksService } from "./escrow-unlocks.service.js";

@Controller("predictions/:id/unlock")
@UseGuards(AuthGuard)
export class UnlocksController {
  constructor(private readonly unlocks: EscrowUnlocksService) {}

  @Post("prepare")
  @HttpCode(200)
  async prepare(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { data: await this.unlocks.prepare(id, request.user.walletAddress) };
  }

  @Post("confirm")
  @HttpCode(200)
  async confirm(@Param("id") id: string, @Req() request: AuthenticatedRequest, @Body() body: ConfirmUnlockDto) {
    return { data: await this.unlocks.confirm(id, request.user.walletAddress, body.transactionHash) };
  }
}
