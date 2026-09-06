import { cn } from "@/lib/utils";

export function MarketProbability({
  label,
  value,
  tone,
}: {
  label: "UP" | "DOWN";
  value: number | null;
  tone: "up" | "down";
}) {
  return (
    <div className={cn("rounded-xl border p-4", tone === "up" ? "border-up/15 bg-up/[.045]" : "border-down/15 bg-down/[.035]") }>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-xs font-bold tracking-wider", tone === "up" ? "text-up" : "text-down")}>{label}</span>
        <span className="text-xl font-semibold tabular-nums">{value === null ? "—" : `${Math.round(value * 100)}%`}</span>
      </div>
    </div>
  );
}
