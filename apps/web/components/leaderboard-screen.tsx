"use client";

import { AlertCircle, Crown } from "lucide-react";
import Link from "next/link";

import { useLeaderboard } from "@/hooks/use-leaderboard";
import { apiErrorMessage } from "@/services/api";
import { PredictorAvatar } from "./predictor-avatar";
import { VerifiedBadge } from "./reputation-badge";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function LeaderboardScreen() {
  const leaderboard = useLeaderboard();
  return <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-lime-300"><Crown className="size-3.5" /> Credence ranking</p><h1 className="mt-3 text-3xl font-bold tracking-[-.04em] sm:text-4xl">The record speaks.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">Ranked by Brier improvement over DreamDEX, then resolved volume and accuracy.</p><Card className="mt-8 overflow-hidden"><div className="hidden grid-cols-[60px_1.5fr_repeat(4,minmax(90px,1fr))] gap-3 border-b border-white/8 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-600 md:grid"><span>Rank</span><span>Predictor</span><span>Reputation</span><span>Accuracy</span><span>Resolved</span><span>P&amp;L</span></div>{leaderboard.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : null}{leaderboard.isError ? <div className="p-10 text-center"><AlertCircle className="mx-auto size-7 text-orange-300" /><p className="mt-3 text-sm text-neutral-500">{apiErrorMessage(leaderboard.error)}</p></div> : null}{leaderboard.data?.map((entry) => <Link href={`/profile/${entry.walletAddress}`} key={entry.walletAddress} className="grid gap-4 border-b border-white/7 px-5 py-4 transition-colors last:border-0 hover:bg-white/[.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime-300 md:grid-cols-[60px_1.5fr_repeat(4,minmax(90px,1fr))] md:items-center md:gap-3"><div className="text-lg font-black text-neutral-500">#{entry.rank}</div><div className="flex min-w-0 items-center gap-3"><PredictorAvatar address={entry.walletAddress} name={entry.displayName} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{entry.displayName ?? `${entry.walletAddress.slice(0, 6)}…${entry.walletAddress.slice(-4)}`}</p>{entry.verified ? <div className="mt-1"><VerifiedBadge /></div> : null}</div></div><Stat label="Reputation" value={String(Math.round(entry.reputationScore * 10) / 10)} accent /><Stat label="Accuracy" value={`${Math.round(entry.accuracy * 10) / 10}%`} /><Stat label="Resolved" value={String(entry.resolvedPredictions)} /><Stat label="P&L" value={entry.realizedPnl} /></Link>)}{leaderboard.isSuccess && leaderboard.data.length === 0 ? <div className="p-10 text-center text-sm text-neutral-500">No ranked predictors yet.</div> : null}</Card></div>;
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-[10px] uppercase tracking-wider text-neutral-600 md:hidden">{label}</p><p className={`mt-1 text-sm font-semibold tabular-nums md:mt-0 ${accent ? "text-lime-300" : "text-neutral-300"}`}>{value}</p></div>;
}
