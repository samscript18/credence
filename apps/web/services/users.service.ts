import type { ApiResponse, PredictorProfile, UpdateProfileInput } from "@credence/shared";

import { api } from "./api";

export const usersService = {
  async uploadAvatar(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post<ApiResponse<{ avatarUrl: string }>>("/users/profile/avatar", form, { timeout: 40_000 });
    return response.data.data.avatarUrl;
  },
  async profile(address: string): Promise<PredictorProfile> {
    const response = await api.get<ApiResponse<PredictorProfile>>(`/users/${encodeURIComponent(address)}`);
    return response.data.data;
  },

  async updateProfile(input: UpdateProfileInput): Promise<PredictorProfile> {
    const response = await api.patch<ApiResponse<PredictorProfile>>("/users/profile", input);
    return response.data.data;
  },
};
