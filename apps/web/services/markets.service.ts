import type { ApiResponse, DreamDexMarketQuote } from "@credence/shared";

import { api } from "./api";

export const marketsService = {
  async list(): Promise<DreamDexMarketQuote[]> {
    const response = await api.get<ApiResponse<DreamDexMarketQuote[]>>("/markets");
    return response.data.data;
  },

  async get(marketId: string): Promise<DreamDexMarketQuote> {
    const response = await api.get<ApiResponse<DreamDexMarketQuote>>(
      `/markets/${encodeURIComponent(marketId)}`,
    );
    return response.data.data;
  },
};
