import type {
  DreamDexMarket,
  DreamDexProbabilities,
  DreamDexSettlement,
} from "@credence/shared";
import {
  SOMNIA_TESTNET_ADDRESSES,
  SomniaMarkets,
  isBinaryMarket,
  type BinaryMarket,
  type UnifiedMarket,
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DREAMDEX_INDEXER_URL, DREAMDEX_WS_RPC_URL } from "./dreamdex.constants.js";
import {
  toDreamDexMarket,
  toDreamDexProbabilities,
  toDreamDexSettlement,
} from "./dreamdex.mapper.js";

@Injectable()
export class DreamDexService {
  private exchange?: SomniaMarkets;

  constructor(private readonly config: ConfigService) {}

  async listEventMarkets(): Promise<DreamDexMarket[]> {
    const markets = await this.loadBinaryMarkets();
    return markets
      .filter((market) => market.active)
      .sort((left, right) => Number(right.info.expiry) - Number(left.info.expiry))
      .map(toDreamDexMarket);
  }

  async getEventMarket(marketId: string): Promise<DreamDexMarket> {
    return toDreamDexMarket(await this.findMarket(marketId));
  }

  async getMarketProbabilities(marketId: string): Promise<DreamDexProbabilities> {
    const market = await this.findMarket(marketId);
    const yesSymbol = market.outcomes?.find((outcome) => outcome.index === 0)?.symbol;
    if (!yesSymbol) {
      throw new ServiceUnavailableException("DreamDEX market has no UP/YES outcome");
    }

    try {
      const book = await this.getExchange().fetchOrderBook(yesSymbol, 5);
      return toDreamDexProbabilities(market.info.marketId, book);
    } catch (error) {
      throw new ServiceUnavailableException({
        message: "DreamDEX probability data is temporarily unavailable",
        code: "DREAMDEX_BOOK_UNAVAILABLE",
        cause: error,
      });
    }
  }

  async getMarketSettlement(marketId: string): Promise<DreamDexSettlement> {
    try {
      const onchain = await this.getExchange().client.getMarketOnchain(
        marketId as `0x${string}`,
      );
      return toDreamDexSettlement(marketId, onchain);
    } catch (error) {
      throw new ServiceUnavailableException({
        message: "DreamDEX settlement state is temporarily unavailable",
        code: "DREAMDEX_SETTLEMENT_UNAVAILABLE",
        cause: error,
      });
    }
  }

  private async findMarket(marketId: string): Promise<BinaryUnifiedMarket> {
    const market = (await this.loadBinaryMarkets()).find(
      (candidate) => candidate.id === marketId || candidate.info.marketId === marketId,
    );
    if (!market) {
      throw new NotFoundException({
        message: "DreamDEX Event Contract was not found",
        code: "DREAMDEX_MARKET_NOT_FOUND",
      });
    }
    return market;
  }

  private async loadBinaryMarkets(): Promise<BinaryUnifiedMarket[]> {
    try {
      return Object.values(await this.getExchange().loadMarkets(true)).filter(
        (market): market is BinaryUnifiedMarket => isBinaryMarket(market.info),
      );
    } catch (error) {
      throw new ServiceUnavailableException({
        message: "DreamDEX markets are temporarily unavailable",
        code: "DREAMDEX_UNAVAILABLE",
        cause: error,
      });
    }
  }

  private getExchange(): SomniaMarkets {
    this.exchange ??= new SomniaMarkets({
      indexerUrl: this.config.get<string>("DREAMDEX_INDEXER_URL", DREAMDEX_INDEXER_URL),
      wsRpcUrl: this.config.get<string>("DREAMDEX_WS_RPC_URL", DREAMDEX_WS_RPC_URL),
      chain: somniaShannon,
      // The SDK deployment manifest is the source of protocol addresses.
      addresses: SOMNIA_TESTNET_ADDRESSES,
    });
    return this.exchange;
  }
}

type BinaryUnifiedMarket = UnifiedMarket & { info: BinaryMarket };
