# Lifecycle rollout

This is a targeted window-binding patch, not a product redesign. The user's
explicit escrow decision overrides the default AGENTS preference against a new
contract. The original lifecycle patch did not deploy or migrate data. Subsequent
user-authorized Shannon deployment and DEV database copy are recorded below.

## Safe migration strategy

1. Back up MongoDB and keep new insight payments paused. Inventory LIVE records
   by their saved bytes32 `marketId`, entry hash, wallet and filled quantity.
2. Recover **only that exact ID** using the SDK's `client.getMarket(id)` and
   `client.getMarketOnchain(id)`. Pools may be reused: a pool alone is not identity.
   Verify the old receipt's sender, pool, market ID, side and positive fill using
   `DreamDexService.verifyPredictionTrade` before proposing changes.
3. Review a per-record diff before writes. Fill missing market/pool addresses,
   window start/expiry/duration, side, UP entry probability, entry hash and token
   accounting from verified evidence. Never replace an existing conflicting
   identity. Never guess a missing entry probability or cost.
4. A read failure is not proof a record is dead. Quarantine inconsistent records
   for review. Only mark a failed/unestablished entry FAILED/dead after proof;
   preserve valid closed entries and all payment/back references. Do not delete
   audit records. Existing direct payments cannot retroactively enter escrow.
5. For resolved LIVE records, remove unsupported realized P&L from aggregates;
   retain any legacy values in the backup, then verify actual redeem receipts.
   Recalculate reputation/profile totals only from valid finalized observations.
6. Regenerate unlinked historical DEMO_SEED records using `npm run seed:demo`
   on an explicitly enabled nonproduction database. The seeder preserves linked
   audit parents. Review legacy active demo cards separately; never promote them
   to real predictions or fabricate transaction hashes.

This strategy has not been applied to the user's database. Missing legacy
accounting remains a claim-recording blocker, not a fabricated zero.

## Escrow handoff

### Authorized local operations (September 2026)

- Shannon chain ID: 50312. Escrow: `0x83dc489c682f677fbd5ae9d8faa2c894fc8a5076`.
- Deployment transaction: `0xefafc66ec2fb40a06ebb8e9734ca75fe96be06a463031e5b17bfb6ab1ff30937`.
- Deployment block: `481590517`. Immutable payment token and price were read back
  and verified before `.env.local` was updated. No external host was changed.
- Dedicated worker key generated offline and saved only in owner-readable
  `.env.local`; never printed. Refund fee cap: 0.05 STT per transaction.
  Background worker remains disabled until the intended runtime database is chosen.
- `MONGODB_URI` was copied to the verified-empty `MONGODB_URI_DEV`, preserving
  document IDs and indexes: 373 predictions, 9 users, 1 back, 1 unlock, plus empty
  collections. Document hashes were checked in both databases; source unchanged.
  Private EJSON backup: `.local-operations/mongo-backup-1788731978667/`.
  This is a data copy, not the legacy lifecycle repair described above. The API
  still uses `MONGODB_URI`; merely defining `MONGODB_URI_DEV` does not switch it.
- `scripts/test-live-refund.mjs` tests the deployed escrow with the real worker,
  configured payment token and an explicitly synthetic controllable window. It
  writes refund audit jobs only to DEV; it never publishes a fake prediction.
  It requires one unlock-price worth of tUSDC. Completion is only reported after
  a real refund receipt, Refunded contract state and buyer balance are verified.
- Live smoke test passed: 1 tUSDC deposited and returned to the buyer by the
  actual refund worker, with DEV audit state reconciled to `refunded`.
  Refund transaction: `0xd20af7d38b566bb74e2364c54a3521e04aee62153eb127540ac1b03635d325e5`.
  Synthetic test window: `0xb28b0e1ee0b0c01f2c55e33cf42225a823464939`.
  This verifies deposit discovery, worker signing/broadcast, contract refund and
  receipt reconciliation, not a real DreamDEX window's oracle lifecycle. Ongoing
  background refunds remain disabled; no fake prediction was published.

Deployment/test transaction recovery files under `.local-operations/` contain
signed transactions; keep that gitignored directory private. Do not delete these
records to retry a transaction. The scripts reuse the saved transaction bytes.

Run `forge test --root contracts`. Independently review the contract before any
valuable funds are accepted. Deploy `InsightEscrow` on the configured Shannon
network using the verified payment token and base-unit price as constructor
arguments. Configure its returned address as API-only `UNLOCK_ESCROW_ADDRESS`.
The API checks chain, immutable token and price before presenting instructions.
The user-authorized Shannon deployment is now configured in local API settings;
see the operations record above. External hosting secrets are not updated.

The contract enforces a 60-second minimum deposit buffer. API configuration may
increase that cutoff; it cannot reduce the contract minimum. A revealed payment
cannot be refunded. An unrevealed payment can be refunded after closure by the
buyer or any gas sponsor, always to the buyer. The optional automatic refund
worker is described below. Explicit reveal releases funds before HTTP delivery; API
confirmation is retriable with the saved transaction hash.

## Automatic refund worker (opt-in)

Backend-only configuration:

```env
ENABLE_AUTO_UNLOCK_REFUNDS=false
REFUND_WORKER_PRIVATE_KEY=
UNLOCK_ESCROW_START_BLOCK=
REFUND_MAX_TX_COST_WEI=
```

Use a dedicated Shannon gas wallet, not a user/predictor wallet. Store its key in
the backend host's secrets, never `NEXT_PUBLIC_*`, Git or chat. Configure the
actual escrow deployment block and an explicit maximum total gas cost per refund
in native-token base units. Existing escrow address/token/price configuration
must match the deployed contract. Fund this wallet externally with testnet gas,
then explicitly enable the flag and restart the API. The local signer was generated
and escrow deployed with user approval; automatic background refunds remain opt-in.

The worker scans 500 blocks per tick from the deployment block, two blocks behind
head, and stores deposit jobs even when browser confirmation never reached the
API. It polls every 30 seconds and handles at most one refund transaction per
tick. MongoDB's unique indexes and shared lease coordinate replicas. Keep indexes
enabled and run just one dedicated signer across this deployment. Do not use its
nonce for unrelated transactions or share it with another database/deployment.

Payments are rechecked on-chain. Only Deposited payments after expiry or a
successful non-Trading status read are eligible; RPC errors never authorize a
refund. Simulation and the contract provide the final guard against reveal races.
Funds go to the original buyer. No predictor key or token allowance is needed.

The signed transaction/hash is persisted before broadcast. A timeout/restart
rebroadcasts those same bytes, never a new nonce. Receipts are reconciled after
two further blocks. A stuck/dropped transaction pauses new submissions; an
operator must investigate rather than deleting jobs or automatically replacing
transactions. Inspect `refundjobs` for state/hash and `refundworkerstates` for
the event cursor. Back up these collections. Signed raw transactions are stored
for crash recovery (not private keys); restrict database access.

The fee cap is per transaction, not a total spending budget. Keep only a limited
gas balance in the worker wallet. Invalid config, insufficient gas, RPC outages,
fee-cap failures and DB errors defer processing with sanitized warnings. Initial
event catch-up and one-job-per-tick throughput can delay refunds. Do not advertise
instant refunds. Manual buyer refunds remain available even if the worker stops.
Disabling the worker prevents further submissions but cannot cancel transactions
already broadcast. No contract redeployment is required for this worker.

## Remaining manual acceptance

Profiles now distinguish settled P&L (estimated finalized performance, including
unclaimed losses) from claimed P&L (verified redemption proceeds minus entry
cost). Settled totals are grouped by collateral token; missing legacy accounting
is explicitly excluded and flagged, not treated as zero. Pending claim counts
include positive finalized payouts without recorded claims, including voids.

Settlement stores the original side's payout from the finalized payout vector.
Verified zero-payout positions need no redemption to record their settled loss;
the UI does not offer a new claim transaction for them. Unknown payouts are not
assumed zero, and existing external claim hashes can still be verified. Every
30 seconds the worker retries accounting for up to 25 resolved LIVE records
with the required exact-window and entry-cost fields. No transaction is sent.
These figures are estimates before redemption fees, not wallet balances.

Use the two-wallet test in AGENTS.md against one exact real window. Test expiry
while each modal is open, deposit without reveal followed by refund, finalized
public history, and redeem followed by recorded realized P&L. Also exercise a
real Cloudinary upload with API-only credentials and verify navbar updates.

New forecasts after closure are rejected. The composer now creates an authenticated
immutable server draft through `POST /predictions/draft` before invoking the wallet.
The saved document ID and server timestamp establish the forecast before expiry;
the exact market, wallet, side, confidence, reasoning, visibility and stake intent
cannot be changed by confirmation. A fresh exact-window check runs before trading.

`POST /predictions/draft/:id/confirm` accepts only a transaction hash. It verifies
the wallet, exact market, side, positive fill, execution window and draft timing,
then attaches the trade to that same document. Internally LIVE is represented by
`status=ACTIVE, marketStatus=live`; CLOSED uses `status=ACTIVE, marketStatus=closed`
to preserve the existing settlement worker. Confirmation after expiry is allowed
for an existing valid draft and produces CLOSED. Only verified finalization may
resolve it. Invalid trade evidence produces FAILED/dead; temporary upstream errors
leave it PENDING_TRADE and retriable. Pending drafts are not publicly published.
Legacy `POST /predictions` only recovers already-linked records; it cannot create
retrospective forecasts from old browser-only receipts.

## Publication retry safety

Before invoking the wallet, the composer saves the server draft ID and an attempt
marker. Interrupted wallet flows require checking wallet activity and supplying
the existing transaction hash; they never silently submit another trade. After
the wallet adapter returns a confirmed trade, the composer saves the exact
payload and receipt in browser local storage, scoped to wallet and market. A
linking failure offers a record-only retry; it never executes another trade.
Draft controls are frozen. Reopening the same window reuses the saved payload.
The API returns an existing same-wallet/same-market transaction record before
upstream discovery, including when the original save completed after a timeout.
Concurrent saves are protected by the unique transaction index.

This does not reverse earlier duplicate trades, repair an upstream outage, or
permit creation of a new draft after closure. Browser recovery data is local;
do not clear site storage while recovering a receipt. A different browser cannot
recover that draft automatically. Interrupting the wallet flow before its
confirmed result is returned still requires inspecting the wallet receipt.
