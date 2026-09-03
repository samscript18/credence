import { Controller, Get, Param } from "@nestjs/common";

import { MarketParamsDto } from "./dto/market-params.dto.js";
import { MarketsService } from "./markets.service.js";

@Controller("markets")
export class MarketsController {
  constructor(private readonly markets: MarketsService) {}

  @Get()
  async list() {
    return { data: await this.markets.list() };
  }

  @Get(":marketId")
  async get(@Param() params: MarketParamsDto) {
    return { data: await this.markets.get(params.marketId) };
  }
}
