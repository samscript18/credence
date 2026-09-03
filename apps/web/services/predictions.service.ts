import type { ApiResponse, CredencePrediction, DreamDexDirection, PredictionFeedItem } from "@credence/shared";

import { api } from "./api";

export type CreatePredictionInput = {
  marketId: string;
  direction: DreamDexDirection;
  confidence: number;
  stakeAmount: string;
  reasoning?: string;
  visibility: "PUBLIC";
  marketProbabilityAtEntry: number;
  transactionHash: string;
};

export const predictionsService = {
  async create(input: CreatePredictionInput): Promise<CredencePrediction> {
    const response = await api.post<ApiResponse<CredencePrediction>>("/predictions", input);
    return response.data.data;
  },

  async mine(): Promise<CredencePrediction[]> {
    const response = await api.get<ApiResponse<CredencePrediction[]>>("/predictions/me");
    return response.data.data;
  },

  async feed(): Promise<PredictionFeedItem[]> {
    const response = await api.get<ApiResponse<PredictionFeedItem[]>>("/predictions/feed");
    return response.data.data;
  },
};
