"use client";

import { AlertCircle, BarChart3, RefreshCw } from "lucide-react";

import { MarketCard } from "@/components/market-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkets } from "@/hooks/use-markets";
import { apiErrorMessage } from "@/services/api";
import { useComposerStore } from "@/stores/composer.store";

function MarketsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading markets">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="p-5">
          <div className="flex gap-3"><Skeleton className="size-10 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-4/5" /><Skeleton className="mt-2 h-3 w-2/5" /></div></div>
          <div className="mt-5 grid grid-cols-2 gap-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
          <Skeleton className="mt-5 h-8 w-full" />
        </Card>
      ))}
    </div>
  );
}

export function MarketsScreen() {
  const markets = useMarkets();
  const selectedMarketId = useComposerStore((state) => state.selectedMarketId);
  const selectMarket = useComposerStore((state) => state.selectMarket);

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-lime-300">
            <span className="size-1.5 rounded-full bg-lime-300" /> Live on DreamDEX
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Event markets</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500 sm:text-base">
            Read the market, make your call, and build a prediction record that settles in public.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void markets.refetch()} disabled={markets.isFetching}>
          <RefreshCw className={`mr-2 size-4 ${markets.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mt-8 flex items-center justify-between border-b border-white/7 pb-4">
        <p className="text-sm font-semibold">Available now</p>
        <p className="text-xs text-neutral-600">{markets.data?.length ?? 0} contracts · updates every 15s</p>
      </div>

      <div className="mt-5">
        {markets.isLoading ? <MarketsSkeleton /> : null}

        {markets.isError ? (
          <Card className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="size-8 text-orange-300" />
            <h2 className="mt-4 font-semibold">Markets could not be loaded</h2>
            <p className="mt-2 max-w-md text-sm text-neutral-500">{apiErrorMessage(markets.error)}</p>
            <Button className="mt-5" onClick={() => void markets.refetch()}>Try again</Button>
          </Card>
        ) : null}

        {markets.isSuccess && markets.data.length === 0 ? (
          <Card className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <BarChart3 className="size-8 text-neutral-600" />
            <h2 className="mt-4 font-semibold">No tradable Event Contracts</h2>
            <p className="mt-2 text-sm text-neutral-500">DreamDEX has no live contracts right now. Check back shortly.</p>
          </Card>
        ) : null}

        {markets.isSuccess && markets.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {markets.data.map((market) => (
              <MarketCard
                key={market.marketId}
                market={market}
                selected={selectedMarketId === market.marketId}
                onSelect={() => selectMarket(market.marketId)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {selectedMarketId ? (
        <div className="fixed inset-x-4 bottom-20 z-20 mx-auto max-w-lg rounded-2xl border border-lime-300/20 bg-[#171a13] p-3 shadow-2xl lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 pl-1"><p className="text-[10px] font-bold uppercase tracking-wider text-lime-300">Prediction draft</p><p className="truncate text-xs text-neutral-400">Market selected and ready for the composer</p></div>
            <Button disabled title="Prediction composer is introduced in Phase 5">Continue</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
