export function refundDue(state: number, expiry: bigint, blockTime: bigint, marketStatus?: number): boolean {
  return state === 1 && (blockTime >= expiry || (marketStatus !== undefined && marketStatus !== 1));
}
