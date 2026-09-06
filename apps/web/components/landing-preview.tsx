"use client";

import { ArrowDownRight, LockKeyhole } from "lucide-react";
import { CredenceMark } from "./credence-logo";

// Illustrative marketing composition
export function LandingPreview({ revealed = false }: { revealed?: boolean }) {
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C0E] p-6 text-left transition-all duration-300 hover:border-white/15 sm:p-7 shadow-xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.04)_0%,transparent_40%)]" />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full border border-signal/25 bg-signal/10">
            <CredenceMark className="size-6" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">David</p>
            <span className="inline-flex items-center gap-1 rounded-sm border border-signal/20 bg-signal/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-signal">
              Verified Predictor
            </span>
          </div>
        </div>
        <span className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
          88 Credence
        </span>
      </div>

      {/* Subhead */}
      <div className="relative my-6 flex items-center justify-between border-y border-white/5 py-3.5">
        <span className="font-mono text-[12px] text-foreground/90">BTC · 15m Event Contract</span>
        <span className="font-mono text-[11px] text-muted">#7 Global Rank</span>
      </div>

      {revealed ? (
        <div className="relative space-y-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal">
              Insight revealed
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Active call
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Direction</p>
              <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-down flex items-center gap-2">
                DOWN <ArrowDownRight className="size-6" />
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Confidence</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">78%</p>
            </div>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs leading-relaxed text-muted">
            BTC rejected the local high and short-term volume divergence suggests downside continuation before next test.
          </div>

          <div className="flex justify-between font-mono text-[11px] text-muted pt-1">
            <span>Market at entry: <b className="text-signal font-normal">35%</b></span>
            <span>Current quote: <b className="text-foreground font-normal">38%</b></span>
          </div>

          <button
            type="button"
            className="w-full cursor-pointer rounded-full border border-white/10 bg-white/[0.04] py-2.5 text-center text-xs font-medium text-foreground transition-all hover:bg-white/[0.08]"
          >
            Back Prediction on DreamDEX
          </button>
        </div>
      ) : (
        <div className="relative signal-grid rounded-xl border border-signal/15 bg-signal/[0.02] p-5">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-signal">
            <LockKeyhole className="size-3.5" />
            Active insight
          </p>
          <div className="my-5 space-y-3.5">
            {["Direction", "Confidence", "Analysis & Edge"].map((label) => (
              <div key={label} className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted">{label}</span>
                <span className="flex items-center gap-1.5 text-muted/50">
                  <span className="h-px w-6 bg-signal/30" />
                  Locked
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="w-full cursor-pointer rounded-full bg-signal py-2.5 text-center text-xs font-semibold text-[#04131f] transition-all hover:bg-signal/90"
          >
            Unlock Insight · 1 tUSDC
          </button>
        </div>
      )}

      <p className="relative mt-5 text-center font-mono text-[10px] text-muted/60">
        A record worth knowing. Proof over popularity.
      </p>
    </div>
  );
}
