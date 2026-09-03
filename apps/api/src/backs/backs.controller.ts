import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { BacksService } from "./backs.service.js";
import { CreateBackDto } from "./dto/create-back.dto.js";

@Controller("predictions/:id/backs")
@UseGuards(AuthGuard)
export class BacksController {
  constructor(private readonly backs: BacksService) {}

  @Post()
  async create(@Param("id") id: string, @Req() request: AuthenticatedRequest, @Body() body: CreateBackDto) {
    return { data: await this.backs.create(id, request.user.walletAddress, body.transactionHash) };
  }

  @Get("me")
  async mine(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { data: await this.backs.getMine(id, request.user.walletAddress) };
  }

  @Post("recover")
  async recover(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return { data: await this.backs.recoverLatest(id, request.user.walletAddress) };
  }
}
