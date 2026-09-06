"use client";

import { BarChart3, RefreshCw, Signal } from "lucide-react";
import { useState } from "react";
import { MarketCard } from "@/components/market-card";
import { PredictionComposer } from "@/components/prediction-composer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkets } from "@/hooks/use-markets";
import { useComposerStore } from "@/stores/composer.store";
import { ContentState } from "./content-state";

function MarketsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-label="Loading markets">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-xl border border-white/5 bg-[#0B0C0E] p-5 space-y-4">
          <div className="flex gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-2 h-3 w-2/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function MarketsScreen() {
  const markets = useMarkets();
  const [sort, setSort] = useState<"default" | "expiry">("default");
  const selectedMarketId = useComposerStore((state) => state.selectedMarketId);
  const selectMarket = useComposerStore((state) => state.selectMarket);
  const clearMarket = useComposerStore((state) => state.clearMarket);
  const selectedMarket = markets.data?.find((market) => market.marketId === selectedMarketId);
  const ordered =
    sort === "expiry"
      ? [...(markets.data ?? [])].sort(
          (a, b) => new Date(a.expiryAt).getTime() - new Date(b.expiryAt).getTime()
        )
      : markets.data;

  return (
    <div className="space-y-8">
      {/* Vestra Page Header */}
      <header className="space-y-1.5">
        <h1 className="text-lg font-medium tracking-tight text-foreground">Markets · DreamDEX</h1>
        <p className="max-w-3xl text-[13px] leading-snug text-muted">
          Live DreamDEX Event Contracts on Somnia Shannon Testnet. Take a position, calibrate your confidence, and put your market view on record.
        </p>
      </header>

      {/* Overview Banner */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#0B0C0E] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400">
              <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
            </span>
            Live orderbooks on Somnia Shannon
          </div>
          <button
            type="button"
            onClick={() => void markets.refetch()}
            disabled={markets.isFetching}
            className="cursor-pointer inline-flex items-center gap-1.5 font-mono text-[11px] text-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${markets.isFetching ? "animate-spin" : ""}`} />
            Refresh quotes
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-white/[0.06]">
          <div className="px-3 first:pl-0">
            <div className="font-mono text-2xl font-medium tracking-tight tabular-nums text-foreground sm:text-3xl">
              {markets.isLoading ? "—" : markets.data?.length ?? 0}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Live contracts
            </div>
          </div>
          <div className="px-3">
            <div className="font-mono text-2xl font-medium tracking-tight tabular-nums text-signal sm:text-3xl">
              15m
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Contract window
            </div>
          </div>
          <div className="px-3">
            <div className="font-mono text-2xl font-medium tracking-tight tabular-nums text-foreground sm:text-3xl">
              USDso
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Collateral asset
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Sort bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-medium text-foreground">
            Available Contracts
          </span>
          <span className="rounded-sm border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            {markets.data?.length ?? 0}
          </span>
        </div>

        <label className="flex items-center gap-2 font-mono text-[11px] text-muted">
          Sort
          <select
            className="rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5 font-mono text-[11px] text-foreground outline-none hover:border-white/10"
            value={sort}
            onChange={(event) => setSort(event.target.value as "default" | "expiry")}
          >
            <option value="default" className="bg-[#0B0C0E]">Default order</option>
            <option value="expiry" className="bg-[#0B0C0E]">Ending soonest</option>
          </select>
        </label>
      </div>

      {/* Markets Content */}
      <div>
        {markets.isLoading && <MarketsSkeleton />}

        {markets.isError && (
          <div className="mb-5">
            <ContentState
              error
              icon={<Signal className="size-5" />}
              title="DreamDEX isn't responding."
              description={
                markets.data?.length
                  ? "You're seeing the last loaded markets. Refresh to check the latest state before trading."
                  : "Market data couldn't be refreshed. Please try again shortly."
              }
              action={
                <Button variant="secondary" onClick={() => void markets.refetch()} disabled={markets.isFetching}>
                  Retry
                </Button>
              }
            />
          </div>
        )}

        {markets.isSuccess && markets.data.length === 0 && (
          <ContentState
            icon={<BarChart3 className="size-5" />}
            title="No live Event Contracts right now."
            description="Check again shortly for new DreamDEX markets."
            action={
              <Button variant="secondary" onClick={() => void markets.refetch()} disabled={markets.isFetching}>
                Check again
              </Button>
            }
          />
        )}

        {Boolean(ordered?.length) && (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {ordered?.map((market) => (
              <MarketCard
                key={market.marketId}
                market={market}
                selected={selectedMarketId === market.marketId}
                onSelect={() => selectMarket(market.marketId)}
              />
            ))}
          </div>
        )}
      </div>

      <p className="border-t border-white/5 pt-4 font-mono text-[11px] leading-relaxed text-muted/60">
        Prices and probabilities originate directly from DreamDEX Event Contracts. Contracts reaching expiry transition to settlement until the oracle finalizes the outcome.
      </p>

      {selectedMarket && <PredictionComposer market={selectedMarket} onClose={clearMarket} />}
    </div>
  );
}
