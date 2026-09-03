"use client";

import { useQuery } from "@tanstack/react-query";

import { predictionsService } from "@/services/predictions.service";

export const myPredictionsKey = ["predictions", "me"] as const;

export function useMyPredictions(enabled = true) {
  return useQuery({ queryKey: myPredictionsKey, queryFn: predictionsService.mine, enabled });
}
