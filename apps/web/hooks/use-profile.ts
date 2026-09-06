"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateProfileInput } from "@credence/shared";

import { usersService } from "@/services/users.service";

export function useProfile(address: string) {
  return useQuery({
    queryKey: ["profile", address.toLowerCase()],
    queryFn: () => usersService.profile(address),
    enabled: Boolean(address),
    staleTime: 15_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => usersService.updateProfile(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile", updated.walletAddress.toLowerCase()], updated);
      void queryClient.invalidateQueries({ queryKey: ["profile", updated.walletAddress.toLowerCase()] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["predictions"] });
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
