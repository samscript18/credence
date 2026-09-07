"use client";

import { useState } from "react";
import type { PredictorProfile } from "@credence/shared";
import { ExternalLink, Copy, Check, Pencil, Camera } from "lucide-react";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

import { CredenceScore } from "./credence-score";
import { PredictorAvatar } from "./predictor-avatar";
import { VerifiedBadge } from "./reputation-badge";
import { EditProfileDialog } from "./edit-profile-dialog";
import { useAuth } from "@/hooks/use-auth";

export function ProfileHeader({ user }: { user: PredictorProfile }) {
  const [copied, setCopied] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const auth = useAuth();

  const isOwner =
    Boolean(auth.data?.walletAddress) &&
    auth.data?.walletAddress.toLowerCase() === user.walletAddress.toLowerCase();

  const name = user.displayName ?? `${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`;

  const copyAddress = () => {
    void navigator.clipboard.writeText(user.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C0E] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.04)_0%,transparent_40%)]" />

        <div className="relative flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-4 mb-4">
              {/* Avatar with optional owner hover-edit */}
              <div className="relative group shrink-0">
                <PredictorAvatar
                  address={user.walletAddress}
                  name={user.displayName}
                  avatarUrl={user.avatarUrl}
                  className="size-16 text-lg"
                />
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                    title="Change profile avatar"
                    aria-label="Change profile avatar"
                  >
                    <Camera className="size-4 text-signal" />
                  </button>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">{name}</h1>
                  {user.isDemo && <p className="text-xs text-signal">Demo predictor · qualification from seeded history, not earned live performance.</p>}
                  {user.verified && <VerifiedBadge />}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setIsEditOpen(true)}
                      className="ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-foreground/80 transition-all hover:border-signal/40 hover:bg-white/[0.08] hover:text-foreground"
                    >
                      <Pencil className="size-3 text-signal" />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-muted">
                  <span>{user.walletAddress.slice(0, 10)}…{user.walletAddress.slice(-6)}</span>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="cursor-pointer text-muted hover:text-foreground transition-colors"
                    aria-label="Copy address"
                  >
                    {copied ? <Check className="size-3 text-signal" /> : <Copy className="size-3" />}
                  </button>
                  <a
                    href={`${somniaShannon.blockExplorers.default.url}/address/${user.walletAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            </div>

            <p className="max-w-md text-[13px] leading-relaxed text-muted">
              Permanent prediction performance on DreamDEX Event Contracts. Every resolved call remains visible onchain.
            </p>
          </div>

          <CredenceScore score={user.reputationScore} />
        </div>

        {/* 5-stat metrics strip */}
        <div className="relative mt-8 grid grid-cols-2 gap-4 border-t border-white/5 pt-6 sm:grid-cols-5 font-mono">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Global Rank</div>
            <div className="mt-1 text-2xl font-medium tracking-tight text-foreground">
              {user.rank ? `#${user.rank}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Accuracy</div>
            <div className="mt-1 text-2xl font-medium tracking-tight text-foreground tabular-nums">
              {user.accuracy.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Resolved</div>
            <div className="mt-1 text-2xl font-medium tracking-tight text-foreground tabular-nums">
              {user.resolvedPredictions}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Correct</div>
            <div className="mt-1 text-2xl font-medium tracking-tight text-signal tabular-nums">
              {user.correctPredictions}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Claimed P&amp;L</div>
            <p className="mt-1 max-w-48 text-[10px] text-muted">Recorded claim proceeds minus entry cost. Unclaimed positions are excluded.</p>
            <div className="mt-1 text-2xl font-medium tracking-tight tabular-nums">
              <span className={user.realizedPnl.startsWith("+") ? "text-emerald-400" : user.realizedPnl.startsWith("-") ? "text-rose-400" : "text-foreground"}>
                {user.realizedPnl}
              </span>
            </div>
          </div>
        </div>
        <section className="mt-5 border-t border-white/10 pt-4" aria-label="Settled performance">
          <h2 className="text-xs font-medium">Settled P&amp;L — all accounted wins and losses</h2>
          <p className="mt-1 text-xs text-muted">Estimated performance before redemption fees, whether claimed or not. Not your wallet balance.</p>
          {user.settledPnlByToken?.map(group => <p key={group.token} className="mt-2 text-sm">{group.pnl} {group.symbol} · {group.pendingClaims} pending claims</p>)}
          {!user.settledPnlByToken?.length && <p className="mt-2 text-xs text-muted">No settled accounting available yet.</p>}
          {Boolean(user.settlementAccountingMissing) && <p className="mt-2 text-xs text-amber-300">Partial total: {user.settlementAccountingMissing} resolved records lack accounting and are not included.</p>}
        </section>
      </div>

      {isOwner && (
        <EditProfileDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          user={user}
        />
      )}
    </>
  );
}
