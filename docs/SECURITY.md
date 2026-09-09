# Security model

## Scope and assets

The security-sensitive assets are user wallet authorization, pre-expiry forecast
integrity, DreamDEX trade attribution, locked reasoning, escrowed unlock tokens,
refund-worker funds and key material, profile uploads, and audit history.

This document describes application controls; it is not an independent smart
contract audit. The escrow contract should be reviewed before handling valuable
funds.

## Core invariants

1. A first-time forecast cannot be accepted after its exact market closes.
2. Forecast fields cannot be changed after draft creation.
3. One DreamDEX transaction cannot prove multiple predictions.
4. A retry must not intentionally place another trade.
5. A symbol, pool, or successor window cannot replace the stored market ID.
6. Locked fields are removed from unauthorized API responses.
7. Unlock payment and Back Prediction are separate wallet decisions.
8. An unrevealed payment can refund only to its original buyer.
9. Chain/RPC uncertainty fails closed; it is not interpreted as authorization.
10. Demo history remains labeled and cannot become fabricated LIVE history.

## Authentication controls

- The server generates a cryptographically random 24-byte nonce and canonical
  message for one normalized wallet address.
- Challenges expire and are deleted before a session is issued, preventing
  replay of the same challenge.
- The API verifies the EVM signature and puts the wallet in a one-hour signed
  HTTP-only cookie.
- Production cookies require HTTPS and use `SameSite=None`; CORS permits the
  single configured `WEB_ORIGIN` with credentials.
- Connecting a wallet is not authentication. The user must sign the challenge.

## Forecast and trade integrity

- Draft creation checks the exact window is Trading, reads its quote and block,
  then checks Trading again before insertion.
- Confirmation verifies the receipt/activity after the recorded draft boundary,
  authenticated sender, exact market and contract, economic side, native order
  direction, and positive filled quantity.
- The first submitted hash is durably bound before upstream verification.
- Definitive invalidity fails the draft; transient indexer/RPC errors preserve it
  for retry.
- Unique indexes enforce transaction-hash and claim-hash reuse constraints.

## Locked-data confidentiality

Locked insight protection is server-side DTO selection. Unauthorized responses
contain only the gated type. The omitted fields include the forecast direction,
confidence, reasoning, entry probability, stake, transaction hash, and order ID.
Do not add sensitive fields to gated DTOs or frontend bootstrap payloads.

Confidentiality still depends on API/database/operator security and on the
predictor not publishing the reasoning elsewhere. Blockchain transactions are
public; escrow payment existence is not private.

## Escrow controls

- Token and price are immutable constructor parameters and checked by the API.
- Deposits bind prediction key, predictor, exact market contract, and expiry.
- The contract validates the window's own expiry and Trading status.
- A 60-second minimum buffer prevents new deposits at the closing boundary.
- Checks-effects-interactions and a reentrancy guard protect token transfers.
- Fee-on-transfer payment tokens are rejected by exact balance-delta checking.
- There is no owner/admin withdrawal path.
- Reveal and refund are terminal, mutually exclusive states.

Known assumptions: the configured token contract behaves sufficiently like an
ERC-20; DreamDEX window `status()` uses `1` for Trading; the window contract and
Somnia consensus are trusted; and HTTP content delivery cannot be atomic with an
onchain reveal. Delivery is therefore retriable after the receipt.

## Refund worker controls

- Disabled unless `ENABLE_AUTO_UNLOCK_REFUNDS=true`.
- Uses a dedicated, low-balance gas wallet stored only in backend secrets.
- Verifies chain, escrow token, price, payment state, block time, and market
  status before simulation and signing.
- Enforces an explicit maximum transaction fee.
- Uses MongoDB leases so replicas do not race the signer nonce.
- Persists signed bytes and hash before broadcasting; restart rebroadcasts the
  same transaction rather than creating a new nonce.
- Processes at most one refund transaction per tick and waits for confirmation.
- Sanitizes errors so request material and keys are not logged.

## Secrets and configuration

Never commit `.env.local`, `.local-operations/`, wallet keys, MongoDB credentials,
JWT secrets, Cloudinary secrets, or signed raw transactions. Only browser-safe
values may use `NEXT_PUBLIC_*`. `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is public;
a wallet private key is not.

Use separate keys for deployment, demo automation, and the refund worker. Give
worker wallets only limited native gas. Rotate any key exposed in source,
screenshots, logs, tickets, or chat, then transfer remaining assets away.

## Reporting a vulnerability

Do not open a public issue containing a private key, exploitable production
detail, user data, or live credential. Contact the repository owner privately,
include affected commit and reproduction steps, and redact secrets and personal
data. Pause affected payments or workers while triaging when safe to do so.
