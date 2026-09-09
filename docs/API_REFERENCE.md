# HTTP API reference

Default local origin: `http://localhost:4000`.

## Conventions

Successful application responses normally use:

```json
{ "data": {} }
```

The health endpoint is the exception: `{ "status": "ok" }`.

Errors use:

```json
{
  "statusCode": 400,
  "message": "Human-readable message",
  "code": "OPTIONAL_STABLE_CODE"
}
```

Validation strips unknown fields and rejects non-whitelisted input. Wallet and
transaction values use EVM hexadecimal formats. Market IDs and transaction
hashes must be 32-byte `0x` hex values.

Authenticated routes use the HTTP-only `credence_session` cookie. Browser
requests must include credentials. Local cookies are `SameSite=Lax`; production
cookies are `Secure; SameSite=None` because web and API may use different HTTPS
origins.

## Authentication

### `GET /auth/nonce?address={wallet}`

Returns a short-lived, single-use signing challenge with normalized address,
48-character nonce, message, and expiry.

### `POST /auth/verify`

```json
{
  "address": "0x…",
  "nonce": "48 hexadecimal characters",
  "signature": "0x…"
}
```

Verifies the exact challenge message, deletes the challenge to prevent replay,
creates the user if necessary, and sets the session cookie.

### `GET /auth/me` · authenticated

Returns the session wallet. `POST /auth/logout` clears the session cookie.

## Markets

### `GET /markets`

Lists discovered binary DreamDEX windows with exact identifiers, addresses,
collateral metadata, timing, tradability, minimum quantity, and current quote
when available.

### `GET /markets/:marketId`

Returns one exact bytes32 market ID. This is not a symbol lookup and must not
retarget to a later window.

## Predictions

### `POST /predictions/draft` · authenticated

```json
{
  "marketId": "0x…",
  "direction": "UP",
  "confidence": 65,
  "stakeAmount": "0.001",
  "reasoning": "Optional, at most 2000 characters",
  "visibility": "PUBLIC"
}
```

Constraints: confidence `50..99`, positive decimal stake, direction `UP|DOWN`,
visibility `PUBLIC|LOCKED`. Locked publication additionally requires derived
Verified status. The server checks the exact window before and after metadata
and quote reads, then stores a `PENDING_TRADE` draft.

### `POST /predictions/draft/:id/confirm` · authenticated

```json
{ "transactionHash": "0x…" }
```

Attaches a verified DreamDEX fill to the same draft. The authenticated wallet,
exact market, direction, draft block/time boundary, and positive fill must all
match. Retrying the same hash is safe. A different hash after binding is not.

### `POST /predictions` · authenticated, recovery compatibility

The current implementation does not create a first-time prediction here. It
returns an already linked same-wallet transaction when possible; otherwise it
requires the draft flow above.

### `GET /predictions/me` · authenticated

Returns the caller's prediction records, including their pending drafts.

### `GET /predictions/feed` · optional authentication

Returns up to 50 active predictions. Public, owned, or purchased records use the
visible DTO. Other locked records use a gated DTO that omits direction,
confidence, reasoning, quote, stake, transaction, and order data.

### `GET /predictions/:id` · optional authentication

Returns one prediction with the same redaction rules. Another wallet cannot use
this route to enumerate a pending draft.

### `POST /predictions/:id/claim` · authenticated

Records a claim only after verifying the receipt belongs to the predictor and
the exact LIVE, resolved position. Requires complete entry/settlement accounting.

## Insight unlocks

### `POST /predictions/:id/unlock/prepare` · authenticated

Returns exact escrow instructions: chain, contract, prediction key, market,
expiry, buyer-specific escrow state, token, decimals, price, recipient,
`windowLive`, and `salesOpen`. The API checks the deployed contract's immutable
token and price against server configuration before returning instructions.

### `POST /predictions/:id/unlock/confirm` · authenticated

```json
{ "transactionHash": "0x…" }
```

Verifies sender, escrow target, prediction key, receipt success, and current
contract payment state. Returns `unlocked: true` only for Revealed state.
Deposit-only is pending; Refunded is recorded but grants no access.

## Backed predictions

### `POST /predictions/:id/backs` · authenticated

Verifies and records the caller's already-submitted matching DreamDEX fill.

### `GET /predictions/:id/backs/me` · authenticated

Returns the caller's confirmed Back records for that prediction.

### `POST /predictions/:id/backs/recover` · authenticated

Finds the latest matching filled order for safe record recovery. It does not
submit a new trade.

## Profiles and leaderboard

- `GET /users/:address` — profile, active predictions, resolved history, settled
  totals, pending claims, and missing-accounting count; optional authentication
  controls locked access.
- `GET /users/:address/history` — resolved public history.
- `PATCH /users/profile` — authenticated display name/avatar metadata update.
- `POST /users/profile/avatar` — authenticated `multipart/form-data`, field
  `file`, one file up to 2 MiB; requires Cloudinary server configuration.
- `GET /leaderboard` — ranked predictor summaries.

## Health

- `GET /` returns API name and ready state.
- `GET /health` returns HTTP 200 and `{ "status": "ok" }`; use this for hosting
  health checks. It is a process liveness endpoint, not a deep MongoDB/RPC probe.
