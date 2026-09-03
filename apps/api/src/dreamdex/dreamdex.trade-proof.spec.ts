import { describe, expect, it } from "vitest";

import { isMatchingFilledPredictionOrder } from "./dreamdex.service.js";

const marketId = `0x${"1".repeat(64)}`;
const sender = "0x421ab98aeb38cb022fe80d5bd1da7ea404bdd90b";

describe("DreamDEX binary trade proof", () => {
  it("accepts the SDK's BUY_YES bid encoding", () => {
    expect(isMatchingFilledPredictionOrder(
      { market: marketId, owner: sender, side: "BUY_YES", isBid: true, filledQuantity: "1000" },
      { marketId, sender, direction: "UP" },
    )).toBe(true);
  });

  it("accepts the SDK's BUY_NO ask encoding", () => {
    expect(isMatchingFilledPredictionOrder(
      { market: marketId, owner: sender, side: "BUY_NO", isBid: false, filledQuantity: "1000" },
      { marketId, sender, direction: "DOWN" },
    )).toBe(true);
  });

  it("rejects a side or native book direction mismatch", () => {
    expect(isMatchingFilledPredictionOrder(
      { market: marketId, owner: sender, side: "BUY_NO", isBid: true, filledQuantity: "1000" },
      { marketId, sender, direction: "DOWN" },
    )).toBe(false);
  });
});
