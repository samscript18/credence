"use client";

import { useEffect, useState } from "react";
import type { PredictionFeedItem } from "@credence/shared";

export function useWindowLive(prediction: PredictionFeedItem, bufferSeconds = 0): boolean {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  // A timer can close a window, but never authorizes trading or settlement.
  return prediction.source === "LIVE" && prediction.status === "ACTIVE" &&
    prediction.marketStatus === "live" && new Date(prediction.marketExpiryAt).getTime() > now + bufferSeconds * 1000;
}
