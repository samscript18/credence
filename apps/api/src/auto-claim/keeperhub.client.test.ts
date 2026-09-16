import { beforeEach, describe, expect, it, vi } from "vitest";
import { KeeperHubClient, KeeperHubSubmissionUnknownError } from "./keeperhub.client.js";

const mocks = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("axios", () => ({ default: mocks }));
const post = mocks.post;
const config = { get: (key: string, fallback = "") => ({ KEEPERHUB_API_URL: "https://keeperhub.test", KEEPERHUB_API_KEY: "kh_test" }[key] ?? fallback) };
const input = { key: "stable-key", module: "0x1111111111111111111111111111111111111111" as const, chainId: 50312, args: [] };

describe("KeeperHub submission safety", () => {
  beforeEach(() => vi.clearAllMocks());
  it("passes Credence's durable key to KeeperHub", async () => {
    post.mockResolvedValueOnce({ data: { executionId: "exec-1", status: "completed" } });
    await new KeeperHubClient(config as never).submit(input);
    const options = post.mock.calls[0]?.[2] as { headers?: Record<string, string> } | undefined;
    expect(options?.headers?.["Idempotency-Key"]).toBe("stable-key");
  });
  it("treats a network timeout as an unknown outcome", async () => {
    post.mockRejectedValueOnce({});
    await expect(new KeeperHubClient(config as never).submit(input)).rejects.toBeInstanceOf(KeeperHubSubmissionUnknownError);
  });
  it("treats a server error as an unknown outcome", async () => {
    post.mockRejectedValueOnce({ response: { status: 503, data: {} } });
    await expect(new KeeperHubClient(config as never).submit(input)).rejects.toBeInstanceOf(KeeperHubSubmissionUnknownError);
  });
  it("treats idempotency-in-progress as recoverable with the same key", async () => {
    post.mockRejectedValueOnce({ response: { status: 409, data: { code: "idempotency_in_progress" } } });
    await expect(new KeeperHubClient(config as never).submit(input)).rejects.toBeInstanceOf(KeeperHubSubmissionUnknownError);
  });
  it("treats a validation rejection as a definite failure", async () => {
    post.mockRejectedValueOnce({ response: { status: 400, data: {} } });
    await expect(new KeeperHubClient(config as never).submit(input)).rejects.toThrow("rejected redemption (400)");
  });
});
