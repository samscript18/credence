export const MIN_UNLOCK_BUFFER_SECONDS = 60;

/** A timer may deny a sale, but must never authorize one without a chain read. */
export function insightSalesOpen(windowLive: boolean, expiryMs: number, nowMs: number, bufferSeconds = MIN_UNLOCK_BUFFER_SECONDS): boolean {
	return windowLive && Number.isFinite(expiryMs) && Number.isFinite(bufferSeconds) && expiryMs - nowMs > Math.max(MIN_UNLOCK_BUFFER_SECONDS, bufferSeconds) * 1000;
}
