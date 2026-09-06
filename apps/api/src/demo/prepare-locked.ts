import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { DreamDexService } from "../dreamdex/dreamdex.service.js";

// Discovery only: never manufacture an ACTIVE DEMO_SEED prediction.
async function prepare(): Promise<void> {
  const windowSeconds = Number(process.env.DEMO_WINDOW_SECONDS ?? "3600");
  if (!Number.isInteger(windowSeconds) || windowSeconds <= 0) throw new Error("Invalid DEMO_WINDOW_SECONDS");
  const minimumRemaining = Number(process.env.DEMO_MIN_MARKET_REMAINING_SECONDS ?? "900");
  if (!Number.isInteger(minimumRemaining) || minimumRemaining < 60) throw new Error("Invalid DEMO_MIN_MARKET_REMAINING_SECONDS");
  const dex = new DreamDexService(new ConfigService(process.env));
  for (const market of await dex.listEventMarkets()) {
    if ((Date.parse(market.expiryAt) - Date.parse(market.tradingStartAt)) / 1000 !== windowSeconds) continue;
    if (Date.parse(market.expiryAt) - Date.now() <= minimumRemaining * 1000) continue;
    try {
      await dex.assertTradingWindow(market.marketId, market.marketAddress);
      const quote = await dex.getMarketProbabilities(market.marketId);
      if (quote.bestYesBid === null || quote.bestYesAsk === null) continue;
      console.log(JSON.stringify({ market, nextStep: "Open this exact market and Publish & Trade with a verified wallet. No prediction or transaction has been created." }, null, 2));
      return;
    } catch { /* Do not use an unavailable window. */ }
  }
  throw new Error(`No Trading ${windowSeconds}-second market with a two-sided book is available. No record was created.`);
}

prepare().then(() => process.exit(0)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Demo discovery failed");
  process.exit(1);
});
