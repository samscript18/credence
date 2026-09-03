import { describe, expect, it } from "vitest";

import { validateEnvironment } from "./environment.js";

describe("validateEnvironment", () => {
  it("provides safe local service defaults", () => {
    expect(validateEnvironment({})).toMatchObject({
      NODE_ENV: "development",
      PORT: "4000",
      MONGODB_URI: "mongodb://localhost:27017/credence",
      WEB_ORIGIN: "http://localhost:3000",
    });
  });

  it("requires deployment secrets and persistence configuration in production", () => {
    expect(() => validateEnvironment({ NODE_ENV: "production" })).toThrow("JWT_SECRET");
    expect(() =>
      validateEnvironment({ NODE_ENV: "production", JWT_SECRET: "secret" }),
    ).toThrow("MONGODB_URI");
  });
});
