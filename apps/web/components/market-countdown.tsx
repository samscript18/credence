"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

export function MarketCountdown({ expiryAt, className = "" }: { expiryAt: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(0, new Date(expiryAt).getTime() - now);
  let label = "Awaiting settlement";
  if (remaining > 0) {
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    label = days > 0 ? `${days}d ${hours}h remaining` : hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}:${seconds.toString().padStart(2, "0")} remaining`;
  }
  return <span className={`inline-flex items-center gap-1.5 tabular-nums ${className}`}><Clock3 className="size-3.5" />{label}</span>;
}
