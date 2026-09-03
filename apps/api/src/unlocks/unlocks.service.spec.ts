import { encodeAbiParameters, encodeEventTopics, erc20Abi } from "viem";
import { describe, expect, it } from "vitest";

import { isMatchingUnlockTransfer } from "./unlocks.service.js";

const token = "0x70a86d8842fb63c4ad2b7cdddf530ebf1bb25d8e";
const buyer = "0x421ab98aeb38cb022fe80d5bd1da7ea404bdd90b";
const recipient = "0x3232323232323232323232323232323232323232";

function transferLog(to: string, value: bigint) {
  return {
    address: token,
    topics: encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from: buyer, to: to as `0x${string}` } }),
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
  };
}

describe("unlock payment verification", () => {
  it("accepts only the configured token, sender, recipient, and sufficient base units", () => {
    const expected = { token, buyer, recipient, minimumAmount: 1_000_000n };
    expect(isMatchingUnlockTransfer(transferLog(recipient, 1_000_000n), expected)).toBe(true);
    expect(isMatchingUnlockTransfer(transferLog(recipient, 999_999n), expected)).toBe(false);
    expect(isMatchingUnlockTransfer(transferLog("0x4343434343434343434343434343434343434343", 1_000_000n), expected)).toBe(false);
    expect(isMatchingUnlockTransfer({ ...transferLog(recipient, 1_000_000n), address: "0x4343434343434343434343434343434343434343" }, expected)).toBe(false);
  });
});
