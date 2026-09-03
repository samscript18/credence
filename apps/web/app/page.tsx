import { ArrowRight, ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#11130f] px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
        <div className="absolute -right-20 -top-32 size-96 rounded-full bg-lime-300/[.055] blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-lime-300">Reputation-powered predictions</p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.04] tracking-[-.055em] sm:text-6xl">Prediction skill should be proven, not claimed.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-400 sm:text-lg">DreamDEX shows what the market believes. Credence shows you who actually knows.</p>
          <Link href="/markets" className="mt-8 inline-flex h-11 items-center rounded-lg bg-lime-300 px-5 text-sm font-bold text-neutral-950 transition-colors hover:bg-lime-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-100">
            Explore live markets <ArrowRight className="ml-2 size-4" />
          </Link>
        </div>
      </section>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Card className="p-6"><ChartNoAxesCombined className="size-5 text-lime-300" /><h2 className="mt-4 font-semibold">Trade the actual market</h2><p className="mt-2 text-sm leading-6 text-neutral-500">Every live call executes through a DreamDEX Event Contract—not a parallel pretend market.</p></Card>
        <Card className="p-6"><ShieldCheck className="size-5 text-lime-300" /><h2 className="mt-4 font-semibold">Build an accountable record</h2><p className="mt-2 text-sm leading-6 text-neutral-500">Resolved wins and losses remain visible, making reputation reproducible and difficult to fake.</p></Card>
      </div>
    </div>
  );
}
