import { CredenceMark } from "./credence-logo";

export function ReputationBadge({ score }: { score: number }) {
  return (
    <span
      title="Reputation earned by forecasting against market expectations"
      className="inline-flex items-center gap-1 rounded-sm border border-signal/20 bg-signal/[0.06] px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums text-signal"
    >
      <span className="h-1 w-1 rounded-full bg-signal" />
      {Math.round(score * 10) / 10} Credence
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span
      title="Earned with at least 80 Credence and 25 resolved predictions"
      className="inline-flex items-center gap-1.5 rounded-sm border border-signal/25 bg-signal/[0.08] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal"
    >
      <CredenceMark className="size-3" monochrome />
      Verified
    </span>
  );
}
