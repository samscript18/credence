"use client";

import { useQuery } from "@tanstack/react-query";

import { authService } from "@/services/auth.service";

export const authKey = ["auth", "me"] as const;

export function useAuth() {
  return useQuery({ queryKey: authKey, queryFn: authService.me, retry: false, staleTime: 60_000 });
}
