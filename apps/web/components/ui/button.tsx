import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 disabled:pointer-events-none disabled:opacity-45",
        variant === "primary" && "bg-lime-300 text-neutral-950 hover:bg-lime-200",
        variant === "secondary" && "border border-white/12 bg-white/5 text-white hover:bg-white/10",
        variant === "ghost" && "text-neutral-400 hover:bg-white/5 hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
