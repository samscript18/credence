import { CircleCheck, Clock3, LoaderCircle, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatusChip({ status }: { status: "PENDING_TRADE" | "ACTIVE" | "RESOLVED" | "FAILED" }) {
  const Icon = status === "RESOLVED" ? CircleCheck : status === "FAILED" ? ShieldAlert : status === "ACTIVE" ? Clock3 : LoaderCircle;
  return <span className={cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
    status === "ACTIVE" && "border-lime-300/15 bg-lime-300/[.06] text-lime-300",
    status === "RESOLVED" && "border-sky-300/15 bg-sky-300/[.06] text-sky-300",
    status === "FAILED" && "border-red-300/15 bg-red-300/[.06] text-red-300",
    status === "PENDING_TRADE" && "border-white/10 bg-white/5 text-neutral-400",
  )}><Icon className={cn("size-3", status === "PENDING_TRADE" && "animate-spin")} />{status.replace("_", " ")}</span>;
}
