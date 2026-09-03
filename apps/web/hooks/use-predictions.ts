"use client";

import { useQuery } from "@tanstack/react-query";

import { predictionsService } from "@/services/predictions.service";

export const myPredictionsKey = ["predictions", "me"] as const;
export const predictionFeedKey = ["predictions", "feed"] as const;

export function useMyPredictions(enabled = true) {
  return useQuery({ queryKey: myPredictionsKey, queryFn: predictionsService.mine, enabled });
}

export function usePredictionFeed() {
  return useQuery({
    queryKey: predictionFeedKey,
    queryFn: predictionsService.feed,
    refetchInterval: 15_000,
    staleTime: 8_000,
  });
}
