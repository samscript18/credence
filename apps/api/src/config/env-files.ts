import { resolve } from "node:path";

/** Stable for both src/app.module and dist/app.module, independent of shell cwd. */
export function apiEnvironmentFiles(apiRoot: string): string[] {
  const repositoryRoot = resolve(apiRoot, "../..");
  // Nest keeps the first file's value; existing process env still takes priority.
  return [
    resolve(apiRoot, ".env.local"),
    resolve(apiRoot, ".env"),
    resolve(repositoryRoot, ".env.local"),
    resolve(repositoryRoot, ".env"),
  ];
}
