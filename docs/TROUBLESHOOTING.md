# Troubleshooting

## Safe first checks

Record the Git commit, route, exact market ID, prediction ID, wallet address,
transaction hash, UTC timestamp, browser console error, API error, and chain
receipt status. Never paste private keys, JWTs, MongoDB URIs, Cloudinary secrets,
or signed raw transactions into logs or support messages.

## Wallet opens the wrong extension

Use the RainbowKit picker rather than a generic injected provider. Installed
wallets must be enabled for the current site. Browser extensions use EIP-6963
discovery; WalletConnect uses the configured Reown project ID.

If the production modal differs from local:

1. Confirm `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` exists in Vercel for the right
   environment.
2. Confirm the production and local origins are allowed in the Reown project.
3. Redeploy: public Next.js settings are build-time inputs.
4. Restart local `npm run dev` after changing root `.env.local`.
5. Test in a fresh profile with only the intended extensions enabled.

## WalletConnect QR fails with `invalid border=0`

RainbowKit 2.2.11 uses `cuer`, whose borderless matrix call is incompatible with
newer `qr` releases. This repository pins `qr` 0.5.0 through the root npm
override and web dev dependency. Keep `package-lock.json`, use `npm ci`, restart
the dev server, and do not remove the pin without running `wallet-qr.test.ts`.

## `Provider not found`

The chosen extension is missing, disabled, locked, or not permitted on the
origin. Refresh after enabling it. On mobile, use WalletConnect/QR or open the
site in the wallet's browser. A project ID does not install a wallet provider.

## DreamDEX entry shows `Unavailable`

This means Credence does not currently have an executable probability quote for
that exact window. It does not mean the market identity can be replaced. Check:

- the market is still Trading and before expiry;
- the official order book has an executable ask for the selected side;
- RPC and GraphQL indexer are reachable;
- configured DreamDEX network is testnet;
- the UI/API are using the same exact bytes32 market ID.

Never synthesize a price or retarget to a successor window.

## Linking times out after the wallet trade confirms

Do not place another trade. The server draft and browser recovery record exist
specifically for this case.

1. Save the displayed hash or copy it from wallet activity/explorer.
2. Keep browser site storage intact.
3. Retry record linking for the same draft and hash.
4. If the API reports an indexer timeout, wait for indexing and retry.
5. If using another browser/device, recover with the original draft ID and hash;
   browser-local state does not transfer automatically.

The API leaves transient verification failures pending. A definitive mismatch
can mark the draft failed. Compare receipt sender, exact market/pool, direction,
fill, and the draft time/block boundary.

## `This market has no executable probability quote`

The order book has no usable ask for the requested economic side, or the quote
read failed. Refresh the same market. If still absent, do not trade it through
Credence. Confidence is the user's forecast and is not a replacement trade price.

## Photo uploads are not configured

All three server-only Cloudinary values are required: cloud name, API key, and
API secret. Put them in the API runtime environment (root `.env.local` works for
this repository's local API loader), restart the API, and ensure production
values are set on Render rather than Vercel frontend variables. Do not prefix
the API secret with `NEXT_PUBLIC_`. The upload field is `file` and the limit is
2 MiB.

## API returns 503

A 503 normally indicates an unavailable dependency or intentionally paused
feature: DreamDEX SDK/indexer/RPC, escrow configuration, or upload service.
Check API logs and `/health`. Note that `/health` proves process liveness only;
it does not deeply test MongoDB, RPC, or the indexer.

## Escrow unlock does not reveal content

Deposit and reveal are separate transactions. Inspect the buyer-specific
`payments(predictionKey,buyer)` state:

- `0 None`: no accepted deposit;
- `1 Deposited`: funds held, content not unlocked;
- `2 Revealed`: predictor paid, API confirmation can grant access;
- `3 Refunded`: buyer refunded, no access.

Confirm the transaction was sent by the authenticated buyer to the configured
escrow for the exact prediction key. API confirmation is retriable after a
successful reveal.

## Refund is delayed

Automatic refunds are best-effort, not instant. The worker catches up in
500-block pages, stays two blocks behind head, polls every 30 seconds, and sends
at most one refund per tick. Check its enable flag, signer STT balance, fee cap,
deployment block, MongoDB lease/cursor, and `refundjobs`. A stuck submitted job
must be investigated; do not delete it. Manual contract refund remains available.

## Realized P&L is zero or missing

Distinguish:

- unresolved positions, which have no finalized settled result;
- settled P&L, which may exist before a claim;
- claimed/realized P&L, which requires a verified claim hash for LIVE records;
- legacy records missing entry cost or position quantity, which are excluded
  rather than treated as fabricated zero;
- wallet balance, which is a separate onchain value.

Incorrect predictions can have verified zero payout and a settled loss without
requiring a claim transaction.

## Vercel native binding is missing

Use the committed lockfile and install optional dependencies:

```bash
cd ../.. && npm ci --include=dev --include=optional
```

The repository pins Linux Tailwind oxide and Lightning CSS optional packages.
Do not generate and deploy a lockfile that omitted the target Linux packages.

## Render reports `nest: not found`

Nest CLI is a development dependency needed to build. Use:

```bash
npm ci --include=dev --include=optional
npm run build --workspace @credence/shared
npm run build --workspace @credence/api
```

Then start with `npm run start --workspace @credence/api`.

## Foundry crashes before running tests on macOS

If `forge test` panics in `system-configuration` while constructing a proxy or
OpenChain client, run the deterministic local suite without network lookups:

```bash
forge test --offline --root contracts
```

This repository's escrow tests do not require an RPC fork. A panic before the
suite starts is a local Foundry/runtime issue, not a Solidity test failure.
