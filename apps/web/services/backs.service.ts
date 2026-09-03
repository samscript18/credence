import type { ApiResponse, BackedPredictionRecord } from "@credence/shared";

import { api } from "./api";

export const backsService = {
  async create(predictionId: string, transactionHash: string): Promise<BackedPredictionRecord> {
    const response = await api.post<ApiResponse<BackedPredictionRecord>>(`/predictions/${predictionId}/backs`, { transactionHash }, { timeout: 90_000 });
    return response.data.data;
  },

  async mine(predictionId: string): Promise<BackedPredictionRecord | null> {
    const response = await api.get<ApiResponse<BackedPredictionRecord | null>>(`/predictions/${predictionId}/backs/me`);
    return response.data.data;
  },

  async recoverLatest(predictionId: string): Promise<BackedPredictionRecord> {
    const response = await api.post<ApiResponse<BackedPredictionRecord>>(`/predictions/${predictionId}/backs/recover`, undefined, { timeout: 90_000 });
    return response.data.data;
  },
};
