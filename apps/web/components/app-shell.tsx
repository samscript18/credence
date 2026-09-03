"use client";

import { BarChart3, CircleUserRound, House, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { WalletButton } from "./wallet-button";

const navigation = [
  { href: "/", label: "Home", icon: House },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
];

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={cn(mobile ? "grid grid-cols-4" : "space-y-1")} aria-label="Primary navigation">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300",
              mobile ? "flex-col gap-1 px-1 py-2 text-[11px]" : "gap-3 px-3 py-2.5",
              active ? "bg-white/8 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-200",
            )}
          >
            <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.7} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#0a0b09]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-white/7 bg-[#0d0e0c] px-5 py-7 lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 px-2" aria-label="Credence home">
          <span className="grid size-9 place-items-center rounded-xl bg-lime-300 font-black text-neutral-950">C</span>
          <span className="text-lg font-bold tracking-tight">Credence</span>
        </Link>
        <div className="mt-10"><Navigation /></div>
        <div className="mt-auto rounded-2xl border border-white/8 bg-white/[.025] p-4">
          <p className="text-xs font-semibold text-neutral-300">Proof over promises.</p>
          <p className="mt-1 text-xs leading-5 text-neutral-600">Reputation built one resolved prediction at a time.</p>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-white/7 bg-[#0a0b09]/90 px-4 backdrop-blur-md sm:h-20 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-2 font-bold lg:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-lime-300 text-neutral-950">C</span>
            Credence
          </Link>
          <p className="hidden text-sm text-neutral-600 lg:block">Prediction skill, proven on-chain.</p>
          <WalletButton />
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 py-7 pb-28 sm:px-8 sm:py-8 lg:px-10 lg:pb-12">{children}</main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-[#0d0e0c]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <Navigation mobile />
      </div>
    </div>
  );
}
