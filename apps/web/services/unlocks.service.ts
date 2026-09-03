import type { ApiResponse, UnlockConfirmation, UnlockInstructions } from "@credence/shared";

import { api } from "./api";

export const unlocksService = {
  async prepare(predictionId: string): Promise<UnlockInstructions> {
    const response = await api.post<ApiResponse<UnlockInstructions>>(`/predictions/${predictionId}/unlock/prepare`);
    return response.data.data;
  },

  async confirm(predictionId: string, transactionHash: string): Promise<UnlockConfirmation> {
    const response = await api.post<ApiResponse<UnlockConfirmation>>(`/predictions/${predictionId}/unlock/confirm`, { transactionHash });
    return response.data.data;
  },
};
