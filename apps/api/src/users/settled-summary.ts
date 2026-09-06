import type { VisiblePrediction } from "@credence/shared";
import { sumDecimalStrings } from "../reputation/reputation.calculator.js";

export function settledSummary(rows: VisiblePrediction[]) {
  const groups = new Map<string, { token: string; symbol: string; values: string[]; pendingClaims: number }>();
  let settlementAccountingMissing = 0;
  for (const row of rows) {
    const value = row.unrealizedPnl ?? (row.source === "DEMO_SEED" ? row.realizedPnl : undefined);
    // Never combine different currencies or replace missing accounting with zero.
    const token = row.collateralTokenAddress?.toLowerCase() ?? (row.source === "DEMO_SEED" ? "demo" : undefined);
    if (value === undefined || !token) { settlementAccountingMissing++; continue; }
    const group = groups.get(token) ?? { token, symbol: row.collateralSymbol || token, values: [], pendingClaims: 0 };
    group.values.push(value);
    if (!row.claimTransactionHash && row.settlementPayout !== undefined && /^\d+(?:\.\d+)?$/.test(row.settlementPayout) && /[1-9]/.test(row.settlementPayout)) group.pendingClaims++;
    groups.set(token, group);
  }
  return { settlementAccountingMissing, settledPnlByToken: [...groups.values()].map(group => ({ token: group.token, symbol: group.symbol, pnl: sumDecimalStrings(group.values), pendingClaims: group.pendingClaims })) };
}
