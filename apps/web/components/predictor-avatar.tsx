import { cn } from "@/lib/utils";

export function PredictorAvatar({ address, name, className }: { address: string; name?: string; className?: string }) {
  const label = name?.slice(0, 2) ?? address.slice(2, 4);
  return <span className={cn("grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/6 text-xs font-bold uppercase text-neutral-200", className)}>{label}</span>;
}
