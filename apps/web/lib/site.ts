const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
export const siteUrl = new URL(process.env.SITE_URL?.trim() || (deploymentHost ? `https://${deploymentHost}` : "http://localhost:3000"));
export const siteDescription = "Build a public prediction track record, discover proven predictors, unlock active insights and trade DreamDEX Event Contracts through Credence.";
