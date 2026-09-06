import { CircleCheck, Clock3, LoaderCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusChip({ status }: { status: "PENDING_TRADE" | "ACTIVE" | "RESOLVED" | "FAILED" }) {
  const Icon = status === "RESOLVED" ? CircleCheck : status === "FAILED" ? ShieldAlert : status === "ACTIVE" ? Clock3 : LoaderCircle;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
        status === "ACTIVE" && "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-300",
        status === "RESOLVED" && "border-signal/25 bg-signal/[0.07] text-signal",
        status === "FAILED" && "border-rose-400/25 bg-rose-400/[0.07] text-rose-300",
        status === "PENDING_TRADE" && "border-amber-400/20 bg-amber-400/[0.06] text-amber-300",
      )}
    >
      {status === "ACTIVE" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {status !== "ACTIVE" && <Icon className={cn("size-2.5", status === "PENDING_TRADE" && "animate-spin")} />}
      {status === "ACTIVE" ? "LIVE" : status.replace("_", " ")}
    </span>
  );
}
