"use client";

import type { LeaderboardEntry } from "@credence/shared";
import Link from "next/link";
import { PredictorAvatar } from "./predictor-avatar";
import { VerifiedBadge } from "./reputation-badge";

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const isTopRank = entry.rank === 1;

  return (
    <Link
      href={`/profile/${entry.walletAddress}`}
      className="grid grid-cols-[36px_1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02] md:grid-cols-[50px_minmax(180px,1.5fr)_1fr_1fr_1fr_1fr]"
    >
      {/* Rank indicator */}
      <div className="flex items-center">
        <span
          className={`flex size-6 items-center justify-center rounded-sm font-mono text-xs font-semibold ${
            isTopRank
              ? "border border-signal/40 bg-signal/10 text-signal"
              : "border border-white/10 bg-white/[0.02] text-muted"
          }`}
        >
          {entry.rank}
        </span>
      </div>

      {/* Predictor */}
      <div className="flex min-w-0 items-center gap-2.5">
        <PredictorAvatar
          address={entry.walletAddress}
          name={entry.displayName}
          avatarUrl={entry.avatarUrl}
          className="size-6"
        />
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] font-medium text-foreground">
            {entry.displayName ?? `${entry.walletAddress.slice(0, 6)}…${entry.walletAddress.slice(-4)}`}
          </p>
        </div>
        {entry.verified && <VerifiedBadge />}
      </div>

      {/* Credence Score */}
      <div className="text-right md:text-left">
        <span className="font-mono text-sm font-semibold tabular-nums text-signal">
          {entry.reputationScore.toFixed(1)}
        </span>
      </div>

      {/* Desktop columns */}
      <div className="hidden font-mono text-[12px] text-foreground tabular-nums md:block">
        {entry.accuracy.toFixed(1)}%
      </div>

      <div className="hidden font-mono text-[12px] text-muted tabular-nums md:block">
        {entry.resolvedPredictions} calls
      </div>

      <div className="hidden font-mono text-[12px] tabular-nums text-right md:block">
        <span className={entry.realizedPnl.startsWith("+") ? "text-emerald-400" : entry.realizedPnl.startsWith("-") ? "text-rose-400" : "text-muted"}>
          {entry.realizedPnl}
        </span>
      </div>
    </Link>
  );
}
