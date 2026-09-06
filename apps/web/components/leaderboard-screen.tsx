"use client";

import { ArrowUpRight, Signal } from "lucide-react";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { ContentState } from "./content-state";
import { LeaderboardRow } from "./leaderboard-row";
import { CredenceScore } from "./credence-score";
import { PredictorAvatar } from "./predictor-avatar";
import { VerifiedBadge } from "./reputation-badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export function LeaderboardScreen() {
  const leaderboard = useLeaderboard();

  return (
    <div className="space-y-8">
      {/* Vestra Header */}
      <header className="space-y-1.5">
        <h1 className="text-lg font-medium tracking-tight text-foreground">Top Predictors · Leaderboard</h1>
        <p className="max-w-3xl text-[13px] leading-snug text-muted">
          Prediction skill ranked by permanent evidence. Scores reflect performance against market expectations across live DreamDEX Event Contracts on Somnia.
        </p>
      </header>

      {leaderboard.isLoading && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-64 rounded-xl bg-white/[0.02]" />
          ))}
        </div>
      )}

      {leaderboard.isError && (
        <div className="rounded-xl border border-white/5 bg-[#0B0C0E] p-6">
          <ContentState
            error
            icon={<Signal className="size-5" />}
            title="Rankings couldn't be refreshed."
            description={
              leaderboard.data
                ? "Showing the last loaded standings. Try again for the latest rankings."
                : "The leaderboard is temporarily unavailable."
            }
            action={
              <Button variant="secondary" onClick={() => void leaderboard.refetch()} disabled={leaderboard.isFetching}>
                Retry
              </Button>
            }
          />
        </div>
      )}

      {Boolean(leaderboard.data?.length) && (
        <>
          {/* Top 3 Spotlight Podium */}
          <div className="grid gap-3 md:grid-cols-3">
            {leaderboard.data?.slice(0, 3).map((entry) => (
              <Link
                key={entry.walletAddress}
                href={`/profile/${entry.walletAddress}`}
                className={`group flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 hover:border-white/15 ${
                  entry.rank === 1
                    ? "border-signal/25 bg-[#16181D]"
                    : "border-white/5 bg-[#0B0C0E]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                      Rank #{entry.rank}
                    </span>
                    <ArrowUpRight className="size-3.5 text-muted transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
                  </div>

                  <div className="my-3 flex justify-center">
                    <CredenceScore score={entry.reputationScore} />
                  </div>

                  <div className="flex items-center gap-3">
                    <PredictorAvatar
                      address={entry.walletAddress}
                      name={entry.displayName}
                      avatarUrl={entry.avatarUrl}
                      className="size-8"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium text-foreground">
                        {entry.displayName ?? `${entry.walletAddress.slice(0, 6)}…${entry.walletAddress.slice(-4)}`}
                      </p>
                      {entry.verified && (
                        <div className="mt-0.5">
                          <VerifiedBadge />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-between border-t border-white/5 pt-3 font-mono text-[11px] text-muted">
                  <span>
                    <b className="font-normal text-foreground">{entry.accuracy.toFixed(1)}%</b> accuracy
                  </span>
                  <span>
                    <b className="font-normal text-foreground">{entry.resolvedPredictions}</b> resolved
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Table Section */}
          <section className="rounded-xl border border-white/5 bg-[#0B0C0E] overflow-hidden" aria-labelledby="rankings-heading">
            <div className="border-b border-white/5 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Credence Directory</span>
                <h2 id="rankings-heading" className="text-base font-medium text-foreground mt-0.5">
                  Complete Rankings
                </h2>
              </div>
              <span className="font-mono text-[11px] text-muted">
                {leaderboard.data?.length ?? 0} predictors ranked
              </span>
            </div>

            <div className="hidden grid-cols-[50px_minmax(180px,1.5fr)_1fr_1fr_1fr_1fr] gap-4 border-b border-white/5 bg-white/[0.015] px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted md:grid">
              <span>Rank</span>
              <span>Predictor</span>
              <span>Credence</span>
              <span>Accuracy</span>
              <span>Resolved</span>
              <span className="text-right" title="Claimed positions only; not total settled performance">Claimed P&amp;L</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {leaderboard.data?.map((entry) => (
                <LeaderboardRow key={entry.walletAddress} entry={entry} />
              ))}
            </div>
          </section>
        </>
      )}

      {leaderboard.isSuccess && leaderboard.data.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-[#0B0C0E] p-8">
          <ContentState
            icon={<Signal className="size-5" />}
            title="The first place is still open."
            description="Build your prediction history on live Event Contracts. Let your record earn your rank."
            action={
              <Link
                href="/markets"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-signal px-5 font-mono text-xs font-semibold text-[#04131f]"
              >
                Explore Markets
              </Link>
            }
          />
        </div>
      )}

      <p className="border-t border-white/5 pt-4 font-mono text-[11px] leading-relaxed text-muted/60">
        Verified Predictor status is earned with at least 80 Credence reputation and 25 settled predictions on Somnia.
      </p>
    </div>
  );
}
