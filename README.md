# Credence

> Verifiable reputation for prediction markets.

Credence is a reputation-powered prediction marketplace built on DreamDEX Event
Contracts on the Somnia Shannon testnet. It records predictions before outcomes
are known, ties each live call to a wallet-signed trade, and turns resolved
performance into a durable reputation score.

Prediction skill should be proven, not claimed.

[Live website](https://credence-web-theta.vercel.app/)
[Watch the demo on YouTube](https://youtu.be/neiG3e01cIY?si=u2pp3y4P19Vr8m9C)

## The idea in one sentence

DreamDEX shows what the market believes. Credence shows you who actually knows.

## Why Credence exists

Prediction markets are good at aggregating belief, but they do not make it easy
to judge which people consistently produce forecasts that beat the market.
Social feeds have the opposite problem: they make claims easy to publish and
losses easy to forget.

Credence creates a public, inspectable track record. A prediction is published
alongside its market, direction, confidence, entry probability, wallet proof,
and resolution. Over time, the record shows whether a predictor is accurate,
well-calibrated, and able to outperform the market's expectations.

## What makes Credence different

- **Proof before reputation.** A live prediction is published only after the
  connected wallet completes the corresponding DreamDEX trade.
- **Performance against the market.** The reputation score compares the
  predictor's confidence with the probability available at entry, rather than
  treating every correct answer as equally informative.
- **Permanent history.** Resolved predictions remain visible, including wins,
  losses, confidence, and settlement state.
- **Derived verification.** A predictor becomes Verified through performance,
  not a manual badge or follower count.
- **User-controlled access.** Verified predictors can publish locked insights.
  Buyers choose whether to unlock the insight and separately decide whether to
  place their own matching trade.

## The Credence experience

### 1. Connect a wallet

The user connects an EVM wallet and signs a one-time Credence authentication
challenge. No private key is stored or required by the application.

### 2. Choose a live market

Credence discovers active binary DreamDEX Event Contracts on Somnia Shannon.
The user selects UP or DOWN, chooses confidence and quantity, and can add
reasoning and visibility preferences.

### 3. Publish a proven call

Credence first stores an immutable, server-timestamped draft for the exact live
DreamDEX window. The connected wallet then signs the trade. After confirmation,
the API verifies the sender, market, side, positive fill, and transaction hash
against that same draft before publishing it. A retry links the saved receipt;
it never intentionally places a second trade.

### 4. Build a reputation

When DreamDEX finalizes the market, Credence resolves the prediction and
recalculates the user's score, accuracy, statistics, verification eligibility,
and leaderboard position.

### 5. Share an earned edge

Verified predictors can publish a locked insight containing structured reasoning
about an active prediction. A buyer may unlock the insight with the configured
testnet token and then choose whether to execute a separate Back Prediction
trade.

## Reputation model

Every user starts at `50`. Resolved, non-void predictions are processed in
chronological order and the score is clamped to `0-100`.

For the selected outcome:

```text
m = DreamDEX probability at entry, from 0 to 1
c = predictor confidence, from 0 to 1
y = 1 when the selected outcome wins, otherwise 0

marketBrier    = (m - y)^2
predictorBrier = (c - y)^2
improvement    = marketBrier - predictorBrier
delta          = improvement * 5
newScore       = clamp(oldScore + delta, 0, 100)
```

This rewards a forecast that beats the market and penalizes confident mistakes.
The score is recalculated from the permanent prediction history rather than
manually edited.

### Verified Predictor

A user is Verified if and only if both conditions are true:

```text
reputation >= 80
resolved predictions >= 25
```

Verification is derived from the record. Falling below the threshold prevents
new locked predictions, while already-active locked predictions keep their
existing visibility.

## How access and Back Prediction work

Unlocking is intentionally separate from trading:

```text
check the exact live window
        -> deposit the unlock price
        -> explicitly reveal from the buyer wallet
        -> verify the escrow state onchain
        -> reveal the wallet-specific insight
        -> optionally place a separate Back Prediction trade
```

The API removes locked fields before returning a response. CSS-only hiding is
not used as an access-control mechanism. A single transaction cannot unlock
multiple records, and the buyer must make a separate wallet decision before a
Back Prediction is submitted.

## Architecture

```text
Connected EVM wallet
        |
        | auth, DreamDEX orders, unlocks, Back Predictions
        v
Next.js web app (apps/web)
        |
        | Axios + React Query
        v
NestJS API (apps/api) -------- MongoDB
        |                         |
        | official SDK + viem     | gated insight audit state
        v                         v
DreamDEX Event Contracts     InsightEscrow
        \_________________________/
                Somnia Shannon
```

- DreamDEX owns markets, orders, positions, finalization, and redemption.
- The Credence API owns identity, prediction records, gated insight DTOs,
  unlock verification, Back records, reputation, and leaderboard ranks.
- React Query owns server state. Zustand is limited to local composer and UI
  state.
- Market IDs, pool addresses, order fills, and settlement state come from the
  official DreamDEX integration rather than hardcoded market assumptions.

## Technical documentation

The README is the product-level entry point. Detailed, implementation-grounded
documentation lives in [`docs/`](docs/README.md):

- [System architecture](docs/ARCHITECTURE.md) — trust boundaries, components,
  data ownership, and dependency direction
- [Prediction lifecycle](docs/PREDICTION_LIFECYCLE.md) — draft, trade,
  confirmation, settlement, claim, unlock, refund, and retry state machines
- [API reference](docs/API_REFERENCE.md) — routes, authentication, envelopes,
  validation, and redaction behavior
- [Security model](docs/SECURITY.md) — assets, threats, controls, assumptions,
  and key-management rules
- [Operations runbook](docs/OPERATIONS.md) — local setup, deployment, escrow,
  worker operation, database migration, and rollback guidance
- [Troubleshooting](docs/TROUBLESHOOTING.md) — common wallet, indexer, build,
  Cloudinary, escrow, and record-linking failures
- [Contributing](CONTRIBUTING.md) — scoped change and verification workflow

## DreamDEX integration

Credence uses `@somnia-chain/markets-sdk` `0.29.x` and discovers market and pool
addresses at runtime from the Somnia testnet deployment.

The integration uses:

- `SomniaMarkets.loadMarkets(true)` and `isBinaryMarket` for discovery;
- `fetchOrderBook` for current probabilities;
- `client.getMarketOnchain` before writes and during finalization;
- `createOrder(..., "limit", "buy", ..., { timeInForce: "IOC" })` for wallet-signed trades;
- `client.getTransactionActivity` for server-side filled-order attribution;
- `client.getOrders` to recover a filled Back trade after a client timeout.

The adapter validates the authenticated sender, current market, pool target,
economic side, native book direction, and positive filled quantity. 

## Tech stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS,
  shadcn-style components, TanStack React Query, Zustand, wagmi, and viem
- **Backend:** NestJS, TypeScript, MongoDB, Mongoose, class-validator, and
  scheduled settlement polling
- **Blockchain:** Somnia Shannon, DreamDEX Event Contracts, and
  `@somnia-chain/markets-sdk`
- **Package management:** npm workspaces

## Testnet configuration

| Setting           | Value                                     |
| ----------------- | ----------------------------------------- |
| Network           | Somnia Shannon Testnet                    |
| Chain ID          | `50312`                                   |
| RPC               | `https://dream-rpc.somnia.network`        |
| Explorer          | `https://shannon-explorer.somnia.network` |
| DreamDEX indexer  | `https://dev.smk.somnia.host/v1/graphql`  |
| Demo unlock token | tUSDC, configured by environment          |

No development path submits mainnet transactions.

## Run locally

### Requirements

- Current Node.js and npm
- MongoDB
- A browser wallet connected to Somnia Shannon Testnet

```bash
npm ci
cp .env.example .env
npm run dev
```

The web app runs at `http://localhost:3000` and the API runs at
`http://localhost:4000`.

Validate the workspace with:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Start with [.env.example](.env.example). The API loads environment files from
`apps/api/.env.local`, `apps/api/.env`, the repository-root `.env.local`, and
the repository-root `.env`, with shell and hosting variables taking priority.

## Important environment variables

### Frontend

| Variable                               | Purpose                                 |
| -------------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_API_URL`                  | Public Nest API origin                  |
| `NEXT_PUBLIC_SOMNIA_CHAIN_ID`          | Must be `50312`                         |
| `NEXT_PUBLIC_SOMNIA_RPC_URL`           | Shannon HTTP RPC                        |
| `NEXT_PUBLIC_EXPLORER_URL`             | Optional explorer override              |
| `NEXT_PUBLIC_DREAMDEX_NETWORK`         | `testnet`                               |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional WalletConnect/Reown project ID |

### Backend

| Variable                  | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `MONGODB_URI`             | MongoDB connection string                   |
| `JWT_SECRET`              | Strong signing secret                       |
| `WEB_ORIGIN`              | Exact frontend origin for credentialed CORS |
| `SOMNIA_RPC_URL`          | Shannon HTTP RPC                            |
| `DREAMDEX_INDEXER_URL`    | Official testnet indexer                    |
| `DREAMDEX_WS_RPC_URL`     | Official testnet WebSocket RPC              |
| `UNLOCK_TOKEN_ADDRESS`    | Payment-token contract                      |
| `UNLOCK_PRICE_BASE_UNITS` | Unlock price in integer base units          |
| `UNLOCK_ESCROW_ADDRESS`   | Deployed escrow contract, when enabled      |

Never expose backend secrets with a `NEXT_PUBLIC_` prefix. Unlock payments stay
paused until the escrow address and matching token and price configuration are
verified.

## Deployment

The public frontend is deployed to Vercel and the API can be deployed to
Render, backed by MongoDB Atlas.

### Vercel frontend

- Set the root directory to `apps/web`.
- Keep source files outside the root directory enabled for the npm workspace.
- Install with `cd ../.. && npm ci --include=dev --include=optional`.
- Build with `cd ../.. && npm run build --workspace @credence/shared && npm run build --workspace @credence/web`.
- Set all `NEXT_PUBLIC_*` variables before building.

### Render API

- Keep the root directory at the repository root.
- Build with `npm ci --include=dev --include=optional && npm run build --workspace @credence/shared && npm run build --workspace @credence/api`.
- Start with `npm run start --workspace @credence/api`.
- Use `/health` as the health check path.
- Set `WEB_ORIGIN` to the exact deployed frontend origin.

Deploy the API first, set its HTTPS URL as `NEXT_PUBLIC_API_URL`, then deploy
the frontend. Production credentialed sessions require the exact frontend
origin and secure cross-origin cookies.

## Project layout

```text
credence/
├── apps/
│   ├── api/                 # NestJS REST API and settlement workflows
│   └── web/                 # Next.js product and landing experience
├── packages/
│   └── shared/              # Shared TypeScript contracts and utilities
├── contracts/               # Insight escrow contract and Foundry tests
├── docs/                    # Integration and rollout documentation
└── scripts/                 # Demo, wallet, and deployment utilities
```

## Further reading

- [Live Credence website](https://credence-web-theta.vercel.app/)
- [Credence demo video](https://youtu.be/neiG3e01cIY?si=u2pp3y4P19Vr8m9C)
