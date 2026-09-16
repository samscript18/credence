import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSignature, encryptSignature } from "./authorization-crypto.js";

describe("authorization signature storage", () => {
  it("encrypts and authenticates a signature", () => {
    const key = randomBytes(32).toString("hex");
    const signature = `0x${"ab".repeat(65)}`;
    const encrypted = encryptSignature(signature, key);
    expect(encrypted).not.toContain(signature.slice(2));
    expect(decryptSignature(encrypted, key)).toBe(signature);
  });
  it("rejects ciphertext tampering", () => {
    const key = randomBytes(32).toString("hex");
    const encrypted = encryptSignature(`0x${"cd".repeat(65)}`, key);
    expect(() => decryptSignature(`${encrypted.slice(0, -1)}A`, key)).toThrow();
  });
});
