"use client";

import type { DreamDexMarketQuote } from "@credence/shared";
import { ArrowUpRight } from "lucide-react";

import { MarketCountdown } from "./market-countdown";

export function MarketCard({
  market,
  selected,
  onSelect,
}: {
  market: DreamDexMarketQuote;
  selected: boolean;
  onSelect: () => void;
}) {
  const upProb = market.probabilities ? Math.round(market.probabilities.yes * 100) : null;
  const downProb = market.probabilities ? Math.round(market.probabilities.no * 100) : null;

  return (
    <div
      id={`market-${market.marketId}`}
      className={`group flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 ${
        selected
          ? "border-signal/40 bg-[#16181D]"
          : "border-white/5 bg-[#0B0C0E] hover:border-white/10"
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] font-mono text-xs font-semibold text-foreground">
              {market.underlying.slice(0, 3).toUpperCase()}
            </div>
            <div>
              <p className="font-mono text-[13px] font-medium text-foreground">{market.underlying}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">15m contract</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-400/25 bg-emerald-400/[0.07] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-emerald-300">
            <span className="size-1 rounded-full bg-emerald-300" />
            {market.indexedStatus}
          </span>
        </div>

        {/* Title */}
        <p className="mt-4 min-h-10 text-[13px] leading-snug text-muted" title={market.title}>
          {market.title}
        </p>

        {/* Probabilities */}
        <div className="mt-4 grid grid-cols-2 gap-2 font-mono">
          <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.03] p-2.5">
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>UP</span>
              <span className="text-emerald-400">{upProb != null ? `${upProb}%` : "—"}</span>
            </div>
          </div>
          <div className="rounded-lg border border-rose-400/15 bg-rose-400/[0.03] p-2.5">
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>DOWN</span>
              <span className="text-rose-400">{downProb != null ? `${downProb}%` : "—"}</span>
            </div>
          </div>
        </div>

        {/* Probability bar */}
        {upProb != null && downProb != null && (
          <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div className="bg-emerald-400 transition-all duration-300" style={{ width: `${upProb}%` }} />
            <div className="bg-rose-400 transition-all duration-300" style={{ width: `${downProb}%` }} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-3.5">
        <MarketCountdown expiryAt={market.expiryAt} className="font-mono text-[11px] text-muted" />
        <button
          type="button"
          onClick={onSelect}
          className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-mono text-xs font-medium transition-all active:scale-[0.98] ${
            selected
              ? "bg-signal text-[#04131f] font-semibold"
              : "border border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.07]"
          }`}
        >
          {selected ? "Selected" : "Predict"}
          <ArrowUpRight className="size-3 text-muted" />
        </button>
      </div>
    </div>
  );
}
