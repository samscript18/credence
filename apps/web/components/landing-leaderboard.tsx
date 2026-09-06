"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { LeaderboardRow } from "./leaderboard-row";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";

export function LandingLeaderboard() {
  const query = useLeaderboard();

  return (
    <div className="overflow-hidden bg-[#0B0C0E]">
      <div className="hidden grid-cols-[50px_minmax(180px,1.5fr)_1fr_1fr_1fr_1fr] gap-4 border-b border-white/5 bg-white/[0.015] px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted md:grid">
        <span>Rank</span>
        <span>Predictor</span>
        <span>Credence</span>
        <span>Accuracy</span>
        <span>Resolved</span>
        <span className="text-right">Realized P&amp;L</span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {query.isLoading && (
          <div className="space-y-2 p-5">
            <Skeleton className="h-12 rounded-lg bg-white/[0.02]" />
            <Skeleton className="h-12 rounded-lg bg-white/[0.02]" />
            <Skeleton className="h-12 rounded-lg bg-white/[0.02]" />
          </div>
        )}

        {query.data?.slice(0, 5).map((entry) => (
          <LeaderboardRow key={entry.walletAddress} entry={entry} />
        ))}

        {query.isError && (
          <div className="p-8 text-center font-mono text-xs text-muted">
            <p>Live rankings are temporarily unavailable.</p>
            <Button className="mt-4" variant="secondary" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {query.isSuccess && query.data.length === 0 && (
          <p className="p-8 text-center font-mono text-xs text-muted">
            The leaderboard begins with the first settled predictions.
          </p>
        )}
      </div>

      <Link
        href="/leaderboard"
        className="group flex items-center justify-center gap-1.5 border-t border-white/5 px-6 py-4 text-center font-mono text-xs text-signal transition-colors hover:bg-white/[0.02]"
      >
        <span>Explore the full leaderboard</span>
        <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
      </Link>
    </div>
  );
}
