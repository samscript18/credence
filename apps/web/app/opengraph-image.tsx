import { ImageResponse } from "next/og";

export const alt = "Credence — Prediction skill should be proven, not claimed.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "#050607", color: "#f2f1f7", padding: "64px 76px", fontFamily: "sans-serif" }}><div style={{ display: "flex", alignItems: "center", gap: 20 }}><svg width="52" height="52" viewBox="0 0 40 40" fill="none"><path d="M31 9A15 15 0 1 0 31 31" stroke="#9BDCFF" strokeWidth="4" strokeLinecap="round"/><path d="M28 15a8 8 0 1 0-1 11l8-10" stroke="#F2F1F7" strokeWidth="4" strokeLinecap="round"/></svg><span style={{ fontSize: 36, letterSpacing: -2 }}>Credence</span></div><div style={{ display: "flex", flexDirection: "column", gap: 12 }}><span style={{ fontSize: 70, lineHeight: 1.06, letterSpacing: -4 }}>Prediction skill should be</span><span style={{ fontSize: 70, lineHeight: 1.06, letterSpacing: -4, color: "#9bdcff" }}>proven, not claimed.</span></div><div style={{ display: "flex", borderTop: "1px solid #292633", paddingTop: 26, justifyContent: "space-between", color: "#a3a5b5", fontSize: 20 }}><span>Reputation-powered prediction markets on DreamDEX.</span><span>Proof over popularity.</span></div></div>, size);
}
