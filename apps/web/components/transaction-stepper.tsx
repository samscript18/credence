import { Check, LoaderCircle } from "lucide-react";

export function TransactionStepper({ steps, current }: { steps: string[]; current: string }) {
  const currentIndex = steps.indexOf(current);
  return (
    <ol
      aria-label="Transaction progress"
      aria-live="polite"
      className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 font-mono text-xs"
    >
      {steps.map((label, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li
            key={label}
            aria-current={isCurrent ? "step" : undefined}
            className={`flex items-center gap-3 ${
              isCurrent ? "text-foreground font-medium" : isDone ? "text-muted" : "text-muted/40"
            }`}
          >
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                isDone
                  ? "bg-emerald-400/20 text-emerald-400"
                  : isCurrent
                  ? "border border-signal/40 bg-signal/15 text-signal"
                  : "border border-white/10 bg-white/[0.02] text-muted/50"
              }`}
            >
              {isDone ? (
                <Check className="size-3" />
              ) : isCurrent ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : (
                index + 1
              )}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
