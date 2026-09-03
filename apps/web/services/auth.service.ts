import type { ApiResponse } from "@credence/shared";

import { api } from "./api";

export type AuthUser = { walletAddress: string };

export const authService = {
  async nonce(address: string) {
    const response = await api.get<ApiResponse<{ nonce: string; message: string }>>("/auth/nonce", {
      params: { address },
    });
    return response.data.data;
  },

  async verify(input: { address: string; nonce: string; signature: string }) {
    const response = await api.post<ApiResponse<{ user: AuthUser }>>("/auth/verify", input);
    return response.data.data.user;
  },

  async me() {
    const response = await api.get<ApiResponse<{ user: AuthUser }>>("/auth/me");
    return response.data.data.user;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
};
