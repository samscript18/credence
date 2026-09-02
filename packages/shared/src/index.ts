export const SOMNIA_SHANNON_CHAIN_ID = 50_312;

export type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};
