import { describe, expect, it, vi } from "vitest";
import { UsersService } from "./users.service.js";

function setup(user: Record<string, unknown> = {}) {
  const walletAddress = "0x421ab98aeb38cb022fe80d5bd1da7ea404bdd90b";
  const doc = { walletAddress, reputationScore: 50, resolvedPredictions: 0, accuracy: 0, correctPredictions: 0, incorrectPredictions: 0, realizedPnl: "0", autoClaimPreference: false, ...user };
  const userModel = {
    findOne: vi.fn().mockReturnValue({ exec: () => Promise.resolve(doc) }),
    findOneAndUpdate: vi.fn().mockReturnValue({ exec: () => Promise.resolve(doc) }),
  };
  const predictions = {
    getForProfile: vi.fn().mockResolvedValue({ active: [], resolved: [] }),
  };
  const leaderboard = { ranks: vi.fn().mockResolvedValue(new Map()) };
  const disableAutoClaim = vi.fn();
  const service = new UsersService(userModel as never, predictions as never, leaderboard as never);
  return { service, userModel, predictions, disableAutoClaim, walletAddress, doc };
}

describe("user Auto-Claim preference", () => {
  it("defaults OFF on the owner's profile", async () => {
    const { service, walletAddress } = setup();
    const profile = await service.getProfile(walletAddress, walletAddress);
    expect(profile.autoClaimPreference).toBe(false);
  });

  it("persists the preference without signing, approving, or executing", async () => {
    const { service, userModel, walletAddress, doc } = setup();
    userModel.findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve({ ...doc, autoClaimPreference: true }) });
    userModel.findOne.mockReturnValue({ exec: () => Promise.resolve({ ...doc, autoClaimPreference: true }) });
    const profile = await service.updateProfile(walletAddress, { autoClaimPreference: true });
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { walletAddress },
      { $set: { autoClaimPreference: true }, $unset: {} },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    expect(profile.autoClaimPreference).toBe(true);
  });

  it("hides the preference from other viewers", async () => {
    const { service, walletAddress } = setup({ autoClaimPreference: true });
    const publicProfile = await service.getProfile(walletAddress, "0x1111111111111111111111111111111111111111");
    expect(publicProfile.autoClaimPreference).toBeUndefined();
  });

  it("turning the preference OFF does not disable existing prediction authorizations", async () => {
    const { service, userModel, walletAddress, doc } = setup({ autoClaimPreference: true });
    userModel.findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve({ ...doc, autoClaimPreference: false }) });
    userModel.findOne.mockReturnValue({ exec: () => Promise.resolve({ ...doc, autoClaimPreference: false }) });
    await service.updateProfile(walletAddress, { autoClaimPreference: false });
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { walletAddress },
      { $set: { autoClaimPreference: false }, $unset: {} },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  });
});
