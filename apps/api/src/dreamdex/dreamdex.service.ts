import type {
  DreamDexMarket,
  DreamDexProbabilities,
  DreamDexSettlement,
} from "@credence/shared";
import {
  SOMNIA_TESTNET_ADDRESSES,
  SomniaMarkets,
  binaryModuleWriteAbi,
  erc6909Abi,
  isBinaryMarket,
  type BinaryMarket,
  type UnifiedMarket,
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createPublicClient, decodeFunctionData, erc20Abi, formatUnits, http, parseAbi, type Address, type Hex } from "viem";
import { netTokenReceived } from "./pnl.js";
import { assertRelayedClaimCalldata, assertRelayedClaimEconomics } from "./claim-proof.js";
import { historicalPoolAbi, receiptTradeProof } from "./receipt-proof.js";

import { DREAMDEX_INDEXER_URL, DREAMDEX_WS_RPC_URL } from "./dreamdex.constants.js";
import {
  toDreamDexMarket,
  toDreamDexProbabilities,
  toDreamDexSettlement,
} from "./dreamdex.mapper.js";

type VerifiableOrder = {
  market: string;
  owner: string;
  side: string | null | undefined;
  isBid: boolean;
  filledQuantity: string;
};

export type RedemptionSnapshot = {
  chainId: number;
  module: Address;
  marketAddress: Address;
  outcomeToken: Address;
  outcomeId: bigint;
  collateral: Address;
  finalized: boolean;
  resolved: boolean;
  voided: boolean;
  payoutNumerators: readonly bigint[];
  balance: bigint;
  collateralBalance: bigint;
  operatorApproved: boolean;
  outcomeAllowance: bigint;
};

export function isMatchingFilledPredictionOrder(
  order: VerifiableOrder,
  expected: { marketId: string; sender: string; direction: "UP" | "DOWN" },
): boolean {
  const expectedSide = expected.direction === "UP" ? "BUY_YES" : "BUY_NO";
  // DreamDEX's native binary book represents BUY_YES as a bid and BUY_NO as an
  // ask. `side` carries the user's economic direction; `isBid` must agree with it.
  const expectedIsBid = expected.direction === "UP";
  return (
    order.market.toLowerCase() === expected.marketId.toLowerCase() &&
    order.owner.toLowerCase() === expected.sender.toLowerCase() &&
    order.side === expectedSide &&
    order.isBid === expectedIsBid &&
    BigInt(order.filledQuantity) > 0n
  );
}

@Injectable()
export class DreamDexService {
  private exchange?: SomniaMarkets;
  private registry?: { at: number; markets: BinaryUnifiedMarket[] };
  private registryRequest?: Promise<BinaryUnifiedMarket[]>;

  constructor(private readonly config: ConfigService) {}

  private rpc() {
    return createPublicClient({ chain: somniaShannon, transport: http(this.config.get<string>("SOMNIA_RPC_URL", "https://dream-rpc.somnia.network")) });
  }

  async draftBlock(): Promise<string> {
    return (await this.rpc().getBlockNumber()).toString();
  }

  async entryCost(hash: `0x${string}`, token: string, wallet: string): Promise<string> {
    const receipt = await this.rpc().getTransactionReceipt({ hash });
    const cost = -netTokenReceived(receipt.logs, token, wallet);
    if (cost < 0n) throw new Error("Entry has an unexpected net token inflow");
    return cost.toString();
  }

  async theoreticalPnl(input: { marketId: string; marketAddress: string; direction: "UP" | "DOWN"; quantity: string; cost: string; decimals: number }): Promise<string> {
    return (await this.settledPosition(input)).unrealizedPnl;
  }

  async settledPosition(input: { marketId: string; marketAddress: string; direction: "UP" | "DOWN"; quantity: string; cost: string; decimals: number }): Promise<{ unrealizedPnl: string; settlementPayout: string }> {
    const state = await this.getExchange().client.getMarketOnchain(input.marketId as `0x${string}`);
    if (!state.finalized || state.marketAddress.toLowerCase() !== input.marketAddress.toLowerCase()) throw new Error("Window is not finalized");
    // Verified SDK binaryMarketReadAbi. Vector supports non-50/50 voids too.
    const vector = await this.rpc().readContract({ address: state.marketAddress, abi: parseAbi(["function payoutNumerators() view returns (uint256[])"]), functionName: "payoutNumerators" });
    const total = vector.reduce((sum, value) => sum + value, 0n);
    if (!total || vector.length !== 2) throw new Error("No finalized payout vector");
    const payout = BigInt(input.quantity) * vector[input.direction === "UP" ? 0 : 1]! / total;
    return { unrealizedPnl: formatUnits(payout - BigInt(input.cost), input.decimals), settlementPayout: formatUnits(payout, input.decimals) };
  }

  async verifyManualClaim(input: { hash: `0x${string}`; marketId: string; marketAddress: string; direction: "UP" | "DOWN"; quantity: string; cost: string; decimals: number; wallet: string }): Promise<string> {
    const client = this.rpc();
    const [state, receipt, tx] = await Promise.all([
      this.getExchange().client.getMarketOnchain(input.marketId as `0x${string}`),
      client.getTransactionReceipt({ hash: input.hash }), client.getTransaction({ hash: input.hash }),
    ]);
    if (!state.finalized || state.marketAddress.toLowerCase() !== input.marketAddress.toLowerCase() || receipt.status !== "success" || tx.from.toLowerCase() !== input.wallet.toLowerCase() || tx.to?.toLowerCase() !== SOMNIA_TESTNET_ADDRESSES.binaryModule?.toLowerCase()) throw new Error("Claim receipt does not match this wallet and window");
    const call = decodeFunctionData({ abi: parseAbi(["function redeem(uint32 operatorId, bytes32 venueId, bytes32 marketId, uint8 outcomeIdx, uint256 amount)"]), data: tx.input });
    if (call.args[2].toLowerCase() !== input.marketId.toLowerCase() || call.args[3] !== (input.direction === "UP" ? 0 : 1) || call.args[4] !== BigInt(input.quantity)) throw new Error("Claim must redeem exactly this prediction's filled quantity and side");
    const payout = netTokenReceived(receipt.logs, state.collateral, input.wallet);
    if (payout < 0n) throw new Error("Unexpected claim outflow");
    return formatUnits(payout - BigInt(input.cost), input.decimals);
  }

  async redemptionSnapshot(marketId: Hex, owner: Address, outcomeIdx: 0 | 1): Promise<RedemptionSnapshot> {
    const client = this.rpc();
    const state = await this.getExchange().client.getMarketOnchain(marketId);
    const module = SOMNIA_TESTNET_ADDRESSES.binaryModule;
    if (!module) throw new Error("DreamDEX binary module is not configured");
    const outcomeId = outcomeIdx === 0 ? state.yesId : state.noId;
    const [chainId, payoutNumerators, balance, collateralBalance, operatorApproved, outcomeAllowance] = await Promise.all([
      client.getChainId(),
      client.readContract({ address: state.marketAddress, abi: parseAbi(["function payoutNumerators() view returns (uint256[])"]), functionName: "payoutNumerators" }),
      client.readContract({ address: state.outcomeToken, abi: erc6909Abi, functionName: "balanceOf", args: [owner, outcomeId] }),
      client.readContract({ address: state.collateral, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
      client.readContract({ address: state.outcomeToken, abi: erc6909Abi, functionName: "isOperator", args: [owner, module] }),
      client.readContract({ address: state.outcomeToken, abi: erc6909Abi, functionName: "allowance", args: [owner, module, outcomeId] }),
    ]);
    return { chainId, module, marketAddress: state.marketAddress, outcomeToken: state.outcomeToken, outcomeId, collateral: state.collateral, finalized: state.finalized, resolved: state.isResolved, voided: state.isVoided, payoutNumerators, balance, collateralBalance, operatorApproved, outcomeAllowance };
  }

  async assertRedeemAuthorization(input: {
    module: Address; owner: Address; nonce: bigint; deadline: bigint; signature: Hex;
    operatorId: number; venueId: Hex; marketId: Hex; outcomeIdx: 0 | 1; amount: bigint;
  }): Promise<void> {
    await this.rpc().simulateContract({
      address: input.module,
      abi: binaryModuleWriteAbi,
      functionName: "redeemFor",
      args: [input.owner, input.nonce, input.deadline, input.signature, input.operatorId, input.venueId, input.marketId, input.outcomeIdx, input.amount],
    });
  }

  async verifyAutoClaim(input: {
    hash: Hex; marketId: Hex; marketAddress: Address; owner: Address; module: Address;
    outcomeIdx: 0 | 1; outcomeId: bigint; amount: bigint; nonce: bigint; deadline: bigint;
    operatorId: number; venueId: Hex; signature: Hex; outcomeToken: Address; collateral: Address;
    outcomeBefore: bigint; collateralBefore: bigint; cost: bigint; decimals: number;
  }): Promise<{ pnl: string; recovered: bigint; outcomeAfter: bigint; collateralAfter: bigint }> {
    const client = this.rpc();
    const [receipt, tx, state] = await Promise.all([
      client.getTransactionReceipt({ hash: input.hash }),
      client.getTransaction({ hash: input.hash }),
      this.getExchange().client.getMarketOnchain(input.marketId),
    ]);
    if (receipt.status !== "success" || tx.to?.toLowerCase() !== input.module.toLowerCase() || state.marketAddress.toLowerCase() !== input.marketAddress.toLowerCase() || state.outcomeToken.toLowerCase() !== input.outcomeToken.toLowerCase() || state.collateral.toLowerCase() !== input.collateral.toLowerCase()) throw new Error("Relayed claim receipt or market binding mismatch");
    assertRelayedClaimCalldata(tx.input, input);
    const recovered = netTokenReceived(receipt.logs, input.collateral, input.owner);
    const executorReceived = netTokenReceived(receipt.logs, input.collateral, tx.from);
    const [outcomeAfter, collateralAfter] = await Promise.all([
      client.readContract({ address: input.outcomeToken, abi: erc6909Abi, functionName: "balanceOf", args: [input.owner, input.outcomeId], blockNumber: receipt.blockNumber }),
      client.readContract({ address: input.collateral, abi: erc20Abi, functionName: "balanceOf", args: [input.owner], blockNumber: receipt.blockNumber }),
    ]);
    assertRelayedClaimEconomics({ ownerRecovered: recovered, executorRecovered: executorReceived, outcomeBefore: input.outcomeBefore, outcomeAfter, collateralBefore: input.collateralBefore, collateralAfter, amount: input.amount });
    return { pnl: formatUnits(recovered - input.cost, input.decimals), recovered, outcomeAfter, collateralAfter };
  }

  async assertTradingWindow(marketId: string, marketAddress?: string): Promise<void> {
    const state = await this.getExchange().client.getMarketOnchain(marketId as `0x${string}`);
    if (state.status !== 1 || state.finalized || state.expiry * 1000n <= BigInt(Date.now()) ||
      (marketAddress && state.marketAddress.toLowerCase() !== marketAddress.toLowerCase())) {
      throw new BadRequestException({ message: "This window has ended", code: "MARKET_EXPIRED" });
    }
  }

  async listEventMarkets(): Promise<DreamDexMarket[]> {
    const markets = await this.loadBinaryMarkets();
    return markets
      .filter((market) => market.active)
      .sort((left, right) => Number(right.info.expiry) - Number(left.info.expiry))
      .map(toDreamDexMarket);
  }

  async getEventMarket(marketId: string): Promise<DreamDexMarket> {
    // Immutable metadata must not depend on rediscovering every live market.
    const cached = this.registry?.markets.find(market => market.info.marketId === marketId);
    if (cached) return toDreamDexMarket(cached);
    {
      // Historical exact-ID lookup is for recording/recovery only. Empty
      // outcome symbols deliberately cannot be used to execute a new order.
      const market = await this.getExchange().client.getMarket(marketId);
      if (!market || !isBinaryMarket(market)) throw new NotFoundException("This window has ended or was not found.");
      return {
        marketId: market.marketId, marketAddress: market.marketAddress, poolAddress: market.poolAddress,
        symbol: market.asset, underlying: market.asset, title: market.question, venueId: market.venueId ?? null,
        collateralTokenAddress: market.collateral, collateralSymbol: "", collateralDecimals: market.quoteDecimals, baseDecimals: market.baseDecimals,
        tradingStartAt: new Date(Number(market.tradingStart) * 1000).toISOString(), expiryAt: new Date(Number(market.expiry) * 1000).toISOString(),
        indexedStatus: market.status, tradable: false, minimumQuantity: null, yesSymbol: "", noSymbol: "",
      };
    }
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

  async getMarketSettlement(marketId: string, marketAddress?: string): Promise<DreamDexSettlement> {
    try {
      const onchain = await this.getExchange().client.getMarketOnchain(
        marketId as `0x${string}`,
      );
      if (marketAddress && onchain.marketAddress.toLowerCase() !== marketAddress.toLowerCase()) {
        throw new Error("Market instance mismatch");
      }
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
    marketAddress?: string;
    afterBlock?: string;
    notBefore?: Date;
    transactionHash: `0x${string}`;
    marketId: string;
    sender: string;
    direction: "UP" | "DOWN";
  }): Promise<{ orderId: string; filledQuantity: string; filledAmount: string }> {
    const market = await this.getEventMarket(input.marketId);
    if (input.marketAddress && market.marketAddress.toLowerCase() !== input.marketAddress.toLowerCase()) throw new BadRequestException("Draft market does not match the trade window");
    const publicClient = this.rpc();
    const [receipt, transaction] = await Promise.all([
      publicClient.getTransactionReceipt({ hash: input.transactionHash }),
      publicClient.getTransaction({ hash: input.transactionHash }),
    ]);
    const sender = input.sender.toLowerCase();
    if (input.afterBlock !== undefined && receipt.blockNumber <= BigInt(input.afterBlock)) throw new BadRequestException("Trade predates the server draft");
    if (
      receipt.status !== "success" ||
      transaction.from.toLowerCase() !== sender ||
      transaction.to?.toLowerCase() !== market.poolAddress.toLowerCase()
    ) {
      throw new BadRequestException("Transaction does not match the authenticated DreamDEX trade");
    }
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
    if (input.notBefore && block.timestamp < BigInt(Math.floor(input.notBefore.getTime() / 1000))) throw new BadRequestException("Trade predates the server draft");
    if (block.timestamp * 1000n >= BigInt(Date.parse(market.expiryAt)) || block.timestamp * 1000n < BigInt(Date.parse(market.tradingStartAt))) throw new BadRequestException("Trade was not executed inside this window");

    // Pools are recycled. Logs alone identify an order and side, NOT the exact
    // market generation: bind them to pool state at the transaction's block.
    const historical = await publicClient.readContract({ address: market.poolAddress as `0x${string}`, abi: historicalPoolAbi, functionName: "getBinaryPoolParams", blockNumber: receipt.blockNumber }).catch(() => {
      throw new ServiceUnavailableException("Historical DreamDEX proof is temporarily unavailable. Retry linking this same transaction; do not trade again.");
    });
    if (historical.market.toLowerCase() !== market.marketAddress.toLowerCase()) throw new BadRequestException("Receipt belongs to a different exact market window");
    const matchedOrder = receiptTradeProof(receipt.logs, market.poolAddress, sender, input.direction);
    return {
      orderId: matchedOrder.orderId,
      filledQuantity: matchedOrder.filledQuantity,
      filledAmount: formatUnits(BigInt(matchedOrder.filledQuantity), market.baseDecimals),
    };
  }

  async findLatestFilledPredictionTrade(input: {
    marketId: string;
    sender: string;
    direction: "UP" | "DOWN";
  }): Promise<`0x${string}`> {
    const market = await this.findMarket(input.marketId);
    const rows = await this.getExchange().client.getOrders(input.sender, {
      pool: market.info.poolAddress,
      limit: 20,
    });
    const expectedSide = input.direction === "UP" ? "BUY_YES" : "BUY_NO";
    const expectedIsBid = input.direction === "UP";
    const match = rows.find((order) =>
      order.market.toLowerCase() === input.marketId.toLowerCase() &&
      order.side === expectedSide &&
      order.isBid === expectedIsBid &&
      BigInt(order.filledQuantity) > 0n &&
      /^0x[a-f\d]{64}$/i.test(order.placedTxHash),
    );
    if (!match) throw new NotFoundException({ message: "No recoverable filled DreamDEX trade was found", code: "BACK_TRADE_NOT_FOUND" });
    return match.placedTxHash as `0x${string}`;
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
    if (this.registry && Date.now() - this.registry.at < 15_000) return this.registry.markets;
    if (this.registryRequest) return this.registryRequest;
    const request = this.refreshBinaryMarkets();
    this.registryRequest = request;
    try { return await request; }
    finally { if (this.registryRequest === request) this.registryRequest = undefined; }
  }

  private async refreshBinaryMarkets(): Promise<BinaryUnifiedMarket[]> {
    try {
      const markets = Object.values(await this.getExchange().loadMarkets(true)).filter(
        (market): market is BinaryUnifiedMarket => isBinaryMarket(market.info),
      );
      this.registry = { at: Date.now(), markets };
      return markets;
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
