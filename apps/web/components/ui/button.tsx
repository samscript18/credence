import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "brand";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "bg-signal text-[#04131f] hover:bg-[#b5e7ff] active:scale-[0.98]",
        variant === "brand" && "rounded-full bg-gradient-to-r from-[#e0f4ff] via-[#9bdcff] to-[#70cbff] px-6 py-2.5 text-[#04131f] shadow-[0_12px_28px_-10px_rgba(155,220,255,0.45)] hover:scale-[1.02] active:scale-[0.98]",
        variant === "secondary" && "border border-white/5 bg-white/[0.03] text-foreground/90 hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.98]",
        variant === "ghost" && "text-muted hover:bg-white/[0.05] hover:text-foreground active:scale-[0.98]",
        className,
      )}
      {...props}
    />
  );
}
