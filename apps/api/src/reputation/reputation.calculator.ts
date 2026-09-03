export const REPUTATION_START = 50;
export const REPUTATION_K = 5;

export type ResolvedForecast = {
  direction: "UP" | "DOWN";
  confidence: number;
  marketProbabilityAtEntry: number;
  finalOutcome: "UP" | "DOWN" | "VOID";
  createdAt: Date;
  realizedPnl?: string;
};

export type ReputationResult = {
  reputationScore: number;
  resolvedPredictions: number;
  correctPredictions: number;
  incorrectPredictions: number;
  accuracy: number;
  realizedPnl: string;
};

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

export function sumDecimalStrings(values: string[]): string {
  const parsed = values.map((value) => {
    const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
    if (!match) throw new Error(`Invalid monetary decimal: ${value}`);
    return { negative: match[1] === "-", whole: match[2]!, fraction: match[3] ?? "" };
  });
  const scale = Math.max(0, ...parsed.map((value) => value.fraction.length));
  const total = parsed.reduce((sum, value) => {
    const units = BigInt(`${value.whole}${value.fraction.padEnd(scale, "0")}`);
    return sum + (value.negative ? -units : units);
  }, 0n);
  const negative = total < 0n;
  const digits = (negative ? -total : total).toString().padStart(scale + 1, "0");
  if (scale === 0) return `${negative ? "-" : ""}${digits}`;
  const whole = digits.slice(0, -scale);
  const fraction = digits.slice(-scale).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function calculateReputation(predictions: ResolvedForecast[]): ReputationResult {
  let score = REPUTATION_START;
  let correct = 0;
  let incorrect = 0;
  const chronological = [...predictions]
    .filter((prediction) => prediction.finalOutcome !== "VOID")
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

  for (const prediction of chronological) {
    const y = prediction.finalOutcome === prediction.direction ? 1 : 0;
    if (y === 1) correct += 1;
    else incorrect += 1;
    const market = prediction.marketProbabilityAtEntry;
    const predictor = prediction.confidence / 100;
    const improvement = (market - y) ** 2 - (predictor - y) ** 2;
    score = clamp(score + improvement * REPUTATION_K);
  }

  const resolved = correct + incorrect;
  return {
    reputationScore: score,
    resolvedPredictions: resolved,
    correctPredictions: correct,
    incorrectPredictions: incorrect,
    accuracy: resolved === 0 ? 0 : (correct / resolved) * 100,
    realizedPnl: sumDecimalStrings(chronological.map((prediction) => prediction.realizedPnl ?? "0")),
  };
}
