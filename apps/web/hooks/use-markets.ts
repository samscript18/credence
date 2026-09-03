"use client";

import { useQuery } from "@tanstack/react-query";

import { marketsService } from "@/services/markets.service";

export const marketKeys = {
  all: ["markets"] as const,
  detail: (marketId: string) => ["markets", marketId] as const,
};

export function useMarkets() {
  return useQuery({
    queryKey: marketKeys.all,
    queryFn: marketsService.list,
    refetchInterval: 15_000,
    staleTime: 8_000,
  });
}

export function useMarket(marketId: string) {
  return useQuery({
    queryKey: marketKeys.detail(marketId),
    queryFn: () => marketsService.get(marketId),
    enabled: Boolean(marketId),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
