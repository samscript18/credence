"use client";

import Link from "next/link";
import { ArrowDown, ArrowUpRight, ChevronRight, Radio, Shield, Trophy } from "lucide-react";
import { CredenceLogo } from "./credence-logo";
import { HeroCyberBackground } from "./hero-cyber-background";

const tickerItems = [
  { predictor: "david.somnia", action: "predicted", detail: "BTC DOWN", extra: "78% conf", status: "recorded" },
  { predictor: "maya.somnia", action: "settled", detail: "ETH UP", extra: "+18.4 USDso", status: "confirmed" },
  { predictor: "marcus.somnia", action: "backed", detail: "SOL UP", extra: "20 USDso", status: "recorded" },
  { predictor: "nova.somnia", action: "predicted", detail: "BTC UP", extra: "85% conf", status: "recorded" },
  { predictor: "elena.somnia", action: "settled", detail: "BTC DOWN", extra: "+32.1 USDso", status: "confirmed" },
  { predictor: "kai.somnia", action: "unlocked", detail: "ETH DOWN", extra: "1 tUSDC", status: "recorded" },
];

export function CredenceHero() {
  return (
    <section className="relative isolate overflow-hidden pt-36 md:pt-44">
      {/* Crazy Cybernetic Background Animation */}
      <HeroCyberBackground />

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Eyebrow: Line 1 (Crazy Rotating Laser Pill & Shimmer Text) */}
        <div className="flex items-center">
          <div className="relative inline-flex items-center overflow-hidden rounded-full p-[1px] shadow-[0_0_25px_rgba(155,220,255,0.25)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(155,220,255,0.5)]">
            {/* Spinning Laser Border Beam */}
            <div
              className="absolute -inset-[150%] rounded-full bg-[conic-gradient(from_0deg,transparent_0_280deg,#9bdcff_330deg,#ffffff_360deg)] pointer-events-none"
              style={{ animation: "conic-spin 3.5s linear infinite" }}
            />

            {/* Inner Pill Surface */}
            <div className="relative flex items-center gap-2.5 rounded-full bg-[#07080A]/90 px-4 py-1.5 backdrop-blur-md border border-white/10">
              {/* Pulsing Quantum Core Beacon */}
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="absolute h-full w-full animate-ping rounded-full bg-signal opacity-80" />
                <span className="absolute h-3.5 w-3.5 rounded-full bg-signal/20 animate-pulse" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_8px_#9bdcff]" />
              </span>

              {/* Sweeping Laser Shimmer Text */}
              <span className="hero-eyebrow-shimmer font-mono text-[11px] font-semibold uppercase tracking-[0.22em]">
                Somnia · DreamDEX · ERC-8004 · Event Contracts
              </span>
            </div>
          </div>
        </div>

        {/* Headline: Line 2 (Mad Ass Electric Kinetic Title & Laser Comet Underline) */}
        <div className="relative mt-7">
          {/* Ambient Headlight Bloom */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 -left-8 -z-10 h-44 w-96 rounded-full bg-signal/20 blur-3xl"
          />

          <h1 className="text-left text-5xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-7xl">
            <span className="relative inline-block hero-glow-layer">
              {/* Backlight Neon Glow Shadow */}
              <span
                aria-hidden="true"
                className="absolute inset-0 select-none pointer-events-none text-signal/40 blur-xl md:blur-2xl font-bold tracking-tighter"
              >
                Know who actually knows.
              </span>

              {/* Kinetic Electric Flow Holographic Title */}
              <span className="relative inline-block hero-title-electric font-bold">
                Know who actually knows.
              </span>

              {/* High-speed Darting Laser Underline */}
              <span className="absolute -bottom-2.5 left-0 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-0 w-32 rounded-full bg-gradient-to-r from-transparent via-signal to-transparent shadow-[0_0_12px_#9bdcff]"
                  style={{ animation: "laser-comet 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite" }}
                />
              </span>
            </span>

            <span className="block mt-3 text-4xl font-medium tracking-tight text-white/75 sm:text-5xl md:mt-4 md:text-6xl lg:text-7xl">
              Build a reputation onchain.
            </span>
          </h1>
        </div>

        {/* Lead */}
        <div>
          <p className="mt-8 max-w-2xl text-left text-lg leading-relaxed text-muted md:text-xl">
            Prediction markets show what everyone believes. Credence turns prediction performance into a permanent, verifiable track record — no cherry-picking, no deleting failures, provable on DreamDEX.
          </p>
        </div>

        {/* Action buttons */}
        <div>
          <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href="/app" className="brand-button">
              <span>Launch Credence</span>
              <ArrowUpRight className="size-4" strokeWidth={2} />
            </Link>
            <a href="#how-it-works" className="brand-button-secondary">
              <span>How it works</span>
              <ArrowDown className="size-3.5 text-muted" strokeWidth={1.5} />
            </a>
          </div>
        </div>

        {/* Stats counter strip */}
        <div>
          <div className="mt-16 flex flex-wrap items-center gap-8 font-mono text-[11px] text-muted">
            <div>
              <div className="text-base font-medium text-foreground">15m</div>
              <div className="mt-0.5 uppercase tracking-[0.14em]">Event Contracts</div>
            </div>
            <div>
              <div className="text-base font-medium text-foreground">88</div>
              <div className="mt-0.5 uppercase tracking-[0.14em]">Elite Credence Score</div>
            </div>
            <div>
              <div className="text-base font-medium text-foreground">ERC-8004</div>
              <div className="mt-0.5 uppercase tracking-[0.14em]">Verifiable Edge</div>
            </div>
            <div>
              <div className="text-base font-medium text-foreground">DreamDEX</div>
              <div className="mt-0.5 uppercase tracking-[0.14em]">Trade Settlement</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vestra 3D Interactive Product Perspective */}
      <div
        className="group relative -mt-4 px-4 pt-16 pb-16 [perspective:2000px] md:px-0"
        style={{
          WebkitMaskImage: "linear-gradient(180deg, transparent, black 5%, black 85%, transparent)",
          maskImage: "linear-gradient(180deg, transparent, black 5%, black 85%, transparent)",
        }}
      >
        <div className="relative mx-auto max-w-[1300px] overflow-hidden rounded-xl border border-white/10 bg-[#0F1012] product-preview">
          <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.05)_0%,transparent_40%)]" />

          {/* 3-column app mock */}
          <div className="grid h-[680px] grid-cols-[220px_340px_1fr] divide-x divide-white/[0.05]">
            {/* Mock Sidebar */}
            <div className="flex h-full flex-col bg-[#0F1012] p-4">
              <div className="flex h-12 items-center gap-2 border-b border-white/[0.05] pb-3">
                <CredenceLogo className="text-[13px]" />
                <span className="ml-auto rounded-sm border border-white/10 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
                  Shannon
                </span>
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex items-center gap-3 rounded-md bg-white/[0.06] px-3 py-2 text-[13px] text-foreground">
                  <Radio className="size-3.5 text-signal" />
                  <span>Signals</span>
                </div>
                <div className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted">
                  <Trophy className="size-3.5 text-muted" />
                  <span>Leaderboard</span>
                </div>
                <div className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted">
                  <Shield className="size-3.5 text-muted" />
                  <span>Reputation</span>
                </div>
              </div>
              <div className="mt-auto border-t border-white/[0.05] pt-3">
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted">
                  <span className="relative flex h-1.5 w-1.5 rounded-full bg-emerald-400">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
                  </span>
                  <span>indexer live · Somnia</span>
                </div>
              </div>
            </div>

            {/* Mock Live Signals Feed */}
            <div className="flex h-full flex-col bg-[#0B0C0E]">
              <div className="flex h-12 items-center justify-between border-b border-white/[0.05] px-4">
                <span className="text-[13px] font-medium text-foreground/85">Live network calls</span>
                <span className="font-mono text-[10px] text-signal">STREAM</span>
              </div>
              <ul className="flex-1 overflow-hidden divide-y divide-white/[0.04]">
                <li className="p-3.5 border-l-2 border-l-signal bg-[#16181D]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-signal">SIG-0042</span>
                    <span className="h-1 w-1 rounded-full bg-muted/60" />
                    <span className="text-[10px] text-muted">Score: 88</span>
                  </div>
                  <p className="text-[12px] font-medium text-foreground">david.somnia · BTC DOWN · 78%</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-400/20 bg-emerald-400/[0.07] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-emerald-300">
                      LIVE
                    </span>
                    <span className="font-mono text-[10px] text-muted/70">DreamDEX: 35%</span>
                  </div>
                </li>
                <li className="p-3.5 hover:bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-muted">SIG-0041</span>
                    <span className="h-1 w-1 rounded-full bg-muted/60" />
                    <span className="text-[10px] text-muted">Score: 92</span>
                  </div>
                  <p className="text-[12px] text-foreground/80">marcus.somnia · ETH UP · 72%</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-sm border border-signal/20 bg-signal/[0.07] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-signal">
                      RESOLVED
                    </span>
                    <span className="font-mono text-[10px] text-up font-medium">+18.4 USDso</span>
                  </div>
                </li>
                <li className="p-3.5 hover:bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-muted">SIG-0040</span>
                  </div>
                  <p className="text-[12px] text-foreground/80">nova.somnia · BTC UP · 85%</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-sm border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
                      LOCKED
                    </span>
                    <span className="font-mono text-[10px] text-muted">1 tUSDC</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Mock Inspector Detail Panel */}
            <div className="flex h-full flex-col bg-[#0B0C0E] p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
                <div>
                  <span className="font-mono text-[11px] text-muted">BTC · 15m Event Contract</span>
                  <h3 className="text-xl font-medium tracking-tight text-foreground mt-1">David&apos;s Signal Analysis</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-sm border border-signal/20 bg-signal/[0.08] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
                    Verified Predictor
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-4 text-[13px] text-foreground/75">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Direction</div>
                    <div className="mt-1 font-mono text-lg font-semibold text-down">DOWN</div>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Confidence</div>
                    <div className="mt-1 font-mono text-lg font-semibold text-foreground">78%</div>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Market at Entry</div>
                    <div className="mt-1 font-mono text-lg font-semibold text-signal">35%</div>
                  </div>
                </div>

                {/* Onchain Code / Event Inspection */}
                <div className="overflow-hidden rounded-lg border border-white/10 bg-[#090A0B]">
                  <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#131416] px-4 py-2">
                    <span className="font-mono text-[11px] text-muted">credence/reputation.ts</span>
                    <span className="font-mono text-[10px] text-muted/70">DreamDEX Event</span>
                  </div>
                  <div className="p-4 font-mono text-[11px] leading-5 space-y-1">
                    <div className="text-muted/70">{"// settle DreamDEX Event Contract outcome"}</div>
                    <div>
                      <span className="text-purple-400">const</span> <span className="text-blue-300">result</span> = <span className="text-yellow-300">await</span> dex.<span className="text-yellow-300">settle</span>(<span className="text-foreground/70">marketId</span>);
                    </div>
                    <div>
                      <span className="text-purple-400">await</span> registry.<span className="text-yellow-300">recordPerformance</span>({"{"}
                    </div>
                    <div className="pl-4">
                      predictor: <span className="text-signal">&quot;0x7f2...a19&quot;</span>,
                    </div>
                    <div className="pl-4">
                      accuracyDelta: <span className="text-emerald-400">+1.87</span>,
                    </div>
                    <div className="pl-4">
                      verifiedScore: <span className="text-signal">88.4 / 100</span>
                    </div>
                    <div>{"}"});</div>
                    <div className="text-emerald-400 pt-2">✓ Contract resolved · reputation updated on Somnia</div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Back this prediction</p>
                    <p className="text-[11px] text-muted">Execute matching position on DreamDEX</p>
                  </div>
                  <span className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-foreground">
                    Back Call <ChevronRight className="size-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vestra Animated Marquee Ticker */}
      <div
        className="group relative mt-10 overflow-hidden border-y border-white/[0.06] bg-canvas/40 py-3 backdrop-blur-sm md:-mt-4"
        style={{
          WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
          maskImage: "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <div className="flex w-max gap-10 whitespace-nowrap font-mono text-[11px] animate-marquee">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              <span className="text-foreground/85 font-medium">{item.predictor}</span>
              <span className="text-muted/60">·</span>
              <span className="text-foreground/70">{item.action}</span>
              <span className="text-muted/60">·</span>
              <span className="text-foreground/90">{item.detail}</span>
              <span className="text-muted/60">·</span>
              <span className="text-foreground/70">{item.extra}</span>
              <span className="text-muted/60">·</span>
              <span className="uppercase tracking-[0.14em] text-signal font-semibold">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
