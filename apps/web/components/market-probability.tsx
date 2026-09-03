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
    <div className={cn("rounded-xl border p-3", tone === "up" ? "border-lime-300/15 bg-lime-300/[.045]" : "border-orange-300/15 bg-orange-300/[.035]") }>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-xs font-bold tracking-wider", tone === "up" ? "text-lime-300" : "text-orange-300")}>{label}</span>
        <span className="text-xl font-semibold tabular-nums">{value === null ? "—" : `${Math.round(value * 100)}%`}</span>
      </div>
    </div>
  );
}
