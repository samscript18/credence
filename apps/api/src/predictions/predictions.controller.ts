import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedRequest, OptionalAuthenticatedRequest } from "../auth/auth.types.js";
import { OptionalAuthGuard } from "../auth/optional-auth.guard.js";
import { CreatePredictionDto } from "./dto/create-prediction.dto.js";
import { toPredictionDto } from "./prediction.dto.js";
import { PredictionsService } from "./predictions.service.js";

@Controller("predictions")
export class PredictionsController {
  constructor(private readonly predictions: PredictionsService) {}

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
