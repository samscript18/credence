import { Body, Controller, Delete, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { EnableAutoClaimDto } from "./auto-claim.dto.js";
import { AutoClaimService } from "./auto-claim.service.js";

@Controller("predictions/:id/auto-claim")
@UseGuards(AuthGuard)
export class AutoClaimController {
  constructor(private readonly autoClaim: AutoClaimService) {}

  @Post("prepare")
  async prepare(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { data: await this.autoClaim.prepare(id, request.user.walletAddress) };
  }

  @Post()
  async enable(@Param("id") id: string, @Req() request: AuthenticatedRequest, @Body() input: EnableAutoClaimDto) {
    return { data: await this.autoClaim.enable(id, request.user.walletAddress, input) };
  }

  @Delete()
  async disable(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { data: await this.autoClaim.disable(id, request.user.walletAddress) };
  }
}
