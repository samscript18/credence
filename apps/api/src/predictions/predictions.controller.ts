import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedRequest, OptionalAuthenticatedRequest } from "../auth/auth.types.js";
import { OptionalAuthGuard } from "../auth/optional-auth.guard.js";
import { CreateDraftDto, CreatePredictionDto } from "./dto/create-prediction.dto.js";
import { toPredictionDto } from "./prediction.dto.js";
import { PredictionsService } from "./predictions.service.js";
import { ConfirmUnlockDto } from "../unlocks/dto/confirm-unlock.dto.js";

@Controller("predictions")
export class PredictionsController {
  constructor(private readonly predictions: PredictionsService) {}

  @Post("draft")
  @UseGuards(AuthGuard)
  async draft(@Req() request: AuthenticatedRequest, @Body() input: CreateDraftDto) {
    return { data: toPredictionDto(await this.predictions.createDraft(request.user.walletAddress, input)) };
  }

  @Post("draft/:id/confirm")
  @UseGuards(AuthGuard)
  async confirmDraft(@Param("id") id: string, @Req() request: AuthenticatedRequest, @Body() input: ConfirmUnlockDto) {
    return { data: toPredictionDto(await this.predictions.confirmDraft(id, request.user.walletAddress, input.transactionHash)) };
  }

  @Post(":id/claim")
  @UseGuards(AuthGuard)
  async claim(@Param("id") id: string, @Req() request: AuthenticatedRequest, @Body() body: ConfirmUnlockDto) {
    await this.predictions.confirmClaim(id, request.user.walletAddress, body.transactionHash);
    return { data: { confirmed: true } };
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Req() request: AuthenticatedRequest, @Body() input: CreatePredictionDto) {
    return { data: toPredictionDto(await this.predictions.create(request.user.walletAddress, input)) };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async mine(@Req() request: AuthenticatedRequest) {
    return {
      data: (await this.predictions.listMine(request.user.walletAddress)).map(toPredictionDto),
    };
  }

  @Get("feed")
  @UseGuards(OptionalAuthGuard)
  async feed(@Req() request: OptionalAuthenticatedRequest) {
    return { data: await this.predictions.getFeed(request.user?.walletAddress) };
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  async get(@Param("id") id: string, @Req() request: OptionalAuthenticatedRequest) {
    return { data: await this.predictions.getById(id, request.user?.walletAddress) };
  }
}
