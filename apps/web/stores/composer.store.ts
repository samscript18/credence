"use client";

import { create } from "zustand";

type ComposerState = {
  selectedMarketId: string | null;
  selectMarket: (marketId: string) => void;
  clearMarket: () => void;
};

export const useComposerStore = create<ComposerState>((set) => ({
  selectedMarketId: null,
  selectMarket: (selectedMarketId) => set({ selectedMarketId }),
  clearMarket: () => set({ selectedMarketId: null }),
}));
