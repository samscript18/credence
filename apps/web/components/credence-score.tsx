import { cn } from "@/lib/utils";

export function CredenceScore({ score, className }: { score: number; className?: string }) {
  const value = Math.max(0, Math.min(100, score));
  const tier = value >= 80 ? "Elite" : value >= 60 ? "Proven" : value >= 40 ? "Emerging" : "Developing";
  return (
    <div
      className={cn("relative grid size-36 shrink-0 place-items-center", className)}
      aria-label={`${value.toFixed(1)} Credence reputation, ${tier}`}
    >
      <svg viewBox="0 0 160 160" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" className="text-white/[0.06]" strokeWidth="4" />
        <circle
          cx="80"
          cy="80"
          r="68"
          fill="none"
          stroke="currentColor"
          className="text-signal"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${value} 100`}
          style={{ filter: "drop-shadow(0 0 8px rgba(155, 220, 255, 0.4))" }}
        />
      </svg>
      <div className="text-center">
        <p className="font-mono text-3xl font-medium tracking-tight tabular-nums text-foreground">
          {Math.round(value * 10) / 10}
        </p>
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted">Credence</p>
        <p className="mt-1 font-mono text-[10px] font-medium text-signal">{tier}</p>
      </div>
    </div>
  );
}
