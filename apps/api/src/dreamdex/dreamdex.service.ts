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
import { createPublicClient, http } from "viem";

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

  async verifyPredictionTrade(input: {
    transactionHash: `0x${string}`;
    marketId: string;
    sender: string;
    direction: "UP" | "DOWN";
  }): Promise<{ orderId: string; filledQuantity: string }> {
    const market = await this.findMarket(input.marketId);
    const publicClient = createPublicClient({
      chain: somniaShannon,
      transport: http(
        this.config.get<string>("SOMNIA_RPC_URL", "https://dream-rpc.somnia.network"),
      ),
    });
    const [receipt, transaction] = await Promise.all([
      publicClient.getTransactionReceipt({ hash: input.transactionHash }),
      publicClient.getTransaction({ hash: input.transactionHash }),
    ]);
    const sender = input.sender.toLowerCase();
    if (
      receipt.status !== "success" ||
      transaction.from.toLowerCase() !== sender ||
      transaction.to?.toLowerCase() !== market.info.poolAddress.toLowerCase()
    ) {
      throw new Error("Transaction does not match the authenticated DreamDEX trade");
    }

    const expectedSide = input.direction === "UP" ? "BUY_YES" : "BUY_NO";
    let matchedOrder:
      | Awaited<ReturnType<SomniaMarkets["client"]["getTransactionActivity"]>>["ordersPlaced"][number]
      | undefined;
    for (let attempt = 0; attempt < 5 && !matchedOrder; attempt += 1) {
      const activity = await this.getExchange().client.getTransactionActivity(input.transactionHash);
      matchedOrder = activity.ordersPlaced.find(
        (order) =>
          order.market.toLowerCase() === input.marketId.toLowerCase() &&
          order.owner.toLowerCase() === sender &&
          order.isBid &&
          order.side === expectedSide &&
          BigInt(order.filledQuantity) > 0n,
      );
      if (!matchedOrder && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
    if (!matchedOrder) throw new Error("DreamDEX trade fill is not indexed yet or does not match");
    return { orderId: matchedOrder.orderId, filledQuantity: matchedOrder.filledQuantity };
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
