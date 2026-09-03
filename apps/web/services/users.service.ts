import type { ApiResponse, PredictorProfile } from "@credence/shared";

import { api } from "./api";

export const usersService = {
  async profile(address: string): Promise<PredictorProfile> {
    const response = await api.get<ApiResponse<PredictorProfile>>(`/users/${encodeURIComponent(address)}`);
    return response.data.data;
  },
};
