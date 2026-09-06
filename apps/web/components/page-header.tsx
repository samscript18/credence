import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="font-mono text-[9px] uppercase tracking-[.18em] text-signal">{eyebrow}</p><h1 className="mt-2 text-2xl font-medium tracking-tight sm:text-[28px]">{title}</h1><p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{description}</p></div>{action && <div className="shrink-0">{action}</div>}</div>;
}
