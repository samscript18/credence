import { cn } from "@/lib/utils";

export function CredenceMark({ className, monochrome = false }: { className?: string; monochrome?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={cn("size-9 shrink-0", className)}>
      <path d="M31 9A15 15 0 1 0 31 31" stroke={monochrome ? "currentColor" : "#9BDCFF"} strokeWidth="4" strokeLinecap="round" />
      <path d="M28 15a8 8 0 1 0-1 11l8-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CredenceLogo({ className }: { className?: string }) {
  return <span className={cn("inline-flex items-center gap-2.5 text-xl font-semibold tracking-[-.06em] text-white", className)}><CredenceMark />Credence<span className="sr-only"> home</span></span>;
}
