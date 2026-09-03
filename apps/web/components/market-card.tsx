"use client";

import type { DreamDexMarketQuote } from "@credence/shared";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MarketProbability } from "./market-probability";

function useCountdown(expiryAt: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, new Date(expiryAt).getTime() - now);
  if (remaining === 0) return "Awaiting settlement";
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}:${seconds.toString().padStart(2, "0")} remaining`;
}

export function MarketCard({
  market,
  selected,
  onSelect,
}: {
  market: DreamDexMarketQuote;
  selected: boolean;
  onSelect: () => void;
}) {
  const countdown = useCountdown(market.expiryAt);
  return (
    <Card className={cn("group p-5 transition-colors hover:border-white/15", selected && "border-lime-300/35 bg-lime-300/[.025]") }>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/9 bg-white/5 text-xs font-extrabold text-neutral-300">
            {market.underlying.slice(0, 3).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-100">{market.title}</p>
            <p className="mt-1 truncate text-xs text-neutral-600">{market.symbol}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-lime-300/15 bg-lime-300/[.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lime-300">
          {market.indexedStatus}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <MarketProbability label="UP" value={market.probabilities?.yes ?? null} tone="up" />
        <MarketProbability label="DOWN" value={market.probabilities?.no ?? null} tone="down" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/7 pt-4">
        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Clock3 className="size-3.5" /> {countdown}
        </span>
        <Button variant={selected ? "primary" : "ghost"} className="h-8 px-3 text-xs" onClick={onSelect}>
          {selected ? "Selected" : "Select market"}<ArrowUpRight className="ml-1.5 size-3.5" />
        </Button>
      </div>
    </Card>
  );
}
