"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { useMarkets } from "@/hooks/use-markets";
import { MarketCountdown } from "./market-countdown";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function HomeMarketSummary() {
  const markets = useMarkets();
  return <section className="mt-8" aria-labelledby="live-markets-title"><div className="mb-3 flex items-center justify-between"><h2 id="live-markets-title" className="text-sm font-semibold">Live market pulse</h2><Link href="/markets" className="inline-flex items-center text-xs font-semibold text-lime-300">View all <ArrowUpRight className="ml-1 size-3" /></Link></div><div className="grid gap-3 md:grid-cols-3">{markets.isLoading ? <><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></> : null}{markets.data?.slice(0, 3).map((market) => <Card key={market.marketId} className="p-4"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-semibold">{market.underlying}</p><MarketCountdown expiryAt={market.expiryAt} className="text-[10px] text-neutral-600" /></div><p className="mt-2 truncate text-xs text-neutral-500">{market.title}</p><div className="mt-3 flex gap-4 text-xs tabular-nums"><span className="font-semibold text-lime-300">UP {market.probabilities ? `${Math.round(market.probabilities.yes * 100)}%` : "—"}</span><span className="font-semibold text-orange-300">DOWN {market.probabilities ? `${Math.round(market.probabilities.no * 100)}%` : "—"}</span></div></Card>)}</div></section>;
}
