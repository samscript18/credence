import { UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { Model } from "mongoose";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it, vi } from "vitest";

import type { User } from "../users/schemas/user.schema.js";
import { buildAuthMessage, normalizeWalletAddress } from "./auth-message.js";
import { AuthService } from "./auth.service.js";
import type { AuthChallenge } from "./schemas/auth-challenge.schema.js";

type QueryResult<T> = { exec: () => Promise<T> };

function query<T>(value: T): QueryResult<T> {
  return { exec: () => Promise.resolve(value) };
}

describe("AuthService", () => {
  it("creates a persisted single-wallet challenge", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const findOneAndUpdate = vi.fn(() => query(undefined));
    const service = new AuthService(
      { findOneAndUpdate } as unknown as Model<AuthChallenge>,
      {} as Model<User>,
      {} as JwtService,
    );

    const result = await service.createNonce(account.address);

    expect(result.address).toBe(account.address.toLowerCase());
    expect(result.nonce).toMatch(/^[a-f\d]{48}$/);
    expect(result.message).toBe(buildAuthMessage(account.address, result.nonce));
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(findOneAndUpdate).toHaveBeenCalledOnce();
  });

  it("verifies a real EVM signature, consumes the challenge, and issues a session", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const walletAddress = normalizeWalletAddress(account.address);
    const nonce = "a".repeat(48);
    const message = buildAuthMessage(account.address, nonce);
    const signature = await account.signMessage({ message });
    const deleteOne = vi.fn(() => query({ acknowledged: true }));
    const challengeModel = {
      findOne: vi.fn(() =>
        query({ _id: "challenge-id", walletAddress, nonce, message, expiresAt: new Date(Date.now() + 60_000) }),
      ),
      deleteOne,
    };
    const userQuery = {
      orFail: () => query({ walletAddress }),
    };
    const userModel = { findOneAndUpdate: vi.fn(() => userQuery) };
    const jwtService = { signAsync: vi.fn(() => Promise.resolve("signed-jwt")) };
    const service = new AuthService(
      challengeModel as unknown as Model<AuthChallenge>,
      userModel as unknown as Model<User>,
      jwtService as unknown as JwtService,
    );

    const result = await service.verifyWallet(account.address, nonce, signature);

    expect(result).toEqual({
      token: "signed-jwt",
      user: { walletAddress },
    });
    expect(deleteOne).toHaveBeenCalledWith({ _id: "challenge-id" });
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: walletAddress });
  });

  it("rejects a signature from a different wallet without consuming the challenge", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const attacker = privateKeyToAccount(generatePrivateKey());
    const nonce = "b".repeat(48);
    const message = buildAuthMessage(account.address, nonce);
    const signature = await attacker.signMessage({ message });
    const deleteOne = vi.fn(() => query({ acknowledged: true }));
    const challengeModel = {
      findOne: vi.fn(() =>
        query({
          _id: "challenge-id",
          walletAddress: account.address.toLowerCase(),
          nonce,
          message,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      ),
      deleteOne,
    };
    const service = new AuthService(
      challengeModel as unknown as Model<AuthChallenge>,
      {} as Model<User>,
      {} as JwtService,
    );

    await expect(service.verifyWallet(account.address, nonce, signature)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it("rejects expired challenges", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const challengeModel = {
      findOne: vi.fn(() =>
        query({
          expiresAt: new Date(Date.now() - 1),
        }),
      ),
    };
    const service = new AuthService(
      challengeModel as unknown as Model<AuthChallenge>,
      {} as Model<User>,
      {} as JwtService,
    );

    await expect(
      service.verifyWallet(account.address, "c".repeat(48), `0x${"0".repeat(130)}`),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
