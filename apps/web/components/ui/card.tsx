import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-white/9 bg-[#111210] shadow-[0_20px_60px_rgba(0,0,0,.18)]", className)}
      {...props}
    />
  );
}
