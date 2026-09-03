import { BadgeCheck } from "lucide-react";

export function ReputationBadge({ score }: { score: number }) {
  return <span className="rounded-full border border-white/9 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-neutral-300">Reputation {Math.round(score * 10) / 10}</span>;
}

export function VerifiedBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full border border-lime-300/15 bg-lime-300/[.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lime-300"><BadgeCheck className="size-3" /> Verified</span>;
}
