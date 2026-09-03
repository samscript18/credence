"use client";

import { AlertCircle, Radio } from "lucide-react";
import Link from "next/link";

import { usePredictionFeed } from "@/hooks/use-predictions";
import { apiErrorMessage } from "@/services/api";
import { PredictionCard } from "./prediction-card";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { HomeMarketSummary } from "./home-market-summary";

export function FeedScreen() {
  const feed = usePredictionFeed();
  return <div><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-lime-300"><Radio className="size-3.5" /> Predictor network</p><h1 className="mt-3 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Live conviction, with a record.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">Follow calls backed by actual DreamDEX positions. Every outcome eventually joins the public record.</p></div><Link href="/markets" className="text-sm font-semibold text-lime-300 hover:text-lime-200">Browse markets →</Link></div><HomeMarketSummary /><div className="mt-10 flex items-center justify-between border-b border-white/7 pb-3"><h2 className="text-sm font-semibold">Prediction feed</h2><span className="text-[10px] uppercase tracking-wider text-neutral-600">Wallet-specific access</span></div><div className="mt-4 grid gap-4 lg:grid-cols-2">{feed.isLoading ? <><Skeleton className="h-72" /><Skeleton className="h-72" /></> : null}{feed.isError ? <Card className="col-span-full p-10 text-center"><AlertCircle className="mx-auto size-7 text-orange-300" /><p className="mt-3 text-sm text-neutral-400">{apiErrorMessage(feed.error)}</p></Card> : null}{feed.isSuccess && feed.data.length === 0 ? <Card className="col-span-full p-10 text-center"><h2 className="font-semibold">No active predictions yet</h2><p className="mt-2 text-sm text-neutral-500">Publish the first call from a live Event Contract.</p></Card> : null}{feed.data?.map((prediction) => <PredictionCard key={prediction.id} prediction={prediction} />)}</div></div>;
}
