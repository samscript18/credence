"use client";

import { ArrowUpRight, RefreshCw } from "lucide-react";
import Link from "next/link";

import { useMarkets } from "@/hooks/use-markets";
import { MarketCountdown } from "./market-countdown";
import { Skeleton } from "./ui/skeleton";

export function HomeMarketSummary() {
  const markets = useMarkets();
  return (
    <section aria-labelledby="live-markets-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="live-markets-title" className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          <span className="size-1.5 rounded-full bg-signal" />
          Live Event Contracts
        </h2>
        <Link href="/markets" className="group inline-flex items-center gap-1 font-mono text-[11px] text-muted hover:text-foreground transition-colors">
          All markets
          <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
        </Link>
      </div>

      {markets.isError && (
        <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#0B0C0E] px-4 py-2.5 text-xs text-muted">
          <span>Market data couldn&apos;t be refreshed{markets.data?.length ? ". Showing the last available quotes." : "."}</span>
          <button type="button" disabled={markets.isFetching} onClick={() => void markets.refetch()} className="cursor-pointer inline-flex items-center gap-1.5 font-mono text-[11px] text-signal hover:underline disabled:opacity-50">
            <RefreshCw className="size-3" />
            Retry
          </button>
        </div>
      )}

      {markets.isSuccess && markets.data.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-[#0B0C0E] p-5 text-sm text-muted">
          No live Event Contracts right now. Check again shortly.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {markets.isLoading && [0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-32 rounded-xl bg-white/[0.02]" />
        ))}
        {markets.data?.slice(0, 3).map((market) => (
          <Link
            key={market.marketId}
            href="/markets"
            className="group flex flex-col justify-between rounded-xl border border-white/5 bg-[#0B0C0E] p-4 transition-colors duration-200 hover:border-white/10"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[13px] font-medium text-foreground">{market.underlying}</span>
              <span className="rounded-sm border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
                15m
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted/70" title={market.title}>
              {market.title}
            </p>

            {/* Probability split bar */}
            <div className="mt-3">
              <div className="flex justify-between font-mono text-[11px] tabular-nums">
                <span className="text-up">UP {market.probabilities ? `${Math.round(market.probabilities.yes * 100)}%` : "—"}</span>
                <span className="text-down">DOWN {market.probabilities ? `${Math.round(market.probabilities.no * 100)}%` : "—"}</span>
              </div>
              <div className="mt-1.5 flex h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="bg-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.round((market.probabilities?.yes ?? 0.5) * 100)}%` }}
                />
                <div
                  className="bg-rose-400 transition-all duration-300"
                  style={{ width: `${Math.round((market.probabilities?.no ?? 0.5) * 100)}%` }}
                />
              </div>
            </div>

            <MarketCountdown expiryAt={market.expiryAt} className="mt-3 font-mono text-[10px] text-muted" />
          </Link>
        ))}
      </div>
    </section>
  );
}
