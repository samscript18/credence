"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Search } from "lucide-react";
import { marketsService } from "@/services/markets.service";
import { leaderboardService } from "@/services/leaderboard.service";
import { predictionsService } from "@/services/predictions.service";
import { useAuth } from "@/hooks/use-auth";

export function NetworkSearch() {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const { address } = useAccount();
  const auth = useAuth();
  useEffect(() => {
    const timer = setTimeout(() => setQuery(value.trim().toLowerCase()), 250);
    return () => clearTimeout(timer);
  }, [value]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && input.current?.getClientRects().length) {
        event.preventDefault(); input.current?.focus(); setOpen(true);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const enabled = open && query.length >= 2;
  const markets = useQuery({ queryKey: ["markets"], queryFn: marketsService.list, enabled, staleTime: 15_000 });
  const predictors = useQuery({ queryKey: ["leaderboard"], queryFn: leaderboardService.list, enabled, staleTime: 20_000 });
  const calls = useQuery({ queryKey: ["network-search-calls", address, auth.data?.walletAddress], queryFn: predictionsService.feed, enabled, staleTime: 15_000 });
  const matches = (...fields: (string | undefined)[]) => fields.some(field => field?.toLowerCase().includes(query));
  const results = enabled ? [
    ...(predictors.data ?? []).filter(row => matches(row.displayName, row.walletAddress)).slice(0, 5).map(row => ({ key: `user:${row.walletAddress}`, label: row.displayName ?? row.walletAddress, kind: "Predictor", href: `/profile/${row.walletAddress}` })),
    ...(markets.data ?? []).filter(row => matches(row.title, row.underlying, row.marketId)).slice(0, 5).map(row => ({ key: `market:${row.marketId}`, label: row.title, kind: "Market", href: `/markets#market-${encodeURIComponent(row.marketId)}` })),
    // Only public identifying fields: never search locked reasoning/direction.
    ...(calls.data ?? []).filter(row => matches(row.marketTitle, row.predictor.displayName, row.predictorAddress)).slice(0, 5).map(row => ({ key: `call:${row.id}`, label: row.marketTitle, kind: "Recent call", href: `/profile/${row.predictorAddress}#prediction-${row.id}` })),
  ] : [];
  return <div ref={container} className="relative ml-auto hidden w-full max-w-xs md:block" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (event.key === "Escape") { setOpen(false); input.current?.blur(); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const links = Array.from(container.current?.querySelectorAll<HTMLAnchorElement>("li a") ?? []);
      if (!links.length) return;
      event.preventDefault();
      const current = links.findIndex(link => link === document.activeElement);
      const next = event.key === "ArrowDown" ? (current + 1) % links.length : current <= 0 ? links.length - 1 : current - 1;
      links[next]?.focus();
    }
    if (event.key === "Enter" && event.target === input.current) container.current?.querySelector<HTMLAnchorElement>("li a")?.click();
  }}>
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5">
      <Search className="size-3.5 shrink-0 text-muted" />
      <input ref={input} type="search" aria-label="Search predictors, markets and recent calls" aria-controls={open ? "network-search-results" : undefined} placeholder="Search predictors, markets, calls…" className="min-w-0 flex-1 bg-transparent text-xs outline-none" value={value} onChange={event => { setValue(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      <kbd className="hidden text-[10px] text-muted lg:block">⌘K</kbd>
    </div>
    {open && <div id="network-search-results" className="absolute right-0 top-full z-50 mt-2 max-h-96 w-[min(24rem,85vw)] overflow-y-auto rounded-lg border border-white/10 bg-[#0F1012] p-3 shadow-xl">
      <p className="mb-2 text-xs text-muted">Search listed predictors, current markets and recent calls.</p>
      {query.length < 2 ? <p className="text-sm">Type at least two characters.</p> : <>
        {(markets.isFetching || predictors.isFetching || calls.isFetching) && <p role="status" className="text-xs text-muted">Loading search data…</p>}
        {(markets.isError || predictors.isError || calls.isError) && <p role="status" className="text-xs text-amber-300">Some sources are unavailable; results may be incomplete. <button type="button" className="underline" onClick={() => { void markets.refetch(); void predictors.refetch(); void calls.refetch(); }}>Retry</button></p>}
        <ul>{results.map(result => <li key={result.key}><Link href={result.href} onClick={() => setOpen(false)} className="block rounded p-2 text-sm hover:bg-white/5 focus-visible:outline focus-visible:outline-signal"><span className="block text-[10px] text-signal">{result.kind}</span>{result.label}</Link></li>)}</ul>
        {!results.length && !markets.isFetching && !predictors.isFetching && !calls.isFetching && <p className="text-sm">No matches in the available results.</p>}
      </>}
    </div>}
  </div>;
}
