import { randomBytes } from "node:crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { verifyMessage } from "viem";

import { User } from "../users/schemas/user.schema.js";
import {
  AUTH_CHALLENGE_TTL_MS,
  buildAuthMessage,
  normalizeWalletAddress,
} from "./auth-message.js";
import { AuthChallenge } from "./schemas/auth-challenge.schema.js";

export type AuthNonce = {
  address: string;
  nonce: string;
  message: string;
  expiresAt: string;
};

export type AuthSession = {
  token: string;
  user: { walletAddress: string };
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AuthChallenge.name)
    private readonly challengeModel: Model<AuthChallenge>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async createNonce(address: string): Promise<AuthNonce> {
    const walletAddress = normalizeWalletAddress(address);
    const nonce = randomBytes(24).toString("hex");
    const message = buildAuthMessage(walletAddress, nonce);
    const expiresAt = new Date(Date.now() + AUTH_CHALLENGE_TTL_MS);

    await this.challengeModel
      .findOneAndUpdate(
        { walletAddress },
        { walletAddress, nonce, message, expiresAt },
        { upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return { address: walletAddress, nonce, message, expiresAt: expiresAt.toISOString() };
  }

  async verifyWallet(
    address: string,
    nonce: string,
    signature: `0x${string}`,
  ): Promise<AuthSession> {
    const walletAddress = normalizeWalletAddress(address);
    const challenge = await this.challengeModel.findOne({ walletAddress, nonce }).exec();

    if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        message: "Authentication challenge is invalid or expired",
        code: "AUTH_CHALLENGE_INVALID",
      });
    }

    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: challenge.message,
      signature,
    });

    if (!isValid) {
      throw new UnauthorizedException({
        message: "Wallet signature is invalid",
        code: "AUTH_SIGNATURE_INVALID",
      });
    }

    // A challenge is single-use. Deleting it before issuing the session prevents replay.
    await this.challengeModel.deleteOne({ _id: challenge._id }).exec();
    const user = await this.userModel
      .findOneAndUpdate(
        { walletAddress },
        { $setOnInsert: { walletAddress } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .orFail()
      .exec();
    const token = await this.jwtService.signAsync({ sub: user.walletAddress });

    return { token, user: { walletAddress: user.walletAddress } };
  }

  async decodeSession(token: string): Promise<{ walletAddress: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      return { walletAddress: normalizeWalletAddress(payload.sub) };
    } catch {
      throw new UnauthorizedException({
        message: "Authentication session is invalid or expired",
        code: "AUTH_SESSION_INVALID",
      });
    }
  }
}
