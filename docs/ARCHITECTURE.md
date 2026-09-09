# System architecture

## System context

Credence is an application-layer reputation and access-control system around
DreamDEX binary Event Contracts. DreamDEX remains the source of truth for
markets, orders, fills, positions, finalization, and redemption. Credence adds a
server-timestamped forecast record, public performance history, reputation,
profile data, and paid access to locked reasoning.

```text
                         Somnia Shannon testnet
                    +-----------------------------+
                    | DreamDEX windows and pools  |
                    | InsightEscrow + tUSDC       |
                    +-------------^---------------+
                                  | wallet tx / RPC
+---------------+       HTTPS     |       +------------------+
| Browser wallet|<---> Next.js web app <-->| NestJS API       |
+---------------+                 |       | scheduled workers |
                                  |       +---------+--------+
                                  |                 |
                                  |                 v
                                  |             MongoDB
                                  v
                         DreamDEX GraphQL indexer
```

## Trust boundaries

### Browser and wallet

The browser holds draft recovery metadata in local storage. It is useful for
safe retries but is not authoritative. The wallet is authoritative for the
account that signed authentication messages and submitted chain transactions.
Credence never needs a user's private key.

### API and database

The API authenticates a canonical wallet address, creates the timestamped draft,
verifies chain evidence, redacts locked fields, calculates reputation, and owns
application audit records. MongoDB is trusted for application state, not for
asserting that an onchain trade or payment happened without verification.

### DreamDEX and Somnia

The exact market ID, window address, order receipt, fill, settlement vector, and
claim are verified against DreamDEX/Somnia data. Indexer availability affects
when verification completes; it must not turn an unknown result into success or
destroy a valid pre-trade draft.

### Insight escrow

`InsightEscrow` holds the configured ERC-20 unlock price between deposit and
reveal. Reveal pays the predictor. If the insight was never revealed and its
exact window is no longer live, refund returns funds to the buyer. Anyone may
sponsor refund gas, but cannot redirect the refund.

## Component responsibilities

| Component | Owns | Must not own or infer |
| --- | --- | --- |
| Next.js web | Forms, modals, wallet requests, receipt recovery, cached API state | Market truth, authorization, settlement truth |
| NestJS API | Auth, immutable drafts, verification, redaction, reputation, audit records | User private keys, invented fills, successor-market substitution |
| MongoDB | Users, drafts/predictions, unlocks, backed records, worker cursors/jobs | Independent proof of chain execution |
| DreamDEX SDK/indexer | Market discovery, books, activity, order recovery | Credence identity, visibility, reputation |
| Somnia RPC | Receipts, transactions, contracts, settlement and escrow state | Offchain reasoning or profile metadata |
| InsightEscrow | Deposit/reveal/refund state and token custody | HTTP content delivery, reputation, DreamDEX positions |

## Data ownership and identifiers

- Wallet addresses and transaction hashes are stored lowercase in application
  records; checksum formatting is used when preparing chain calls.
- `marketId` is a bytes32 DreamDEX identifier. `marketAddress` and `poolAddress`
  are stored alongside it for exact-window checks and receipt verification.
- A prediction MongoDB `_id` is used to derive the escrow key as
  `keccak256("credence:" + predictionId)`.
- `transactionHash` identifies the verified DreamDEX entry. A unique partial
  index prevents one transaction being linked to two predictions.
- `submittedTransactionHash` binds a pending draft to the first confirmation
  attempt before slow upstream verification.
- Demo records use `source = DEMO_SEED`; wallet-backed records use `source = LIVE`.

## Dependency direction

`packages/shared` contains transport types and pure lifecycle helpers. Both apps
depend on it. The web app talks to the API and prepares wallet actions. The API
talks to MongoDB, the official DreamDEX SDK/indexer, and Somnia RPC. Neither app
imports the other app's runtime implementation.

## Scheduled work

- Settlement polling runs every 30 seconds, groups due active predictions by
  exact market/window, reads verified finalization, publishes resolved history,
  and recalculates affected users.
- Accounting reconciliation retries resolved LIVE records that have enough
  verified entry data but lack payout accounting. It sends no transaction.
- The opt-in refund worker scans escrow deposits, persists jobs, and handles at
  most one refund transaction per tick. See [Operations](OPERATIONS.md).

## Explicit non-goals

- Credence is not a market maker, oracle, custodian of DreamDEX positions, or
  financial adviser.
- An insight unlock does not automatically Back Prediction.
- A Credence claim record is not the same as a wallet balance.
- Testnet configuration and demo qualification are not production guarantees.
