import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";
import type { Address, Hex } from "viem";
import { binaryModuleWriteAbi } from "@somnia-chain/markets-sdk";

export type KeeperHubSubmission = { executionId: string; status: string; transactionHash?: Hex; transactionLink?: string };
export type KeeperHubStatus = KeeperHubSubmission & { receipts?: { hash: Hex; verified: boolean; receiptStatus: string }[]; error?: unknown };

export class KeeperHubSubmissionUnknownError extends Error {}

@Injectable()
export class KeeperHubClient {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const baseURL = this.config.get<string>("KEEPERHUB_API_URL", "").replace(/\/$/, "");
    const key = this.config.get<string>("KEEPERHUB_API_KEY", "");
    if (!baseURL || !key) throw new Error("KeeperHub Auto-Claim configuration is missing");
    return { baseURL, headers: { Authorization: `Bearer ${key}` } };
  }

  async submit(input: { key: string; module: Address; chainId: number; args: readonly unknown[] }): Promise<KeeperHubSubmission> {
    const settings = this.settings();
    try {
      const response = await axios.post<KeeperHubSubmission>(`${settings.baseURL}/api/execute/contract-call`, {
        contractAddress: input.module,
        chainId: input.chainId,
        functionName: "redeemFor",
        functionArgs: JSON.stringify(input.args, (_key: string, value: unknown): unknown => typeof value === "bigint" ? value.toString() : value),
        abi: JSON.stringify(binaryModuleWriteAbi),
      }, { timeout: 30_000, headers: { ...settings.headers, "Content-Type": "application/json", "Idempotency-Key": input.key } });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ code?: string }>;
      if (!axiosError.response || axiosError.response.status >= 500 || axiosError.response.data?.code === "idempotency_in_progress") throw new KeeperHubSubmissionUnknownError("KeeperHub submission outcome is unknown");
      throw new Error(`KeeperHub rejected redemption (${axiosError.response.status})`);
    }
  }

  async status(executionId: string): Promise<{ value: KeeperHubStatus; terminal: boolean }> {
    const settings = this.settings();
    const response = await axios.get<KeeperHubStatus>(`${settings.baseURL}/api/execute/${encodeURIComponent(executionId)}/status`, { timeout: 20_000, headers: settings.headers });
    return { value: response.data, terminal: response.headers["x-poll-interval-hint"] === "0" || ["completed", "failed"].includes(response.data.status) };
  }
}
