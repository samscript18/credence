type Environment = Record<string, string | undefined>;

export function validateEnvironment(input: Record<string, unknown>): Environment {
  const environment = input as Environment;
  const nodeEnvironment = environment.NODE_ENV ?? "development";

  if (nodeEnvironment === "production" && !environment.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production");
  }

  if (nodeEnvironment === "production" && !environment.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in production");
  }

  return {
    ...environment,
    NODE_ENV: nodeEnvironment,
    PORT: environment.PORT ?? "4000",
    MONGODB_URI: environment.MONGODB_URI ?? "mongodb://localhost:27017/credence",
    WEB_ORIGIN: environment.WEB_ORIGIN ?? "http://localhost:3000",
  };
}
