import { decodeEventLog, erc20Abi, type Hex } from "viem";

export function netTokenReceived(logs: readonly { address: string; data: Hex; topics: readonly Hex[] }[], token: string, wallet: string): bigint {
  let value = 0n;
  for (const log of logs) {
    if (log.address.toLowerCase() !== token.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: erc20Abi, eventName: "Transfer", data: log.data, topics: log.topics as [Hex, ...Hex[]] });
      if (decoded.args.to.toLowerCase() === wallet.toLowerCase()) value += decoded.args.value;
      if (decoded.args.from.toLowerCase() === wallet.toLowerCase()) value -= decoded.args.value;
    } catch { /* Not an ERC20 transfer. */ }
  }
  return value;
}
