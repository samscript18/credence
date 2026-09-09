# Operations runbook

## Local development

Requirements: Node/npm, MongoDB, an EVM browser wallet, and optional Foundry for
contract tests.

```bash
npm ci --include=dev --include=optional
cp .env.example .env.local
npm run dev
```

The root command starts web on port 3000 and API on port 4000. The API loads
environment files in this precedence order (highest first): process/hosting
environment, `apps/api/.env.local`, `apps/api/.env`, root `.env.local`, root
`.env`. Next.js receives frontend variables at build/start time; restart after
changing them.

## Verification matrix

```bash
npm test
npm run typecheck
npm run lint
npm run build
forge test --root contracts
```

Run the contract command when Foundry is installed. For a focused change, run
the affected workspace command during iteration, then the full matrix before
release.

## Environment classes

- `NEXT_PUBLIC_*`: compiled into or exposed to the browser; never secrets.
- API runtime: MongoDB, JWT, CORS, RPC/indexer, token, escrow, Cloudinary.
- Worker-only: refund private key, escrow start block, fee cap, enable flag.
- Demo/operator-only: Nova/demo private keys and migration sources; keep these
  outside production app configuration unless the explicit script needs them.

See `.env.example` for the complete current list and README for deployment host
settings. Validate that chain ID is `50312` before any Shannon transaction.

## Deployment order

1. Back up MongoDB and record the running Git commit and environment version.
2. Run the full verification matrix.
3. Deploy the API first. On Render, build shared then API and use `/health`.
4. Set `NEXT_PUBLIC_API_URL` and the WalletConnect project ID in Vercel.
5. Deploy the web app from the workspace-aware root commands in README.
6. Set API `WEB_ORIGIN` to the exact deployed frontend origin and restart API.
7. Smoke-test a fresh browser: connect, sign in, list markets, create a small
   draft/trade, recover/link the receipt, and view the record.
8. Test locked access with two wallets only if escrow payments are enabled.

Public Next.js variables are build-time inputs on Vercel. Changing one without
redeploying does not update an existing bundle.

## Escrow deployment

Build and test before deployment:

```bash
forge test --root contracts
node scripts/deploy-insight-escrow.mjs
```

The deployment script uses the configured Shannon RPC, payment token, price,
and deployment key. Independently verify the resulting contract onchain:

- chain ID is 50312;
- bytecode exists;
- `token()` equals `UNLOCK_TOKEN_ADDRESS`;
- `price()` equals `UNLOCK_PRICE_BASE_UNITS`;
- deployment block is recorded for worker scanning.

Then set `UNLOCK_ESCROW_ADDRESS` on the API. Keep paid unlocks paused if any
check differs. Existing direct payments cannot be retroactively moved to escrow.

## Automatic refunds

Required backend-only settings:

```env
ENABLE_AUTO_UNLOCK_REFUNDS=false
REFUND_WORKER_PRIVATE_KEY=
UNLOCK_ESCROW_START_BLOCK=
REFUND_MAX_TX_COST_WEI=
```

Use a dedicated signer with limited STT. Start with the flag false, verify its
address and balance, set the exact deployment block and fee cap, then enable and
restart one API deployment. Multiple API replicas coordinate through MongoDB,
but the signer nonce must not be shared with unrelated software.

The worker scans 500 blocks per tick to two blocks behind head, stores unique
deposit jobs, and processes at most one refund transaction per 30-second tick.
Monitor `refundjobs` and `refundworkerstates`. A submitted transaction that does
not settle blocks new submissions by design. Investigate it; do not delete the
job or automatically replace the transaction.

To disable new automatic refunds, set the flag false and restart. This cannot
cancel an already broadcast transaction. Buyers retain the contract's manual
refund path.

## Database migration

`scripts/migrate-dev-db.mjs` copies from `MONGODB_URI` to an explicitly selected,
empty `MONGODB_URI_DEV`. It defaults to inspection and only writes with `--apply`.
It snapshots source data to `.local-operations/`, preserves indexes/options,
hash-verifies documents, and aborts if the source changes during copying.

Before applying:

1. Pause writers or schedule a quiet window.
2. Confirm source and destination database names.
3. Confirm destination collections are empty.
4. Run inspection and review collection counts.
5. Back up both databases independently.
6. Apply once, review the private local backup path, and validate application
   counts and representative records.

Never treat a partial copy as safe to rerun blindly. Inspect destination state
and the private backup first.

## Demo data

`npm run seed:demo` requires explicit nonproduction configuration. Demo records
must remain `DEMO_SEED`. The Nova scripts use a separate controlled testnet
wallet and normal authenticated draft/confirmation flow for one labeled demo;
they are not a recurring trading bot. Operator output and durable signed bytes
live under ignored `.local-operations/`.

## Monitoring and incident response

Monitor API health, MongoDB connectivity, DreamDEX indexer/RPC latency, worker
warnings, submitted refund jobs, settlement backlog, and hosting error rates.

For an incident:

1. Preserve logs, commit, timestamps, affected IDs, and transaction hashes.
2. Redact credentials and private user data.
3. Pause paid unlock preparation or automatic refunds if that limits exposure.
4. Do not delete audit records or rewrite chain-linked identities.
5. Classify the chain state separately from the HTTP/application state.
6. Recover idempotently from the same draft/hash/job whenever possible.
7. Document remediation and add a regression test.
