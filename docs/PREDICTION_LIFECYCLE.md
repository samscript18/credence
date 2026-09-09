# Prediction lifecycle

## Why the draft exists

If the forecast lived only in the browser until after a trade, a trade submitted
near expiry could be confirmed after the market closed. The server could not
prove whether the forecast was authored before the outcome became knowable.
Credence solves this by creating an immutable server-side draft while the exact
market is still Trading.

## Publication protocol

```text
completed form
    |
    v
POST /predictions/draft
    | authenticate wallet
    | fetch exact market ID/window
    | verify Trading, read quote and block, verify Trading again
    v
PENDING_TRADE draft (immutable forecast + server createdAt)
    |
    | persist recovery marker before opening wallet
    | fresh exact-window check
    v
wallet submits DreamDEX trade
    |
    | persist returned transaction hash locally
    v
POST /predictions/draft/:id/confirm
    | bind first hash
    | verify sender, exact market, direction and positive fill
    | record cost and receipt data
    v
ACTIVE prediction, marketStatus = live or closed
    |
    | verified finalization only
    v
RESOLVED public history
```

The persisted draft fields include predictor address, exact market identity,
direction, confidence, reasoning, visibility, stake intent, quote, expiry,
creation time, draft block, and `PENDING_TRADE` status. There is no endpoint that
edits those forecast fields after creation.

## State model

The database uses a coarse publication status plus an exact-window status:

| Publication status | Meaning |
| --- | --- |
| `PENDING_TRADE` | Forecast exists, but no verified fill has been attached |
| `ACTIVE` | A positive DreamDEX fill was verified; the window may be `live` or `closed` |
| `RESOLVED` | DreamDEX finalization was verified; history is public |
| `FAILED` | The receipt was definitively invalid for the draft |

| Market status | Meaning |
| --- | --- |
| `live` | Exact stored window currently reports Trading |
| `closed` | No longer Trading, not yet proven finalized |
| `resolved` | Verified resolved or void finalization |
| `dead` | Draft/trade verification definitively failed |

This split is deliberate: confirmation after expiry can produce
`status = ACTIVE, marketStatus = closed`. That preserves a valid pre-expiry
forecast without falsely claiming the market is still tradable.

## Retry and failure semantics

- Before invoking the wallet, the browser stores an attempt marker scoped to
  wallet and market. If the flow is interrupted, Credence asks for recovery; it
  does not silently place another order.
- After the wallet returns a hash, the exact draft payload and hash are saved in
  local storage before the API link request.
- Confirmation binds the first submitted hash to the draft. A different hash is
  rejected; the same hash is idempotent.
- An RPC or indexer timeout leaves the draft recoverable. Only a definitive
  invalid-transaction error marks it `FAILED`.
- A unique transaction index prevents concurrent requests from linking one fill
  to multiple prediction records.
- A successor market is never substituted. Recovery always uses the stored
  `marketId`, addresses, direction, wallet, and draft time/block boundary.

Do not clear browser site storage while recovering a trade unless the receipt
has been saved elsewhere. If a wallet transaction may have been submitted,
inspect wallet activity before taking any action that could trade again.

## Settlement and reputation

After expiry, the settlement worker reads the exact stored window. A closed but
unfinalized record remains active/closed. Only a finalized resolved or voided
DreamDEX result moves it to `RESOLVED`. Resolution also makes locked history
public.

Non-void records affect accuracy and the Brier-improvement reputation score.
Voids do not affect forecasting skill. Where entry accounting exists, the worker
also records the selected side's settlement payout and estimated settled P&L.

## Claims and P&L terminology

- **Settled P&L** is the finalized payout minus verified entry cost, grouped by
  collateral token. It can include a loss even when no redemption transaction
  is needed or recorded.
- **Realized/claimed P&L** is exposed for LIVE records only after Credence
  verifies the user's claim transaction. Demo history may carry labeled seeded
  values.
- **Wallet balance** is current onchain holdings and is not calculated by
  summing Credence records.

A zero-payout losing position does not need a claim transaction to prove the
settled loss. A positive finalized position may remain a pending claim until its
redemption is verified.

## Locked insight lifecycle

```text
verified predictor publishes LOCKED + verified LIVE entry
    -> buyer prepares exact escrow instructions
    -> buyer deposits configured ERC-20 price
    -> buyer explicitly reveals while the window is live
    -> escrow pays predictor
    -> API verifies state and returns wallet-specific access
    -> buyer may separately choose Back Prediction
```

If the deposit was never revealed, closure enables refund. Reveal and refund are
mutually exclusive contract states. Unlock authorization is enforced by API DTO
redaction; locked reasoning and direction are not merely hidden with CSS.

## Back Prediction lifecycle

Backing is a new wallet-owned DreamDEX trade on the same exact window and side.
It is never triggered by unlock alone. The API verifies the backer's sender,
market, side, and fill and stores the actual execution probability, quantity,
order ID, and transaction hash. The recovery endpoint searches only for the
latest matching filled order and does not submit a trade.
