import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { CreatePredictionDto } from "./dto/create-prediction.dto.js";
import { toPredictionDto } from "./prediction.dto.js";
import { PredictionsService } from "./predictions.service.js";

@Controller("predictions")
@UseGuards(AuthGuard)
export class PredictionsController {
  constructor(private readonly predictions: PredictionsService) {}

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() input: CreatePredictionDto) {
    return { data: toPredictionDto(await this.predictions.create(request.user.walletAddress, input)) };
  }

  @Get("me")
  async mine(@Req() request: AuthenticatedRequest) {
    return {
      data: (await this.predictions.listMine(request.user.walletAddress)).map(toPredictionDto),
    };
  }
}
