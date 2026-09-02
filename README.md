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

Product, integration, demo, deployment, and MVP limitation documentation will be completed in their mandatory phases.
