import { describe, expect, it } from "vitest";

import { AppController } from "./app.controller.js";

describe("AppController", () => {
  it("reports a healthy API using the required response contract", () => {
    expect(new AppController().getHealth()).toEqual({ status: "ok" });
  });
});
