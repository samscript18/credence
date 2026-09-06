"use client";

import { BarChart3, CircleUserRound, Droplets, ExternalLink, House, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { WalletButton } from "./wallet-button";
import { CredenceLogo } from "./credence-logo";
import { NetworkSearch } from "./network-search";

const navigation = [
  { href: "/app", label: "Overview", icon: House },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
  { href: "/faucet", label: "Faucet", icon: Droplets },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const currentItem = navigation.find((item) =>
    item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href)
  );
  const currentPage = currentItem?.label ?? "Overview";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas text-foreground">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-signal px-4 py-2 font-mono text-xs font-semibold text-[#04131f] transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* Vestra-style Left Sidebar */}
      <aside className="hidden h-full w-[240px] shrink-0 flex-col border-r border-white/5 bg-[#0F1012] lg:flex">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <CredenceLogo className="text-[14px] font-medium tracking-tight" />
          </Link>
          <span className="ml-auto rounded-sm border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            Somnia
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-4 py-6" aria-label="Primary navigation">
          <p className="px-3 pb-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted/60">
            Credence
          </p>
          <ul className="space-y-2">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = href === "/app" ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "group relative flex cursor-pointer items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-[13px] transition-all duration-200 ease-out",
                      active
                        ? "bg-white/[0.07] text-foreground font-medium"
                        : "text-foreground/70 hover:bg-white/[0.04] hover:text-foreground"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2.5px] rounded-r-full bg-signal shadow-[0_0_8px_rgba(155,220,255,0.7)]" />
                    )}
                    <Icon
                      className={cn(
                        "size-[16px] transition-colors",
                        active ? "text-signal" : "text-muted group-hover:text-foreground/90"
                      )}
                      strokeWidth={1.5}
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="px-3 pt-8 pb-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted/60">
            Protocol
          </p>
          <ul className="space-y-2">
            <li>
              <a
                href="https://shannon-explorer.somnia.network"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex cursor-pointer items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-[13px] text-foreground/70 transition-colors duration-200 ease-out hover:bg-white/[0.04] hover:text-foreground"
              >
                <ExternalLink className="size-[16px] text-muted group-hover:text-foreground/90" strokeWidth={1.5} />
                <span>Explorer</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Bottom online agent indicator */}
        <div className="border-t border-white/5 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="relative inline-flex h-2 w-2 items-center justify-center">
              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[12px] text-foreground/90">Somnia Shannon</span>
              <span className="font-mono text-[10px] text-muted">agent online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Vestra-style Topbar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-white/5 bg-[#0F1012]/90 px-4 backdrop-blur-md md:gap-4 md:px-8">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <CredenceLogo className="text-[14px]" />
          </Link>

          <div className="hidden items-center gap-2 text-muted sm:flex">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em]">Credence</span>
            <span className="text-[11px]">/</span>
            <span className="font-mono text-[11px] tracking-[0.18em] text-foreground/85">
              {currentPage}
            </span>
          </div>

          <NetworkSearch />

          <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-3">
            <Link
              href="/"
              className="hidden cursor-pointer items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-[12px] text-foreground/85 transition-colors duration-200 ease-out hover:border-white/10 hover:bg-white/[0.05] active:scale-[0.98] sm:inline-flex"
            >
              Landing
              <ExternalLink className="size-3 text-muted" strokeWidth={1.5} />
            </Link>
            <WalletButton />
          </div>
        </header>

        {/* Scrollable page body */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none"
        >
          <div className="mx-auto w-full max-w-[1400px] px-5 py-8 pb-24 md:px-8 md:py-10 lg:pb-12 space-y-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-[#0F1012]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <nav className="grid grid-cols-5 py-1" aria-label="Mobile navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/app" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors",
                  active ? "text-signal font-semibold" : "text-muted hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("size-4", active ? "text-signal" : "text-muted")} strokeWidth={1.5} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
