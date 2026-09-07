# Credence

## September 6 alignment update

The replacement `AGENTS.md` is the current lifecycle requirement. New live
predictions persist the exact market ID, market/pool addresses, window length,
expiry, side, entry price and entry transaction. Social actions fail closed on
non-Trading windows or unavailable chain checks. Closed locked calls stay gated
until finalized resolution; settlement uses the original bytes32 market ID and
checks the stored market address, rather than a symbol or successor window.

Publishing refreshes the order book even when the market-list quote is absent.
An empty book still blocks execution. The raw SDK order pins `expireTimestampNs`
to the checked window expiry, using IOC and verified price/lot helpers.

### Cloudinary profile photos

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`
on the **API server only**. Never use `NEXT_PUBLIC_` for the secret. Uploads go
through authenticated `POST /users/profile/avatar`, with a 2 MB limit and raster
image signature validation. The API signs uploads and returns a Cloudinary HTTPS
URL; MongoDB stores that URL, not a base64 image. Save Changes publishes the
profile update and immediately updates the navbar's profile cache.

For local development, put those keys in the repository-root `.env.local` and
start both services with `npm run dev`. The API explicitly loads environment
files from `apps/api/.env.local`, `apps/api/.env`, root `.env.local`, then root
`.env` (first definition wins). Shell/hosting environment variables take priority.
Restart the dev servers after changing environment files. No `NODE_OPTIONS` or
special `--env-file` launch command is needed.

### Escrow and remaining rollout checks

- Paid access now uses the explicitly approved `contracts/src/InsightEscrow.sol`:
  deposit, then buyer-signed reveal releases payment. After closure, an unrevealed
  deposit can be refunded to its buyer. Anyone may submit the refund; an optional
  disabled-by-default gas-funded worker now automates it. Reveal authorizes access; it
  is not cryptographic proof that the browser displayed the HTTP response.
- New payments remain paused until `UNLOCK_ESCROW_ADDRESS` is configured. The
  constructor token and price must match `UNLOCK_TOKEN_ADDRESS` and
  `UNLOCK_PRICE_BASE_UNITS`. No contract has been deployed by this update.
- `PREDICTION_UNLOCK_BUFFER_SECONDS` defaults to 60; the contract enforces a
  minimum 60-second deposit cutoff. Existing buyers may still reveal until close.
- Settlement stores theoretical gross payout minus verified entry cost separately
  from realized P&L. Claim verification uses a successful exact-market SDK redeem
  receipt and actual ERC-20 net proceeds. Only full-position, single-market module
  redemptions are supported; external partial/batch claims need reconciliation.
  Theoretical P&L is an estimate and does not promise a net redemption amount.
- Existing live records need a reviewed migration to populate their new window
  fields. This update does not rewrite production data.
- Browser-wallet trades, actual Cloudinary uploads and refund/claim transactions
  have not been exercised in this update.

See [lifecycle rollout and migration](docs/LIFECYCLE_ROLLOUT.md) before enabling
payments. The escrow is testnet MVP code, not independently audited custody code.

Verification is automatic: reputation **at least 80** AND **at least 25 resolved
predictions**. Reputation starts at 50 and follows the deterministic Brier-score
improvement formula. No manual verification toggle is provided.

> DreamDEX shows what the market believes. Credence shows you who actually knows.

Credence is a reputation-powered prediction marketplace built on DreamDEX Event Contracts for the Somnia × DreamDEX Event Contracts Hackathon. Prediction skill should be proven, not claimed.

## Problem

Prediction markets aggregate belief well, but they do not make it easy to judge who consistently contributes forecasts that are better than the market. Social claims also tend to preserve wins and forget losses.

## Solution

Credence links every live prediction to a wallet-signed DreamDEX trade, keeps a permanent resolved history, and scores forecasting skill against the market probability that existed at entry. Proven predictors can sell application-level access to structured insights, and buyers independently decide whether to open their own matching DreamDEX position.

## How it works

1. Connect an EVM wallet and sign a one-time Credence authentication challenge.
2. Browse live DreamDEX Event Contracts discovered dynamically on Somnia Shannon.
3. Choose UP or DOWN, confidence, quantity, optional reasoning, and visibility.
4. Publish only after the connected wallet's real DreamDEX trade confirms.
5. Resolve from finalized DreamDEX state and permanently publish the result.
6. Recalculate reputation, statistics, verification eligibility, and ranking.
7. A Verified Predictor can publish a locked insight.
8. Another wallet can deposit the configured ERC-20 price into escrow and explicitly reveal while the exact window is live.
9. After server-side payment verification, that wallet can reveal the insight and separately choose **Back Prediction** to execute its own trade.

## Architecture

```text
Connected wallet
  │ signs auth, DreamDEX orders, unlock transfers
  ▼
Next.js web (apps/web)
  │ Axios + React Query; credentials included
  ▼
NestJS API (apps/api) ───── MongoDB
  │                         users, predictions, unlocks, backs
  ▼
DreamDEX adapter
  │ official @somnia-chain/markets-sdk + viem
  ▼
Somnia Shannon Event Contracts and indexer
```

- DreamDEX owns markets, orders, outcome positions, finalization, and redemption.
- The Credence API owns identity, prediction records, gated DTOs, unlock proof, Back records, reputation, and leaderboard ranks.
- React Query owns server state. Zustand is limited to local composer/UI state.
- Hidden locked fields are removed by the API; they are never sent for CSS-only hiding.

## DreamDEX integration

The project uses `@somnia-chain/markets-sdk` `0.29.x`. Protocol addresses come from the package's `SOMNIA_TESTNET_ADDRESSES`; Event Contract market and pool addresses are discovered at runtime. Credence does not transcribe or invent SDK methods, active market IDs, or pool addresses.

The verified integration uses:

- `SomniaMarkets.loadMarkets(true)` plus `isBinaryMarket` for discovery;
- `fetchOrderBook` for current probabilities;
- `client.getMarketOnchain` immediately before writes and for finalization;
- `createOrder(..., "limit", "buy", ..., { timeInForce: "IOC" })` for wallet-signed trades;
- `client.getTransactionActivity` for server-side filled-order attribution;
- `client.getOrders` only to recover an already-filled Back trade after a client timeout.

The write adapter knows the official binary encoding: BUY_YES is the native bid side and BUY_NO is the native ask side. The backend checks the authenticated sender, current market, pool transaction target, economic side, native book direction, and positive filled quantity.

Detailed inspected SDK behavior and real proof records are in [docs/DREAMDEX_INTEGRATION.md](docs/DREAMDEX_INTEGRATION.md).

## Credence reputation

Every user starts at `50`; the score is clamped to `0–100`. Resolved non-void predictions are processed chronologically.

For the selected outcome:

```text
m = DreamDEX probability at entry, from 0 to 1
c = predictor confidence, from 0 to 1
y = 1 when the selected outcome wins, otherwise 0

marketBrier    = (m - y)²
predictorBrier = (c - y)²
improvement    = marketBrier - predictorBrier
delta          = improvement × 5
newScore       = clamp(oldScore + delta, 0, 100)
```

This rewards forecasts that beat the market and penalizes confident mistakes. The score is deterministically recalculated from permanent history rather than manually edited.

## Verified Predictor rule

A user is Verified if and only if:

```text
reputation >= 80 AND resolved predictions >= 25
```

Verification is derived, not assigned. Falling below the threshold prevents new locked predictions; already-active locked predictions keep their existing visibility.

## Paid prediction flow

The configured MVP unlock uses the buyer-approved escrow:

```text
fresh exact-window check → wallet deposit → confirmed pending payment
→ explicit wallet reveal → escrow pays predictor → API verifies on-chain state
→ wallet-specific confirmed access → refetch reveals structured insight

closed before reveal → refund unused deposit to buyer
```

One transaction hash cannot unlock multiple records. The confirmation dialog preserves and links the verified hash before refreshing the locked card.

## Back Prediction flow

Unlocking never trades automatically. The buyer sees the creator's entry probability beside a freshly fetched DreamDEX probability, enters a quantity, and confirms a separate wallet transaction. The API derives direction from the original prediction, verifies the real filled order, and persists the actual filled quantity, execution probability, order ID, and transaction hash.

If the client times out after a transaction was submitted, **Recover latest filled trade** links the latest matching official DreamDEX fill without asking the wallet to trade again.

## Settlement

The API polls expired active records every 30 seconds. Expiry alone displays **Awaiting settlement** and is never treated as an outcome. Only finalized DreamDEX state can mark a prediction resolved or void. Formerly locked records then become publicly readable, and accuracy, correct/incorrect counts, reputation, and ranking are recalculated.

Credence reports realized P&L only when a trustworthy realized value is available. The MVP does not estimate realized profit from a limit price or an unredeemed outcome position.

## Tech stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, shadcn-style components, Axios, TanStack React Query, Zustand, wagmi, viem
- Backend: NestJS, TypeScript, MongoDB, Mongoose, class-validator, scheduled settlement polling
- Blockchain: Somnia Shannon, DreamDEX Event Contracts, `@somnia-chain/markets-sdk`
- Package management: npm workspaces

## Testnet network

| Setting | Value |
| --- | --- |
| Network | Somnia Shannon Testnet |
| Chain ID | `50312` |
| RPC | `https://dream-rpc.somnia.network` |
| Explorer | `https://shannon-explorer.somnia.network` |
| DreamDEX indexer | `https://dev.smk.somnia.host/v1/graphql` |
| Demo unlock token | tUSDC, configured by environment |

No development path submits mainnet transactions.

## Local setup

Prerequisites: current Node.js/npm and MongoDB.

```bash
npm ci
cp .env.example .env
npm run dev
```

The web app runs at `http://localhost:3000`; the API runs at `http://localhost:4000`. Validate the workspace with:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Environment variables

The user-facing `/faucet` page offers 10 test tUSDC, wallet connection and Shannon
network switching. `/dev/dreamdex` redirects there; diagnostic market data and
standalone test-trade controls are no longer exposed. The faucet remains testnet
only, including in production builds. STT is needed for the wallet transaction's gas.

To use the copied DEV database, set `MONGODB_CONNECTION_KEY=MONGODB_URI_DEV`
alongside `MONGODB_URI_DEV`. The default remains `MONGODB_URI`; neither URI is
overwritten. Local automatic refunds are enabled via `ENABLE_AUTO_UNLOCK_REFUNDS=true`
with the configured escrow, deployment block, signer and fee cap. Run only one
database/deployment per signer. Restart the API after environment changes;
external hosting secrets must be configured separately.

Start with [.env.example](.env.example).

Frontend build-time variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public Nest API origin |
| `NEXT_PUBLIC_SOMNIA_CHAIN_ID` | Must be `50312` |
| `NEXT_PUBLIC_SOMNIA_RPC_URL` | Shannon HTTP RPC |
| `NEXT_PUBLIC_EXPLORER_URL` | Optional explorer override |
| `NEXT_PUBLIC_DREAMDEX_NETWORK` | `testnet` |

Backend variables:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Set `production` when deployed |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_URI_DEV` | Alternate DEV database connection string |
| `MONGODB_CONNECTION_KEY` | Explicitly select `MONGODB_URI` (default) or `MONGODB_URI_DEV` |
| `JWT_SECRET` | Strong production-only signing secret |
| `WEB_ORIGIN` | Exact Vercel frontend origin for credentialed CORS |
| `SOMNIA_RPC_URL` | Shannon HTTP RPC |
| `DREAMDEX_INDEXER_URL` | Official testnet indexer |
| `DREAMDEX_WS_RPC_URL` | Official testnet WebSocket RPC |
| `UNLOCK_TOKEN_ADDRESS` | Verified payment-token contract |
| `UNLOCK_TOKEN_SYMBOL` | UI symbol, currently `tUSDC` |
| `UNLOCK_TOKEN_DECIMALS` | Verified token decimals, currently `6` |
| `UNLOCK_PRICE_BASE_UNITS` | Unlock price in integer base units |
| `ENABLE_DEMO_SEED` | Explicit development-only seed guard |

## Demo data and preparation

Nova's controlled Shannon demo wallet has a real locked ETH UP entry on the
October 19, 2026 window, created through authenticated draft/confirmation endpoints.
Its display name is `Nova (Demo)`; demo badges disclose seeded qualification.
The 84 historical forecasts remain `DEMO_SEED`, not real past trades. The new
entry alone is `LIVE`. This setup affects DEV, not the original source database.

`scripts/create-nova-wallet.mjs` creates the private local signer without printing
its key. `scripts/prepare-nova-profile.mjs` backs up and atomically moves only
unlinked historical Nova records to that signer, refusing live/audit references.
`scripts/publish-nova-locked.mjs` submits one minimum ETH UP demo on a 40–44-day
Trading window and reuses saved transaction bytes on retry. It is not a recurring
cron trader. Keep `.local-operations/` private and do not delete its recovery files.
Do not rerun the general seeder to manage this controlled Nova identity.

Seed deterministic history:

```bash
ENABLE_DEMO_SEED=true npm run seed:demo
DEMO_WINDOW_SECONDS=3600 npm run demo:prepare-locked
```

The first command creates eight profiles and 359 resolved predictions with wins, losses, different confidence, P&L, and naturally derived reputation. It replaces only unlinked `DEMO_SEED` predictions, preserves records referenced by real Unlock/Back audit rows, and aborts if an audit parent is missing. It updates only reserved `isDemo` users. The second command is read-only: it discovers an exact Trading window with a two-sided book and at least `DEMO_MIN_MARKET_REMAINING_SECONDS` remaining (default 900). A real verified wallet must publish the locked prediction. No active seed card or transaction is manufactured.

Credence includes demo seed data to populate historical predictor profiles and demonstrate reputation and leaderboard states. Seeded historical predictions are not represented as real DreamDEX transactions. Live Event Contract discovery, supported trading flows, and demonstrated on-chain transactions use the DreamDEX/Somnia testnet integration.

## Deployment: Vercel + Render + MongoDB Atlas

No deployment is performed automatically. Push the repository to Git first.

The public site is at `/`; the application feed is at `/app`. Markets,
Leaderboard and Profile retain their existing URLs. Set `SITE_URL` to the public
origin when using a custom domain so canonical and social URLs match your site.
Vercel's production host is used automatically when this is omitted.

Design-pass progress and the browser verification procedure are recorded in
`docs/design-pass.md`. Browser tests use isolated fixtures and do not execute trades.

### Vercel frontend

- Import the repository and choose **Root Directory: `apps/web`**.
- Keep **Include source files outside of the Root Directory** enabled so the npm workspace can read `packages/shared`.
- Framework preset: Next.js.
- Install command: `cd ../.. && npm ci --include=dev --include=optional`
- Build command: `cd ../.. && npm run build --workspace @credence/shared && npm run build --workspace @credence/web`
- Set all `NEXT_PUBLIC_*` variables before building; `NEXT_PUBLIC_API_URL` must be the Render API URL.

### Render API

For `nest: not found`, include dev dependencies during the build install—the Nest
CLI is a build tool. The root `.npmrc` includes dev/optional dependencies even with
`NODE_ENV=production`. For Vercel Linux builds, the root optional dependencies pin
the matching Tailwind Oxide and Lightning CSS Linux x64 bindings. Redeploy with
the updated lockfile and clear the failed build cache once. These repository
changes do not edit hosted environment variables or trigger deployment themselves.

Because the API consumes `packages/shared`, leave **Root Directory blank** (repository root).

- Service type: Web Service
- Runtime: Node
- Build command: `npm ci --include=dev --include=optional && npm run build --workspace @credence/shared && npm run build --workspace @credence/api`
- Start command: `npm run start --workspace @credence/api`
- Health check path: `/health`

Set the backend variables listed above. Use the Atlas connection string for `MONGODB_URI`, generate a strong `JWT_SECRET`, and set `WEB_ORIGIN` to the final Vercel origin. Render supplies `PORT`; do not hardcode it.

Deploy the API first, then put its HTTPS URL in Vercel as `NEXT_PUBLIC_API_URL` and deploy the frontend. Finally update `WEB_ORIGIN` to the exact frontend URL and smoke-test wallet authentication in a fresh browser. Production cookies use `Secure; SameSite=None` for the credentialed cross-origin API session.

The folder/command choices follow the platforms' current monorepo guidance: [Vercel monorepos](https://vercel.com/docs/monorepos) and [Render monorepo support](https://render.com/docs/monorepo-support).

## Demo flow

1. Run both demo preparation commands shortly before presenting.
2. Open David at `/profile/0x3232323232323232323232323232323232323232`.
3. Show rank, reputation, accuracy, 38 wins, 7 losses, and permanent history.
4. Publish a real locked call from a verified wallet on the exact Trading window discovered by the script. The script no longer creates an active seeded call.
5. Connect the funded Shannon viewer wallet and sign in.
6. Once refund protection is configured, unlock from the second wallet while the same window is still Trading and show its explorer hash.
7. Reveal David's direction, confidence, entry probability, and reasoning.
8. Choose **Back Prediction**, compare entry with current probability, and confirm the separate DreamDEX trade.
9. Show the confirmed order, Back record, and explorer transaction.
10. Use an already-resolved demo card to explain wins, losses, public settlement, and reputation movement; do not wait for a live market on camera.

Use a second funded viewer wallet or prepare a fresh locked record before repeating the paid portion: unlock access is intentionally wallet-specific and permanent.

## Known MVP limitations

- Locked predictions are application-level gated content in the MVP. Because DreamDEX positions are executed on a public blockchain, sophisticated observers may be able to infer aspects of on-chain trading activity.
- The MVP does not provide cryptographic secrecy, zero-knowledge privacy, or private order flow.
- Seeded history demonstrates reputation and leaderboard behavior but is explicitly distinct from live chain proof.
- Demo seed records are historical only. The demo discovery script prints a live window for an actual wallet-signed publish; it does not create active seeded predictions.
- Unlock escrow requires explicit deployment/configuration; refunds require a submitted transaction and gas.
- Realized P&L remains unchanged until reliable realized/redemption data exists.
- There is no automated copy trading: every Back action is a separate user decision and wallet signature.
