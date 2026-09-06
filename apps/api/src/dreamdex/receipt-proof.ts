import { BadRequestException } from "@nestjs/common";
import { orderBookEventsAbi } from "@somnia-chain/markets-sdk";
import { parseAbi, parseEventLogs, type Log } from "viem";

// Exact signatures from installed SDK 0.29.0 eventsAbi.js / readsAbi.js.
// These two ABI subsets are not exported from the SDK package root.
export const binarySideAbi = parseAbi(["event BinaryOrderPlaced(uint128 indexed orderId, uint8 kind)"]);
export const historicalPoolAbi = parseAbi([
  "function getBinaryPoolParams() view returns ((address collateralToken, address market, address outcomeToken, uint256 yesId, uint256 noId, uint256 oneCollateral, uint256 setBacking, address feeRecipient, uint256 makerFeeBpsTimes1k, uint256 takerFeeBpsTimes1k, uint256 maxBuilderFeeBpsTimes1k, uint256 settlementFeeBpsTimes1k, address settlement, uint64 marketNonce, bool finalized))",
]);

/** Receipt-local taker fills only: never infer fills from balance or order size. */
export function receiptTradeProof(logs: Log[], pool: string, wallet: string, direction: "UP" | "DOWN") {
  const scoped = logs.filter(log => log.address.toLowerCase() === pool.toLowerCase());
  const orders = parseEventLogs({ abi: orderBookEventsAbi, eventName: "OrderPlaced", logs: scoped, strict: true });
  const sides = parseEventLogs({ abi: binarySideAbi, logs: scoped, strict: true });
  const fills = parseEventLogs({ abi: orderBookEventsAbi, eventName: "OrderFilled", logs: scoped, strict: true });
  const matching = orders.filter(({ args }) => args.placedOrder.owner.toLowerCase() === wallet.toLowerCase()
    && args.orderId === args.placedOrder.orderId
    && args.placedOrder.isBid === (direction === "UP")
    && sides.some(side => side.args.orderId === args.orderId && side.args.kind === (direction === "UP" ? 0 : 2)));
  // The composer submits one IOC order. Ambiguous multi-order receipts are not
  // silently collapsed into a single position or credited to a different draft.
  if (matching.length !== 1) throw new BadRequestException("Receipt must contain one matching DreamDEX order for the draft side and wallet");
  const order = matching[0]!;
  const filled = fills.filter(fill => fill.args.takerOrderId === order.args.orderId)
    .reduce((sum, fill) => sum + fill.args.quantityFilled, 0n);
  if (filled <= 0n || filled > order.args.placedOrder.fullQuantity) throw new BadRequestException("DreamDEX receipt has no valid positive fill");
  return { orderId: order.args.orderId.toString(), filledQuantity: filled.toString() };
}
