type Environment = Record<string, string | undefined>;

export function validateEnvironment(input: Record<string, unknown>): Environment {
	const environment = input as Environment;
	const nodeEnvironment = environment.NODE_ENV ?? "development";
	const mongoKey = environment.MONGODB_CONNECTION_KEY ?? "MONGODB_URI";
	if (!["MONGODB_URI", "MONGODB_URI_DEV"].includes(mongoKey)) throw new Error("MONGODB_CONNECTION_KEY must be MONGODB_URI or MONGODB_URI_DEV");
	if (mongoKey === "MONGODB_URI_DEV" && !environment.MONGODB_URI_DEV?.trim()) throw new Error("MONGODB_URI_DEV is required when selected");

	if (nodeEnvironment === "production" && !environment.JWT_SECRET) {
		throw new Error("JWT_SECRET is required in production");
	}

	if (nodeEnvironment === "production" && !environment[mongoKey]) {
		throw new Error(`${mongoKey} is required in production`);
	}

	return {
		...environment,
		NODE_ENV: nodeEnvironment,
		MONGODB_CONNECTION_KEY: mongoKey,
		PORT: environment.PORT ?? "4000",
		MONGODB_URI: environment.MONGODB_URI ?? "mongodb://localhost:27017/credence",
		WEB_ORIGIN: environment.WEB_ORIGIN ?? "http://localhost:3000",
	};
}
