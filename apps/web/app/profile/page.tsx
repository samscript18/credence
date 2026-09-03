"use client";

import { ExternalLink, Wallet } from "lucide-react";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useMyPredictions } from "@/hooks/use-predictions";

export default function MyProfilePage() {
  const auth = useAuth();
  const predictions = useMyPredictions(Boolean(auth.data));

  if (!auth.data) return <Card className="p-10 text-center"><Wallet className="mx-auto size-8 text-neutral-600" /><h1 className="mt-4 text-xl font-bold">Sign in to view your profile</h1><p className="mt-2 text-sm text-neutral-500">Your connected wallet is your Credence identity.</p></Card>;
  return (
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-lime-300">Your profile</p><h1 className="mt-3 break-all text-2xl font-bold sm:text-3xl">{auth.data.walletAddress}</h1><h2 className="mt-10 text-sm font-semibold">Predictions</h2><div className="mt-4 space-y-3">{predictions.isLoading ? <><Skeleton className="h-36" /><Skeleton className="h-36" /></> : null}{predictions.data?.length === 0 ? <Card className="p-8 text-center text-sm text-neutral-500">Your confirmed predictions will appear here.</Card> : null}{predictions.data?.map((prediction) => <Card key={prediction.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{prediction.marketTitle}</p><p className="mt-1 text-xs text-neutral-500">{prediction.direction} · {prediction.confidence}% confidence</p></div><span className="rounded-full bg-lime-300/10 px-2.5 py-1 text-[10px] font-bold text-lime-300">{prediction.status}</span></div><div className="mt-4 flex items-center justify-between border-t border-white/7 pt-4 text-xs"><span className="text-neutral-500">Entry probability {Math.round(prediction.marketProbabilityAtEntry * 1000) / 10}%</span>{prediction.transactionHash ? <a className="inline-flex items-center text-neutral-300 hover:text-lime-300" href={`${somniaShannon.blockExplorers.default.url}/tx/${prediction.transactionHash}`} target="_blank" rel="noreferrer">Transaction <ExternalLink className="ml-1 size-3" /></a> : null}</div></Card>)}</div></div>
  );
}
