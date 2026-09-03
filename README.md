# Credence

> DreamDEX shows what the market believes. Credence shows you who actually knows.

Credence is a reputation-powered prediction marketplace built on DreamDEX Event Contracts. This repository is being implemented sequentially according to the phase plan in `AGENTS.md`.

## Workspace

- `apps/web` — Next.js App Router frontend
- `apps/api` — NestJS backend
- `packages/shared` — shared domain types, constants, and utilities
- `docs` — integration and architecture notes

## Local development

1. Install Node.js and npm.
2. Run `npm install`.
3. Copy `.env.example` to the relevant local environment files and fill required values.
4. Run `npm run dev`.

Validation commands:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Demo history

The deterministic demo dataset is guarded and cannot run in production. To seed it locally:

```bash
ENABLE_DEMO_SEED=true npm run seed:demo
```

Rerunning the command replaces only predictions marked `source: "DEMO_SEED"` and updates only reserved users marked `isDemo: true`. It never deletes or rewrites `LIVE` predictions. Demo history contains no transaction hashes, order IDs, explorer links, or claims of on-chain execution; real wallet predictions use `source: "LIVE"` and retain their verified transaction hash.

Product, integration, demo, deployment, and MVP limitation documentation will be completed in their mandatory phases.
