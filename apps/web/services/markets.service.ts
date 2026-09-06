import type { ApiResponse, DreamDexMarketQuote } from "@credence/shared";

import { api } from "./api";

export const marketsService = {
  async list(): Promise<DreamDexMarketQuote[]> {
    // Covers the API's 25s discovery plus up to 5s quote reads.
    const response = await api.get<ApiResponse<DreamDexMarketQuote[]>>("/markets", { timeout: 35_000 });
    return response.data.data;
  },

  async get(marketId: string): Promise<DreamDexMarketQuote> {
    const response = await api.get<ApiResponse<DreamDexMarketQuote>>(
      `/markets/${encodeURIComponent(marketId)}`,
    );
    return response.data.data;
  },
};
