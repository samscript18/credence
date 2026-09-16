import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyFromHex(value: string): Buffer {
  if (!/^[a-f\d]{64}$/i.test(value)) throw new Error("AUTO_CLAIM_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters");
  return Buffer.from(value, "hex");
}

export function encryptSignature(signature: string, keyHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromHex(keyHex), iv);
  const ciphertext = Buffer.concat([cipher.update(signature, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(value => value.toString("base64url")).join(".");
}

export function decryptSignature(value: string, keyHex: string): string {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Stored authorization signature is malformed");
  const [iv, tag, ciphertext] = parts.map(part => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", keyFromHex(keyHex), iv!);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(ciphertext!), decipher.final()]).toString("utf8");
}
