import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Cuer } from "cuer";
import { create } from "cuer/QrCode";
import { describe, expect, it } from "vitest";

// Synthetic connection data only; never use a real WalletConnect session URI.
const uri = `wc:${"a".repeat(64)}@2?relay-protocol=irn&symKey=${"b".repeat(64)}`;

describe("RainbowKit QR encoder compatibility", () => {
  it("supports the borderless module matrix requested by RainbowKit's renderer", () => {
    const qr = create(uri, { errorCorrection: "medium" });
    expect(qr.edgeLength).toBeGreaterThan(0);
    expect(qr.grid).toHaveLength(qr.edgeLength);
    expect(qr.grid.every(row => row.length === qr.edgeLength)).toBe(true);
  });

  it("renders a WalletConnect QR SVG without invalid border errors", () => {
    const markup = renderToStaticMarkup(createElement(Cuer, { value: uri, size: 240 }));
    expect(markup).toContain("<svg");
    expect(markup).not.toContain("NaN");
  });
});
