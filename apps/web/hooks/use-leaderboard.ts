"use client";

import { useQuery } from "@tanstack/react-query";

import { leaderboardService } from "@/services/leaderboard.service";

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: leaderboardService.list,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}
