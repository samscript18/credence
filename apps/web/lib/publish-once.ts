import type { CreatePredictionInput } from "../services/predictions.service";

/** Linking retries must never cross the wallet-execution boundary again. */
export async function publishOnce<T>(options: {
  pending: CreatePredictionInput | null;
  execute: () => Promise<CreatePredictionInput>;
  remember: (input: CreatePredictionInput) => void;
  link: (input: CreatePredictionInput) => Promise<T>;
}): Promise<T> {
  const input = options.pending ?? await options.execute();
  options.remember(input);
  return options.link(input);
}
