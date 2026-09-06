import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-[#0B0C0E] transition-colors duration-200 hover:border-white/[0.08]",
        className
      )}
      {...props}
    />
  );
}
