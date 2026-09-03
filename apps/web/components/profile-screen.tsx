"use client";

import { AlertCircle, Target, Trophy, WalletCards } from "lucide-react";

import { useProfile } from "@/hooks/use-profile";
import { apiErrorMessage } from "@/services/api";
import { PredictionCard } from "./prediction-card";
import { PredictorAvatar } from "./predictor-avatar";
import { VerifiedBadge } from "./reputation-badge";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function ProfileScreen({ address }: { address: string }) {
  const profile = useProfile(address);
  if (profile.isLoading) return <div><Skeleton className="h-28" /><div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>;
  if (profile.isError || !profile.data) return <Card className="p-10 text-center"><AlertCircle className="mx-auto size-8 text-orange-300" /><h1 className="mt-4 font-bold">Profile unavailable</h1><p className="mt-2 text-sm text-neutral-500">{apiErrorMessage(profile.error)}</p></Card>;
  const user = profile.data;
  const name = user.displayName ?? `${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`;
  const stats = [
    { label: "Reputation", value: Math.round(user.reputationScore * 10) / 10, icon: Trophy },
    { label: "Accuracy", value: `${Math.round(user.accuracy * 10) / 10}%`, icon: Target },
    { label: "Resolved", value: user.resolvedPredictions, icon: WalletCards },
    { label: "Realized P&L", value: user.realizedPnl, icon: WalletCards },
  ];
  return <div><div className="flex items-center gap-4"><PredictorAvatar className="size-14 text-base" address={user.walletAddress} name={user.displayName} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-bold">{name}</h1>{user.verified ? <VerifiedBadge /> : null}</div><p className="mt-1 truncate font-mono text-xs text-neutral-600">{user.walletAddress}</p></div></div><div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <Card key={label} className="p-4"><Icon className="size-4 text-neutral-600" /><p className="mt-4 text-xl font-bold tabular-nums">{value}</p><p className="mt-1 text-xs text-neutral-600">{label}</p></Card>)}</div><section className="mt-10"><h2 className="text-sm font-semibold">Active predictions</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{user.activePredictions.length ? user.activePredictions.map((prediction) => <PredictionCard key={prediction.id} prediction={prediction} />) : <Card className="col-span-full p-8 text-center text-sm text-neutral-500">No active predictions.</Card>}</div></section><section className="mt-10"><h2 className="text-sm font-semibold">Permanent resolved history</h2><p className="mt-1 text-xs text-neutral-600">Wins and losses cannot be hidden.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{user.resolvedHistory.length ? user.resolvedHistory.map((prediction) => <PredictionCard key={prediction.id} prediction={prediction} />) : <Card className="col-span-full p-8 text-center text-sm text-neutral-500">No resolved history yet.</Card>}</div></section></div>;
}
