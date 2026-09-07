"use client";

import { ArrowUpRight, ExternalLink, Radio, RefreshCw, Signal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { usePredictionFeed } from "@/hooks/use-predictions";
import { PredictionCard } from "./prediction-card";
import { PredictionCardSkeleton } from "./prediction-card-skeleton";
import { HomeMarketSummary } from "./home-market-summary";
import { ContentState } from "./content-state";
import { Button } from "./ui/button";

const filters = ["All", "Public", "Locked"] as const;

export function FeedScreen() {
	const feed = usePredictionFeed();
	const [filter, setFilter] = useState<(typeof filters)[number]>("All");
	const predictions = feed.data?.filter((prediction) => filter === "All" || prediction.visibility === (filter === "Public" ? "PUBLIC" : "LOCKED"));

	const totalCalls = feed.data?.length ?? 0;
	const activeCalls = feed.data?.filter((p) => p.status === "ACTIVE").length ?? 0;
	const resolvedCalls = feed.data?.filter((p) => p.status === "RESOLVED").length ?? 0;
	const lockedCalls = feed.data?.filter((p) => p.visibility === "LOCKED").length ?? 0;

	return (
		<div className="space-y-8">
			{/* Vestra Header */}
			<header className="space-y-1.5">
				<h1 className="text-lg font-medium tracking-tight text-foreground">Signals + Edge, onchain</h1>
				<p className="max-w-3xl text-[13px] leading-snug text-muted">
					Real predictions from proven predictors on DreamDEX Event Contracts. Every call is backed by real trades on Somnia and feeds the Credence reputation identity.
				</p>
			</header>

			{/* Vestra Live Onchain Status Banner */}
			<section className="rounded-2xl border border-white/[0.06] bg-[#0B0C0E] p-5 sm:p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
						<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400">
							<span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
						</span>
						Live on Somnia Shannon · DreamDEX Event Contracts
					</div>
					<a
						href="https://shannon-explorer.somnia.network"
						target="_blank"
						rel="noopener noreferrer"
						className="group inline-flex items-center gap-1.5 font-mono text-[11px] text-muted transition-colors hover:text-foreground"
					>
						Somnia Shannon Explorer
						<ExternalLink className="size-3 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
					</a>
				</div>

				<div className="mt-5 grid grid-cols-3 divide-x divide-white/[0.06]">
					<div className="px-3 first:pl-0">
						<div className="font-mono text-2xl font-medium tracking-tight tabular-nums text-foreground sm:text-3xl">{feed.isLoading ? "—" : totalCalls}</div>
						<div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">total calls recorded</div>
					</div>
					<div className="px-3">
						<div className="font-mono text-2xl font-medium tracking-tight tabular-nums text-signal sm:text-3xl">{feed.isLoading ? "—" : activeCalls}</div>
						<div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">active positions</div>
					</div>
					<div className="px-3">
						<div className="font-mono text-2xl font-medium tracking-tight tabular-nums text-foreground sm:text-3xl">{feed.isLoading ? "—" : resolvedCalls}</div>
						<div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">permanent outcomes</div>
					</div>
				</div>
			</section>

			{/* Vestra 4 KPI Stat Blocks */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<div className="flex flex-col gap-5 rounded-xl border border-white/[0.04] bg-[#0B0C0E] p-5 transition-colors duration-200 hover:border-white/[0.08]">
					<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Active Signals</span>
					<div className="flex items-baseline gap-1.5">
						<span className="font-mono text-[28px] leading-none tracking-tight text-signal">{feed.isLoading ? "—" : activeCalls}</span>
						<span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted/70">live onchain</span>
					</div>
				</div>

				<div className="flex flex-col gap-5 rounded-xl border border-white/[0.04] bg-[#0B0C0E] p-5 transition-colors duration-200 hover:border-white/[0.08]">
					<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Resolved Calls</span>
					<div className="flex items-baseline gap-1.5">
						<span className="font-mono text-[28px] leading-none tracking-tight text-foreground">{feed.isLoading ? "—" : resolvedCalls}</span>
						<span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted/70">verified</span>
					</div>
				</div>

				<div className="flex flex-col gap-5 rounded-xl border border-white/[0.04] bg-[#0B0C0E] p-5 transition-colors duration-200 hover:border-white/[0.08]">
					<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Locked Insights</span>
					<div className="flex items-baseline gap-1.5">
						<span className="font-mono text-[28px] leading-none tracking-tight text-foreground">{feed.isLoading ? "—" : lockedCalls}</span>
						<span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted/70">gated edge</span>
					</div>
				</div>

				<div className="flex flex-col gap-5 rounded-xl border border-white/[0.04] bg-[#0B0C0E] p-5 transition-colors duration-200 hover:border-white/[0.08]">
					<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">DreamDEX Settlement</span>
					<div className="flex items-baseline gap-1.5">
						<span className="font-mono text-[28px] leading-none tracking-tight text-emerald-400">15m</span>
						<span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted/70">contracts</span>
					</div>
				</div>
			</div>

			{/* Quick Live Market Strip */}
			<HomeMarketSummary />

			{/* Live Signals Stream Section */}
			<section className="rounded-xl border border-white/5 bg-[#0B0C0E]" aria-labelledby="feed-heading">
				<div className="border-b border-white/5 px-5 pt-5 pb-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
						<div className="space-y-1.5">
							<span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
								<span className="relative inline-flex h-1.5 w-1.5">
									<span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-70" />
									<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
								</span>
								Live signals feed
							</span>
							<h2 id="feed-heading" className="text-[22px] font-medium tracking-tight text-foreground">
								Real-time predictions
							</h2>
							<p className="max-w-xl text-[13px] leading-relaxed text-muted">Every prediction backed by a DreamDEX position on Somnia Shannon Testnet.</p>
						</div>

						{/* Filters */}
						<div className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] p-1">
							{filters.map((value) => (
								<button
									key={value}
									type="button"
									aria-pressed={value === filter}
									onClick={() => setFilter(value)}
									className={`cursor-pointer rounded px-3 py-1 font-mono text-[11px] transition-colors ${
										value === filter ? "bg-white/[0.08] text-foreground font-medium" : "text-muted hover:text-foreground"
									}`}
								>
									{value}
								</button>
							))}
						</div>
					</div>
				</div>

				{feed.isError && (
					<div className="p-6">
						<ContentState
							error
							icon={<Signal className="size-5" />}
							title="Signals couldn't be refreshed."
							description={feed.data ? "You're seeing the last loaded predictions. Try refreshing before taking action." : "The network feed is temporarily unavailable. Please try again."}
							action={
								<Button variant="secondary" onClick={() => void feed.refetch()} disabled={feed.isFetching}>
									<RefreshCw className="mr-2 size-4" />
									Retry
								</Button>
							}
						/>
					</div>
				)}

				<div className="p-5 sm:p-6 grid auto-rows-fr items-stretch gap-5 lg:grid-cols-2">
					{feed.isLoading && (
						<>
							<PredictionCardSkeleton />
							<PredictionCardSkeleton />
						</>
					)}

					{feed.isSuccess && predictions?.length === 0 && (
						<div className="col-span-full">
							<ContentState
								icon={<Radio className="size-5" />}
								title={filter === "All" ? "The next signal could be yours." : `No ${filter.toLowerCase()} signals right now.`}
								description="Make a call on a live Event Contract and start building a record worth following."
								action={
									<Link href="/markets" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-signal px-5 text-xs font-semibold text-[#04131f]">
										Explore Markets
										<ArrowUpRight className="size-4" />
									</Link>
								}
							/>
						</div>
					)}

					{predictions?.map((prediction) => (
						<PredictionCard key={prediction.id} prediction={prediction} />
					))}
				</div>
			</section>

			<p className="border-t border-white/5 pt-4 font-mono text-[11px] leading-relaxed text-muted/60">Active insight can be gated. Resolved performance is permanent and public. Seeded demo predictions are clearly labeled.</p>
		</div>
	);
}
