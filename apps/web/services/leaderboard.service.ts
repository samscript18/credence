import type { ApiResponse, LeaderboardEntry } from "@credence/shared";

import { api } from "./api";

export const leaderboardService = {
  async list(): Promise<LeaderboardEntry[]> {
    const response = await api.get<ApiResponse<LeaderboardEntry[]>>("/leaderboard");
    return response.data.data;
  },
};
