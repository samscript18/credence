import { describe, expect, it, vi } from "vitest";
import { publishOnce } from "./publish-once";
import type { CreatePredictionInput } from "../services/predictions.service";

const input: CreatePredictionInput = { draftId: "server-draft", marketId: "original-window", direction: "UP", confidence: 91, stakeAmount: "0.001", visibility: "PUBLIC", marketProbabilityAtEntry: 0.5, transactionHash: `0x${"1".repeat(64)}` };

describe("publish retry boundary", () => {
  it("executes once across three timed-out linking attempts", async () => {
    let pending: CreatePredictionInput | null = null;
    const execute = vi.fn().mockResolvedValue(input);
    const link = vi.fn().mockRejectedValue(new Error("timeout"));
    for (let attempt = 0; attempt < 3; attempt++) {
      await expect(publishOnce({ pending, execute, link, remember: value => { pending = value; } })).rejects.toThrow("timeout");
    }
    expect(execute).toHaveBeenCalledTimes(1);
    expect(link).toHaveBeenCalledTimes(3);
    expect(link).toHaveBeenLastCalledWith(input);
  });
  it("reuses persisted inputs after reload rather than changed draft fields", async () => {
    const execute = vi.fn();
    const link = vi.fn().mockResolvedValue({ id: "saved" });
    await publishOnce({ pending: JSON.parse(JSON.stringify(input)), execute, link, remember: vi.fn() });
    expect(execute).not.toHaveBeenCalled();
    expect(link).toHaveBeenCalledWith(input);
  });
  it("does not call the wallet or link when saving recovery state fails", async () => {
    const execute = vi.fn();
    const link = vi.fn();
    await expect(publishOnce({ pending: input, execute, link, remember: () => { throw new Error("storage blocked"); } })).rejects.toThrow("storage blocked");
    expect(execute).not.toHaveBeenCalled();
    expect(link).not.toHaveBeenCalled();
  });
});
