import type { ApiResponse, CredencePrediction, DreamDexDirection, PredictionFeedItem } from "@credence/shared";

import { api } from "./api";

export type CreatePredictionInput = {
  draftId?: string;
  marketId: string;
  direction: DreamDexDirection;
  confidence: number;
  stakeAmount: string;
  reasoning?: string;
  visibility: "PUBLIC" | "LOCKED";
  marketProbabilityAtEntry: number;
  transactionHash: string;
};

export const predictionsService = {
  async draft(input: Omit<CreatePredictionInput, "transactionHash" | "marketProbabilityAtEntry" | "draftId">): Promise<CredencePrediction> {
    const response = await api.post<ApiResponse<CredencePrediction>>("/predictions/draft", input, { timeout: 60_000 });
    return response.data.data;
  },
  async confirmClaim(id: string, transactionHash: string): Promise<void> {
    await api.post(`/predictions/${encodeURIComponent(id)}/claim`, { transactionHash });
  },
  async create(input: CreatePredictionInput): Promise<CredencePrediction> {
    // Receipt, chain status and fill-indexing checks may outlast the generic
    // 20-second UI timeout. Retrying still reuses this exact transaction.
    const response = await api.post<ApiResponse<CredencePrediction>>(input.draftId ? `/predictions/draft/${encodeURIComponent(input.draftId)}/confirm` : "/predictions", input.draftId ? { transactionHash: input.transactionHash } : input, { timeout: 60_000 }).catch((error: unknown) => {
      if (typeof error === "object" && error && "code" in error && error.code === "ECONNABORTED") {
        throw new Error("Your trade is confirmed, but linking the Credence record timed out. Retry linking only; do not place another trade.");
      }
      throw error;
    });
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
