"use client";

import { Radio, Signal, History } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { PredictionCard } from "./prediction-card";
import { PredictionHistoryRow } from "./prediction-history-row";
import { ProfileHeader } from "./profile-header";
import { ContentState } from "./content-state";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export function ProfileScreen({ address }: { address: string }) {
	const profile = useProfile(address);

	if (profile.isLoading) {
		return (
			<div className="space-y-8" aria-label="Loading predictor profile">
				<Skeleton className="h-64 rounded-2xl bg-white/[0.02]" />
				<div className="grid gap-4 sm:grid-cols-2">
					<Skeleton className="h-56 rounded-xl bg-white/[0.02]" />
					<Skeleton className="h-56 rounded-xl bg-white/[0.02]" />
				</div>
			</div>
		);
	}

	if (!profile.data) {
		return (
			<div className="rounded-xl border border-white/5 bg-[#0B0C0E] p-8">
				<ContentState
					error
					icon={<Signal className="size-5" />}
					title="Profile unavailable"
					description="We couldn't load this predictor's track record. Check the address or try again."
					action={
						<Button variant="secondary" onClick={() => void profile.refetch()} disabled={profile.isFetching}>
							Retry
						</Button>
					}
				/>
			</div>
		);
	}

	const user = profile.data;

	return (
		<div className="space-y-8">
			{profile.isError && (
				<p role="status" className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 font-mono text-xs text-rose-300">
					The latest profile update failed. Showing the last loaded record.
					<button type="button" onClick={() => void profile.refetch()} className="ml-2 underline text-signal">
						Retry
					</button>
				</p>
			)}

			{/* Profile Header */}
			<ProfileHeader user={user} />

			{/* Active Insight Section */}
			<section aria-labelledby="active-heading" className="space-y-4">
				<div className="flex items-center justify-between border-b border-white/5 pb-3">
					<h2 id="active-heading" className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
						Active Predictions ({user.activePredictions.length})
					</h2>
					<span className="font-mono text-[11px] text-signal">Live in market</span>
				</div>

				<div className="grid auto-rows-fr items-stretch gap-4 lg:grid-cols-2">
					{user.activePredictions.length ? (
						user.activePredictions.map((prediction) => <PredictionCard key={prediction.id} prediction={prediction} />)
					) : (
						<div className="col-span-full rounded-xl border border-white/5 bg-[#0B0C0E] p-6">
							<ContentState
								icon={<Radio className="size-5" />}
								title="No active calls right now."
								description="Active public and locked predictions will appear here when this predictor enters a live DreamDEX market."
							/>
						</div>
					)}
				</div>
			</section>

			{/* Historical Track Record Section */}
			<section aria-labelledby="history-heading" className="space-y-4">
				<div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-3">
					<div>
						<h2 id="history-heading" className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
							Permanent Track Record
						</h2>
						<p className="mt-1 text-[12px] text-muted/70">Every settled call remains onchain. Wins and losses included without deletion.</p>
					</div>
					<span className="font-mono text-[11px] text-muted">{user.resolvedHistory.length} settled calls</span>
				</div>

				{user.resolvedHistory.length ? (
					<div className="rounded-xl border border-white/5 bg-[#0B0C0E] overflow-hidden divide-y divide-white/[0.04]">
						{user.resolvedHistory.map((prediction) => (
							<PredictionHistoryRow key={prediction.id} prediction={prediction} />
						))}
					</div>
				) : (
					<div className="rounded-xl border border-white/5 bg-[#0B0C0E] p-8">
						<ContentState icon={<History className="size-5" />} title="Nothing has settled yet." description="Settled predictions become permanent reputation evidence here." />
					</div>
				)}
			</section>
		</div>
	);
}
