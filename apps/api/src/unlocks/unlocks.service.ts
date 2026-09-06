// Legacy receipt-audit helper only. No direct-transfer unlock endpoint remains.
import { decodeEventLog, erc20Abi, isHex, type Hex } from "viem";

export function isMatchingUnlockTransfer(
  log: { address: string; data: `0x${string}`; topics: readonly unknown[] },
  expected: { token: string; buyer: string; recipient: string; minimumAmount: bigint },
): boolean {
  if (log.address.toLowerCase() !== expected.token.toLowerCase()) return false;
  try {
    const topics = log.topics.filter((topic): topic is Hex => typeof topic === "string" && isHex(topic));
    if (topics.length === 0) return false;
    const decoded = decodeEventLog({ abi: erc20Abi, eventName: "Transfer", data: log.data, topics: topics as [Hex, ...Hex[]] });
    return decoded.args.from.toLowerCase() === expected.buyer.toLowerCase() && decoded.args.to.toLowerCase() === expected.recipient.toLowerCase() && decoded.args.value >= expected.minimumAmount;
  } catch { return false; }
}
