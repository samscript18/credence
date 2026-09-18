import { describe, expect, it, vi } from "vitest";
import { AutoClaimService } from "./auto-claim.service.js";

const recovery = vi.hoisted(() => ({ recoverTypedDataAddress: vi.fn() }));
vi.mock("viem", async (importOriginal) => ({ ...await importOriginal<typeof import("viem")>(), recoverTypedDataAddress: recovery.recoverTypedDataAddress }));
vi.mock("../predictions/schemas/prediction.schema.js", () => ({ Prediction: class Prediction {} }));
vi.mock("./auto-claim.schema.js", () => ({ AutoClaimAuthorization: class AutoClaimAuthorization {}, AutoClaimExecution: class AutoClaimExecution {} }));
vi.mock("../dreamdex/dreamdex.service.js", () => ({ DreamDexService: class DreamDexService {} }));
vi.mock("../predictions/predictions.service.js", () => ({ PredictionsService: class PredictionsService {} }));
vi.mock("./keeperhub.client.js", () => ({ KeeperHubClient: class KeeperHubClient {}, KeeperHubSubmissionUnknownError: class KeeperHubSubmissionUnknownError extends Error {} }));

const owner = "0x56507c117a2858b4f951237155cccfc1f2520068";
const marketId = "0x000000000000000000000000000000000000000000000000000000000001bb32";
const marketAddress = "0xb9a3aa613b6770a2b7ba5fb2d04719a8afa98a4e";
const venueId = "0x679795a0195a1b76cdebb7c51d74e058aee92919b8c3389af86ef24535e8a28c";

function setup(status: "ACTIVE" | "RESOLVED" = "RESOLVED") {
  const prediction = { _id: "candidate", predictorAddress: owner, source: "LIVE", status, marketId, marketAddress, direction: "UP", positionReference: "3000000", venueId };
  const dreamDex = { redemptionSnapshot: vi.fn().mockResolvedValue({
    chainId: 50312, marketAddress, outcomeToken: "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9",
    outcomeId: 4077975235123937390429559742566565423657578758518772568739672292858368n,
    balance: 3000000n, operatorApproved: false, outcomeAllowance: 0n,
  }), assertRedeemAuthorization: vi.fn().mockResolvedValue(undefined) };
  const keeperHub = { submit: vi.fn() };
  const predictionModel = { findOne: vi.fn().mockReturnValue({ exec: () => Promise.resolve(prediction) }), updateOne: vi.fn().mockReturnValue({ exec: () => Promise.resolve({ modifiedCount: 1 }) }) };
  const authorizations = { findOneAndUpdate: vi.fn().mockReturnValue({ exec: () => Promise.resolve({ _id: "authorization", status: "READY" }) }) };
  const executions = { findOne: vi.fn().mockReturnValue({ exec: () => Promise.resolve(null) }), updateMany: vi.fn().mockReturnValue({ exec: () => Promise.resolve({ modifiedCount: 0 }) }) };
  const config = { get: (key: string, fallback = "") => ({
    ENABLE_AUTO_CLAIM: "false", AUTO_CLAIM_ENCRYPTION_KEY: "ab".repeat(32), AUTO_CLAIM_AUTH_TTL_SECONDS: "2592000",
  }[key] ?? fallback) };
  const service = new AutoClaimService(config as never, dreamDex as never, keeperHub as never, {} as never, predictionModel as never, authorizations as never, executions as never);
  return { service, dreamDex, keeperHub, predictionModel, authorizations };
}

describe("per-prediction setup with the worker disabled", () => {
  it("prepares the exact resolved position without starting an execution", async () => {
    const { service, dreamDex, keeperHub } = setup();
    const prepared = await service.prepare("candidate", owner);
    expect(dreamDex.redemptionSnapshot).toHaveBeenCalledWith(marketId, owner, 0);
    expect(prepared).toMatchObject({ chainId: 50312, owner, marketId, marketAddress, outcomeIdx: 0, amount: "3000000", operatorId: 0, venueId, approvalRequired: true, approvalAmount: "3000000" });
    expect(BigInt(prepared.nonce)).toBeGreaterThan(0n);
    expect(Number(prepared.deadline)).toBeGreaterThan(Math.floor(Date.now() / 1000) + 29 * 86400);
    expect(keeperHub.submit).not.toHaveBeenCalled();
  });

  it("does not discover or submit while the global worker flag is false", async () => {
    const { service, keeperHub } = setup();
    const discover = vi.spyOn(service, "discover");
    const processOne = vi.spyOn(service, "processOne");
    await service.poll();
    expect(discover).not.toHaveBeenCalled();
    expect(processOne).not.toHaveBeenCalled();
    expect(keeperHub.submit).not.toHaveBeenCalled();
  });

  it("checks the signed nonce with DreamDEX before storing one prediction's authorization", async () => {
    recovery.recoverTypedDataAddress.mockResolvedValueOnce(owner);
    const { service, dreamDex, keeperHub, predictionModel, authorizations } = setup();
    const prepared = await service.prepare("candidate", owner);
    const signature = `0x${"11".repeat(65)}`;
    dreamDex.redemptionSnapshot.mockResolvedValueOnce({
      chainId: 50312, marketAddress, outcomeToken: "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9",
      outcomeId: 4077975235123937390429559742566565423657578758518772568739672292858368n,
      balance: 3000000n, operatorApproved: false, outcomeAllowance: 3000000n,
    });
    await service.enable("candidate", owner, {
      module: prepared.module, marketId: prepared.marketId, outcomeIdx: 0, amount: prepared.amount,
      nonce: prepared.nonce, deadline: prepared.deadline, operatorId: prepared.operatorId,
      venueId: prepared.venueId, signature,
    });
    expect(dreamDex.assertRedeemAuthorization).toHaveBeenCalledWith(expect.objectContaining({ owner, marketId, outcomeIdx: 0, amount: 3000000n, nonce: BigInt(prepared.nonce), signature }));
    expect(authorizations.findOneAndUpdate).toHaveBeenCalled();
    expect(predictionModel.updateOne).toHaveBeenCalled();
    await service.poll();
    expect(keeperHub.submit).not.toHaveBeenCalled();
  });

  it("stores an active prediction authorization without simulating a pre-settlement redemption", async () => {
    recovery.recoverTypedDataAddress.mockResolvedValueOnce(owner);
    const { service, dreamDex, authorizations } = setup("ACTIVE");
    const prepared = await service.prepare("candidate", owner);
    dreamDex.redemptionSnapshot.mockResolvedValueOnce({
      chainId: 50312, marketAddress, outcomeToken: "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9",
      outcomeId: 4077975235123937390429559742566565423657578758518772568739672292858368n,
      balance: 3000000n, operatorApproved: false, outcomeAllowance: 3000000n,
    });
    await service.enable("candidate", owner, {
      module: prepared.module, marketId: prepared.marketId, outcomeIdx: 0, amount: prepared.amount,
      nonce: prepared.nonce, deadline: prepared.deadline, operatorId: prepared.operatorId,
      venueId: prepared.venueId, signature: `0x${"22".repeat(65)}`,
    });
    expect(dreamDex.assertRedeemAuthorization).not.toHaveBeenCalled();
    expect(authorizations.findOneAndUpdate).toHaveBeenCalled();
  });
});
