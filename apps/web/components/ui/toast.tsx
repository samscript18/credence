import { AlertCircle, CheckCircle2 } from "lucide-react";

export function Toast({ message, tone = "error" }: { message: string; tone?: "error" | "success" }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return <div className={`fixed right-4 top-20 z-[80] flex max-w-[calc(100vw-2rem)] items-start gap-2 rounded-xl border bg-[#151612] px-4 py-3 text-sm shadow-2xl sm:right-6 ${tone === "success" ? "border-lime-300/20 text-lime-200" : "border-red-300/20 text-red-200"}`} role="status" aria-live="polite"><Icon className="mt-0.5 size-4 shrink-0" /><span>{message}</span></div>;
}
