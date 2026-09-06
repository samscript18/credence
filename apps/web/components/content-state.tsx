import type { ReactNode } from "react";
import { Card } from "./ui/card";

export function ContentState({ icon, title, description, action, error = false }: { icon: ReactNode; title: string; description: string; action?: ReactNode; error?: boolean }) {
  return <Card className="col-span-full flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center" role={error ? "status" : undefined}><span className={`grid size-12 place-items-center rounded-2xl border ${error ? "border-down/15 bg-down/5 text-down" : "border-signal/15 bg-signal/5 text-signal"}`}>{icon}</span><h2 className="mt-5 text-lg font-medium tracking-tight">{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>{action && <div className="mt-5">{action}</div>}</Card>;
}
