import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight, LockKeyhole, Radio, Shield, TrendingUp, Zap } from "lucide-react";
import { CredenceLogo } from "@/components/credence-logo";
import { LandingPreview } from "@/components/landing-preview";
import { LandingLeaderboard } from "@/components/landing-leaderboard";
import { CredenceHero } from "@/components/credence-hero";
import { siteUrl } from "@/lib/site";

export const metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
	return (
		<div className="min-h-full flex flex-col bg-canvas text-foreground font-sans overflow-x-hidden">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "WebSite",
						name: "Credence",
						url: siteUrl.toString(),
						description: "Verifiable reputation for prediction markets on DreamDEX.",
					}).replace(/</g, "\\u003c"),
				}}
			/>

			{/* Vestra Fixed Header */}
			<header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-md">
				<div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
					<Link href="/" className="group flex cursor-pointer items-center gap-2.5 transition-colors">
						<CredenceLogo className="text-[15px] font-medium tracking-tight text-foreground" />
						<span className="hidden md:inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Somnia</span>
					</Link>

					<nav className="hidden md:flex items-center gap-7 text-sm text-muted">
						<a className="cursor-pointer transition-colors duration-200 hover:text-foreground" href="#how-it-works">
							How it works
						</a>
						<a className="cursor-pointer transition-colors duration-200 hover:text-foreground" href="#reputation">
							Reputation
						</a>
						<a className="cursor-pointer transition-colors duration-200 hover:text-foreground" href="#activity">
							Activity
						</a>
						<Link className="cursor-pointer transition-colors duration-200 hover:text-foreground" href="/leaderboard">
							Leaderboard
						</Link>
					</nav>

					<div className="flex items-center gap-3">
						<Link href="/app" className="cursor-pointer rounded-full bg-signal px-4 py-2 text-sm font-medium text-black transition-all duration-200 ease-out hover:bg-foreground/90 active:scale-[0.98]">
							Start predicting
						</Link>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="relative flex flex-1 flex-col overflow-hidden pb-24">
				{/* Section 1: Hero */}
				<CredenceHero />

				{/* Section 2: How Credence Works */}
				<section id="how-it-works" className="relative z-10 mx-auto max-w-[1300px] px-6 pt-24 pb-24">
					<div className="mb-20 max-w-4xl">
						<span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em]">
							<span className="relative inline-flex h-1.5 w-1.5 bg-signal rounded-full" />
							<span className="text-foreground/70">How Credence works</span>
						</span>
						<h2 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-6xl">
							Predict live. <br className="hidden md:block" />
							<span className="text-muted">Prove edge. Monetize insight.</span>
						</h2>
						<p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
							No follower counts. No deleted tweets. No anonymous claims. Credence records your calls before outcomes are known, executes trades on DreamDEX Event Contracts, and establishes
							permanent reputation.
						</p>
						<div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
							<Link href="/app" className="brand-button">
								<span>Start predicting</span>
								<ArrowUpRight className="size-4" />
							</Link>
							<Link href="/markets" className="brand-button-secondary">
								<span>Explore live markets</span>
							</Link>
						</div>
					</div>

					{/* 4 Connected Feature Cards with Vestra radial style */}
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{[
							{
								num: "01",
								title: "Predict & Back",
								desc: "Select any live DreamDEX Event Contract. Choose UP or DOWN, set your confidence level, and stake with your wallet.",
								icon: TrendingUp,
								detail: "Direct onchain DreamDEX trade execution on Somnia Shannon.",
							},
							{
								num: "02",
								title: "Permanent Evidence",
								desc: "Every prediction is timestamped and recorded before market resolution. Wins and losses join a public history.",
								icon: Shield,
								detail: "No deleting bad calls. No cherry-picked screenshots.",
							},
							{
								num: "03",
								title: "Credence Reputation",
								desc: "Your forecast is scored against market difficulty and entry probabilities. High-conviction wins yield rapid score gains.",
								icon: Zap,
								detail: "Scale from Developing (0–39) to Elite (80–100) and Verified status.",
							},
							{
								num: "04",
								title: "Monetize Active Insight",
								desc: "Verified predictors can lock active predictions. Other market participants pay testnet tokens to unlock your reasoning.",
								icon: Radio,
								detail: "Great calls create value before they become history.",
							},
						].map((step) => {
							const Icon = step.icon;
							return (
								<div
									key={step.num}
									className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-white/[0.07] to-white/0 p-8 border border-white/10 transition-all duration-300 hover:border-white/15"
								>
									<div className="inner-border-mask" />
									<div className="flex items-center justify-between">
										<span className="font-mono text-sm text-signal font-semibold">{step.num}</span>
										<span className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-muted">
											<Icon className="size-4 text-signal" />
										</span>
									</div>
									<h3 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">{step.title}</h3>
									<p className="mt-3 text-sm leading-relaxed text-muted">{step.desc}</p>
									<div className="mt-6 border-t border-white/5 pt-4 font-mono text-[11px] text-muted/80">{step.detail}</div>
								</div>
							);
						})}
					</div>
				</section>

				{/* Section 3: Reputation & Verified Edge */}
				<section id="reputation" className="relative z-10 mx-auto mt-16 mb-24 max-w-[1300px] px-6">
					<div className="mb-16 max-w-4xl">
						<span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em]">
							<span className="relative inline-flex h-1.5 w-1.5 bg-signal rounded-full">
								<span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-60" />
							</span>
							<span className="text-signal">Reputation Identity · ERC-8004</span>
						</span>
						<h2 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-6xl">
							Followers are easy to buy. <span className="text-muted">A track record isn&apos;t.</span>
						</h2>
						<p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
							Credence turns prediction accuracy into an onchain reputation. One score, earned through verifiable proof, impossible to fabricate.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-center">
						{/* Left: Interactive Locked & Unlocked Comparison */}
						<div className="space-y-6">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<LandingPreview />
								<LandingPreview revealed />
							</div>
							<p className="text-xs font-mono text-muted/70 text-center">
								<LockKeyhole className="inline size-3 mr-1 text-signal" />
								Active insight can be private. Historical performance is permanent and public.
							</p>
						</div>

						{/* Right: Explanatory Breakdown Card */}
						<div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-white/[0.06] to-white/0 p-8 sm:p-10">
							<div className="inner-border-mask" />
							<h3 className="text-2xl font-semibold tracking-tight text-foreground">An illustrative call, from conviction to proof</h3>
							<div className="mt-6 divide-y divide-white/5 font-mono text-xs">
								{[
									{ label: "PREDICTED CALL", value: "BTC DOWN", highlight: "text-down" },
									{ label: "MARKET AT ENTRY", value: "35% probability", highlight: "text-foreground" },
									{ label: "OUTCOME", value: "Correct · Settled onchain", highlight: "text-emerald-400" },
									{ label: "SCORE IMPROVEMENT", value: "+1.87 Credence", highlight: "text-signal font-semibold" },
								].map((row) => (
									<div key={row.label} className="py-3.5 flex items-center justify-between">
										<span className="text-muted">{row.label}</span>
										<span className={row.highlight}>{row.value}</span>
									</div>
								))}
							</div>
							<p className="mt-6 text-xs text-muted leading-relaxed">
								Reputation measures performance against market expectations over time. A correct contrarian call boosts Credence more than following the consensus.
							</p>
							<div className="mt-8">
								<Link href="/leaderboard" className="inline-flex items-center gap-2 font-mono text-xs text-signal hover:underline">
									Explore Top Predictors <ChevronRight className="size-3.5" />
								</Link>
							</div>
						</div>
					</div>
				</section>

				{/* Section 4: Real Activity & Proof */}
				<section id="activity" className="relative z-10 mx-auto mt-16 mb-24 max-w-[1300px] px-6">
					<div className="mb-12 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
						<div className="max-w-2xl">
							<span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em]">
								<span className="relative inline-flex h-1.5 w-1.5 bg-foreground/60 rounded-full" />
								<span className="text-foreground/70">Network rankings</span>
							</span>
							<h2 className="mt-4 text-4xl font-semibold tracking-tighter text-foreground md:text-5xl">Real calls. Ranked by proof.</h2>
							<p className="mt-4 text-base leading-relaxed text-muted">Proven predictors ranked by Credence score, resolved accuracy, and verified P&amp;L on DreamDEX Event Contracts.</p>
						</div>
						<div className="flex items-center gap-3">
							<span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/80">
								<Check className="size-3 text-signal" />
								Somnia Shannon
							</span>
						</div>
					</div>

					<div className="rounded-xl border border-white/5 bg-[#0B0C0E] overflow-hidden">
						<LandingLeaderboard />
					</div>
				</section>

				{/* Section 5: Final CTA */}
				<section
					id="start"
					className="relative mx-auto mt-16 max-w-7xl rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-white/[0.07] to-white/0 p-8 backdrop-blur sm:p-12"
				>
					<div className="inner-border-mask" />
					<div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
						<div className="lg:col-span-8">
							<span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
								<span className="size-1.5 rounded-full bg-signal" />
								Credence · The Signal Network
							</span>
							<h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tighter text-foreground sm:text-5xl">
								Build a reputation <br />
								worth following.
							</h2>
							<p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
								Make predictions on live DreamDEX Event Contracts. Prove your edge without claiming it. Let your public track record speak for itself.
							</p>
						</div>
						<div className="flex flex-col items-start lg:items-end justify-center lg:col-span-4 gap-4">
							<Link href="/app" className="brand-button w-full sm:w-auto">
								<span>Launch Credence</span>
								<ArrowUpRight className="size-4" strokeWidth={2} />
							</Link>
							<p className="font-mono text-[11px] text-muted text-left lg:text-right">
								DreamDEX shows what the market believes. <br />
								<span className="text-signal">Credence shows you who actually knows.</span>
							</p>
						</div>
					</div>
				</section>
			</main>

			{/* Vestra Footer */}
			<footer className="border-t border-white/5 bg-black/50 py-12 px-6">
				<div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-8 md:flex-row md:items-center">
					<div>
						<CredenceLogo className="text-[15px]" />
						<p className="mt-3 max-w-sm text-xs leading-relaxed text-muted">Reputation-powered prediction marketplace built on DreamDEX Event Contracts on Somnia Shannon Testnet.</p>
					</div>

					<div className="flex flex-wrap items-center gap-8 font-mono text-[11px] text-muted">
						<Link href="/app" className="hover:text-foreground transition-colors">
							Overview
						</Link>
						<Link href="/markets" className="hover:text-foreground transition-colors">
							Markets
						</Link>
						<Link href="/leaderboard" className="hover:text-foreground transition-colors">
							Leaderboard
						</Link>
						<a href="https://shannon-explorer.somnia.network" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
							Somnia Explorer
						</a>
					</div>
				</div>
			</footer>
		</div>
	);
}
