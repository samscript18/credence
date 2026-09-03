"use client";

import { useQuery } from "@tanstack/react-query";

import { usersService } from "@/services/users.service";

export function useProfile(address: string) {
  return useQuery({
    queryKey: ["profile", address.toLowerCase()],
    queryFn: () => usersService.profile(address),
    enabled: Boolean(address),
    staleTime: 15_000,
  });
}
