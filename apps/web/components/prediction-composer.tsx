"use client";

import { ModalShell } from "./modal-shell";

import type { DreamDexDirection, DreamDexMarketQuote } from "@credence/shared";
import { CheckCircle2, ExternalLink, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

import { TransactionStepper } from "./transaction-stepper";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { marketKeys } from "@/hooks/use-markets";
import { myPredictionsKey } from "@/hooks/use-predictions";
import { dreamDex } from "@/lib/dreamdex/adapter";
import { apiErrorMessage } from "@/services/api";
import { predictionsService, type CreatePredictionInput } from "@/services/predictions.service";
import { publishOnce } from "@/lib/publish-once";

type Stage = "IDLE" | "VALIDATING" | "PREPARING_TRADE" | "AWAITING_WALLET" | "CONFIRMING" | "RECORDING_PREDICTION" | "SUCCESS";

const stageLabel: Record<Exclude<Stage, "IDLE" | "SUCCESS">, string> = {
  VALIDATING: "Checking market",
  PREPARING_TRADE: "Preparing transaction",
  AWAITING_WALLET: "Waiting for wallet",
  CONFIRMING: "Confirming on Somnia",
  RECORDING_PREDICTION: "Linking prediction record",
};

export function PredictionComposer({ market, onClose }: { market: DreamDexMarketQuote; onClose: () => void }) {
  const [direction, setDirection] = useState<DreamDexDirection>("UP");
  const [confidence, setConfidence] = useState(65);
  const [stake, setStake] = useState(String(market.minimumQuantity ?? ""));
  const [reasoning, setReasoning] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "LOCKED">("PUBLIC");
  const [stage, setStage] = useState<Stage>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ wallet: string; input: CreatePredictionInput } | null>(null);
  const submitting = useRef(false);
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const auth = useAuth();
  const creatorProfile = useProfile(auth.data?.walletAddress ?? "");
  const queryClient = useQueryClient();
  const busy = stage !== "IDLE" && stage !== "SUCCESS";
  const probability = pending?.input.marketProbabilityAtEntry ?? (direction === "UP" ? market.probabilities?.yes : market.probabilities?.no);

  async function publish(): Promise<void> {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setPredictionId(null);
    try {
      setStage("VALIDATING");
      if (!address || !walletClient) throw new Error("Connect your wallet first.");
      if (!auth.data || auth.data.walletAddress !== address.toLowerCase()) throw new Error("Sign in with your wallet first.");
      const wallet = address.toLowerCase();
      const storageKey = `credence:pending-publish:${wallet}:${market.marketId}`;
      let saved = pending?.wallet === wallet && pending.input.marketId === market.marketId ? pending.input : null;
      if (!saved) {
        // Fail closed if recovery data cannot be read; never silently retrade.
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          saved = JSON.parse(raw) as CreatePredictionInput;
          if (saved.marketId !== market.marketId) throw new Error("Pending trade data needs recovery. Do not submit another trade.");
        }
      }
      if (saved && !/^0x[0-9a-f]{64}$/i.test(saved.transactionHash)) {
        setPending({ wallet, input: saved });
        setDirection(saved.direction);
        setConfidence(saved.confidence);
        setStake(saved.stakeAmount);
        setReasoning(saved.reasoning ?? "");
        setVisibility(saved.visibility);
        throw new Error("This draft already started a wallet attempt. Check wallet activity and enter its transaction hash below; no new trade will be submitted.");
      }
      const prediction = await publishOnce({
        pending: saved,
        execute: async () => {
      if (chainId !== somniaShannon.id) throw new Error("Switch to Somnia Shannon before trading.");
      if (!/^\d+(?:\.\d+)?$/.test(stake) || Number(stake) <= 0) throw new Error("Enter a valid positive stake.");
      if (market.minimumQuantity !== null && Number(stake) < market.minimumQuantity) throw new Error(`Minimum stake is ${market.minimumQuantity} ${market.collateralSymbol}.`);

      setStage("PREPARING_TRADE");
      const draft = await predictionsService.draft({ marketId: market.marketId, direction, confidence, stakeAmount: stake, reasoning: reasoning.trim() || undefined, visibility });
      const draftInput: CreatePredictionInput = { draftId: draft.id, marketId: draft.marketId, direction: draft.direction, confidence: draft.confidence, stakeAmount: draft.stakeAmount, reasoning: draft.reasoning, visibility: draft.visibility, marketProbabilityAtEntry: draft.marketProbabilityAtEntry, transactionHash: "" };
      // Persist an attempt marker BEFORE invoking the wallet. An interrupted
      // signer/receipt wait must not silently execute a second order on retry.
      setPending({ wallet, input: draftInput });
      localStorage.setItem(storageKey, JSON.stringify(draftInput));
      setStage("AWAITING_WALLET");
      const trade = await dreamDex.prepareOrExecutePredictionTrade({
        marketId: draft.marketId,
        marketAddress: draft.marketAddress,
        direction: draft.direction,
        walletClient,
        account: address,
        quantity: Number(draft.stakeAmount),
      });
      return {
        ...draftInput,
        transactionHash: trade.transactionHash,
      };
        },
        remember: (input) => {
          setPending({ wallet, input });
          setTransactionHash(input.transactionHash);
          setDirection(input.direction);
          setConfidence(input.confidence);
          setStake(input.stakeAmount);
          setReasoning(input.reasoning ?? "");
          setVisibility(input.visibility);
          // Save before the API request so a page reload cannot silently retrade.
          localStorage.setItem(storageKey, JSON.stringify(input));
        },
        link: (input) => {
          setStage("RECORDING_PREDICTION");
          return predictionsService.create(input);
        },
      });
      setPredictionId(prediction.id);
      setStage("SUCCESS");
      // Keep the receipt/payload for idempotent reopening of this same window.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myPredictionsKey }),
        queryClient.invalidateQueries({ queryKey: marketKeys.all }),
      ]);
    } catch (caught) {
      setError(apiErrorMessage(caught));
      setStage("IDLE");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <ModalShell titleId="composer-title" onClose={onClose} busy={busy} wide>
      <div className="flex flex-col overflow-hidden bg-[#0B0C0E]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-white/5 bg-[#0F1012] px-6 py-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">DreamDEX Event</span>
            <h2 id="composer-title" className="text-lg font-medium text-foreground">
              {market.underlying} Prediction
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close composer"
            className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-white/[0.05] hover:text-foreground transition-colors disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {stage === "SUCCESS" ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="mx-auto size-12 text-emerald-400" />
              <div>
                <h3 className="text-xl font-medium text-foreground">Prediction Confirmed</h3>
                <p className="mt-1 text-sm text-muted">
                  Your DreamDEX position was executed and recorded in your public reputation history.
                </p>
              </div>

              {predictionId && (
                <p className="mx-auto max-w-full truncate rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 font-mono text-xs text-muted">
                  Record ID: {predictionId}
                </p>
              )}

              {transactionHash && (
                <a
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-signal hover:underline"
                  href={`${somniaShannon.blockExplorers.default.url}/tx/${transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Somnia Explorer <ExternalLink className="size-3.5" />
                </a>
              )}

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full cursor-pointer rounded-full bg-signal py-2.5 font-mono text-xs font-semibold text-[#04131f] transition-all hover:bg-signal/90"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <fieldset disabled={busy || pending !== null} className="space-y-5">
              {/* Direction Selector */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Select Direction</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(["UP", "DOWN"] as const).map((value) => {
                    const prob = market.probabilities
                      ? Math.round((value === "UP" ? market.probabilities.yes : market.probabilities.no) * 100)
                      : null;
                    const isSelected = direction === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={busy}
                        aria-pressed={isSelected}
                        onClick={() => setDirection(value)}
                        className={`cursor-pointer rounded-xl border p-4 font-mono transition-all text-left ${
                          isSelected
                            ? value === "UP"
                              ? "border-emerald-400/40 bg-emerald-400/[0.08] text-emerald-300"
                              : "border-rose-400/40 bg-rose-400/[0.08] text-rose-300"
                            : "border-white/5 bg-white/[0.02] text-muted hover:border-white/10"
                        }`}
                      >
                        <div className="text-base font-semibold">{value}</div>
                        <div className="text-xs text-muted mt-1">{prob != null ? `${prob}% probability` : "—"}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confidence Slider */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-muted">Your Confidence</span>
                  <span className="text-lg font-semibold tabular-nums text-signal">{confidence}%</span>
                </div>
                <input
                  className="mt-3 w-full accent-signal cursor-pointer"
                  disabled={busy}
                  type="range"
                  min="50"
                  max="99"
                  value={confidence}
                  onChange={(event) => setConfidence(Number(event.target.value))}
                />
                <div className="mt-1 flex justify-between font-mono text-[9px] text-muted/50">
                  <span>50% (Toss-up)</span>
                  <span>99% (Near Certain)</span>
                </div>
              </div>

              {/* Stake Amount */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  Stake Amount ({market.collateralSymbol})
                </label>
                <input
                  className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 font-mono text-sm text-foreground placeholder:text-muted/60 focus:border-signal focus:outline-none"
                  disabled={busy}
                  inputMode="decimal"
                  placeholder="20"
                  value={stake}
                  onChange={(event) => setStake(event.target.value)}
                />
              </div>

              {/* Optional Reasoning */}
              <div>
                <label className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  <span>Reasoning</span>
                  <span className="text-muted/50 lowercase">optional</span>
                </label>
                <textarea
                  className="mt-1.5 min-h-20 w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-foreground placeholder:text-muted/50 focus:border-signal focus:outline-none"
                  disabled={busy}
                  maxLength={2000}
                  value={reasoning}
                  onChange={(event) => setReasoning(event.target.value)}
                  placeholder="What does the market appear to be missing?"
                />
              </div>

              {/* Visibility Choice */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Visibility</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 font-mono text-xs">
                  <button
                    type="button"
                    aria-pressed={visibility === "PUBLIC"}
                    onClick={() => setVisibility("PUBLIC")}
                    className={`cursor-pointer rounded-lg border p-2.5 transition-colors ${
                      visibility === "PUBLIC"
                        ? "border-signal/40 bg-signal/10 text-signal font-medium"
                        : "border-white/5 bg-white/[0.02] text-muted"
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    disabled={!creatorProfile.data?.verified}
                    aria-pressed={visibility === "LOCKED"}
                    onClick={() => setVisibility("LOCKED")}
                    className={`cursor-pointer rounded-lg border p-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      visibility === "LOCKED"
                        ? "border-signal/40 bg-signal/10 text-signal font-medium"
                        : "border-white/5 bg-white/[0.02] text-muted"
                    }`}
                  >
                    Locked Insight
                  </button>
                </div>
                {!creatorProfile.data?.verified && (
                  <p className="mt-1.5 font-mono text-[10px] text-muted/60">
                    Locked insights require Verified status (80+ Credence and 25 resolved predictions).
                  </p>
                )}
              </div>

              {/* Summary Box */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 font-mono text-xs space-y-2.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted block mb-1">
                  Prediction Review
                </span>
                <div className="flex justify-between">
                  <span className="text-muted">Call</span>
                  <span className="text-foreground">{market.underlying} {direction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Confidence</span>
                  <span className="text-signal">{confidence}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">DreamDEX Entry</span>
                  <span className="text-foreground">
                    {probability == null ? "Unavailable" : `${Math.round(probability * 1000) / 10}%`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Stake</span>
                  <span className="text-foreground">{stake || "0"} {market.collateralSymbol}</span>
                </div>
              </div>

              </fieldset>
              {pending?.input.draftId && !transactionHash && <label className="block text-xs text-muted">Existing draft trade hash (from wallet activity)
                <input aria-label="Existing draft trade hash" className="mt-2 block w-full rounded border border-white/10 bg-transparent p-2" placeholder="0x…" disabled={busy} onChange={event => {
                  const hash = event.target.value.trim();
                  setPending({ ...pending, input: { ...pending.input, transactionHash: hash } });
                }} />
              </label>}
              {error && (
                <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 font-mono text-xs text-rose-300">
                  {error}
                </p>
              )}

              {busy && (
                <TransactionStepper
                  steps={Object.values(stageLabel)}
                  current={stageLabel[stage as Exclude<Stage, "IDLE" | "SUCCESS">]}
                />
              )}

              {/* Submit CTA Button */}
              {chainId !== somniaShannon.id && address ? (
                <button
                  type="button"
                  onClick={() => switchChain({ chainId: somniaShannon.id })}
                  className="w-full cursor-pointer rounded-full bg-signal py-3 font-mono text-xs font-semibold text-[#04131f] transition-all hover:bg-signal/90"
                >
                  Switch to Somnia Shannon
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void publish()}
                  disabled={busy}
                  className="brand-button w-full cursor-pointer"
                >
                  <span>{pending ? "Retry linking record — no new trade" : "Publish & Trade"}</span>
                </button>
              )}

              <p className="text-center font-mono text-[10px] text-muted/60">
                {pending ? "Your forecast is frozen. Retrying only verifies the existing transaction; it never submits another trade." : "Your forecast will be saved before your wallet executes the DreamDEX position on Shannon Testnet."}
              </p>
              {transactionHash && <a className="block break-all text-xs text-signal" href={`${somniaShannon.blockExplorers.default.url}/tx/${transactionHash}`} target="_blank" rel="noreferrer">Confirmed trade: {transactionHash}</a>}
            </>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
