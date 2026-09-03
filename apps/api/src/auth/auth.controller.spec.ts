import { describe, expect, it } from "vitest";

import { sessionCookieOptions } from "./auth.controller.js";

describe("wallet session cookie deployment options", () => {
  it("uses secure cross-origin cookies in production", () => {
    expect(sessionCookieOptions(true)).toMatchObject({ secure: true, httpOnly: true, sameSite: "none" });
  });

  it("keeps local HTTP development compatible", () => {
    expect(sessionCookieOptions(false)).toMatchObject({ secure: false, httpOnly: true, sameSite: "lax" });
  });
});
