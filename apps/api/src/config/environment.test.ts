import { describe, expect, it } from "vitest";
import { validateEnvironment } from "./environment.js";

const autoClaimConfig = {
	ENABLE_AUTO_CLAIM: "true",
	KEEPERHUB_API_KEY: "kh_test",
	AUTO_CLAIM_ENCRYPTION_KEY: "a".repeat(64),
};

describe("KeeperHub Auto-Claim URL validation", () => {
	it.each([
		"https://app.keeperhub.com",
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://[::1]:3000",
	])("accepts %s", (url) => {
		expect(validateEnvironment({ ...autoClaimConfig, KEEPERHUB_API_URL: url }).KEEPERHUB_API_URL).toBe(url);
	});

	it.each([
		"http://remote.example:3000",
		"http://localhost.evil.example:3000",
		"http://localhost@remote.example:3000",
	])("rejects %s", (url) => {
		expect(() => validateEnvironment({ ...autoClaimConfig, KEEPERHUB_API_URL: url })).toThrow("HTTPS or loopback HTTP");
	});
});
