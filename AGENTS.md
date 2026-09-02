# AGENTS.md — CREDENCE

## 0. Mission

You are building **Credence**, a hackathon MVP for the Somnia × DreamDEX Event Contracts Hackathon.

Credence is a reputation-powered prediction marketplace built on top of DreamDEX Event Contracts.

The product thesis is:

> Prediction skill should be proven, not claimed.

Positioning:

> DreamDEX shows what the market believes. Credence shows you who actually knows.

Credence allows users to:

1. Connect an EVM wallet.
2. Browse live DreamDEX Event Contracts.
3. Make an UP/DOWN prediction.
4. Attach confidence, stake, and optional reasoning.
5. Execute an actual corresponding DreamDEX Event Contract trade.
6. Build a permanent prediction history.
7. Earn a Credence Reputation Score.
8. Become a Verified Predictor after proving sufficient performance.
9. Lock active predictions behind a small payment.
10. Allow another wallet to pay to reveal a locked prediction.
11. Allow the buyer to manually Back Prediction.
12. Execute the buyer's corresponding DreamDEX trade.
13. Resolve predictions after DreamDEX settlement.
14. Make all resolved predictions permanently public.
15. Recalculate reputation and leaderboard rankings.

This is a **hackathon MVP**, not a startup-scale platform.

Prioritize:

* working functionality,
* meaningful DreamDEX Event Contract usage,
* correct on-chain interaction,
* polished core UX,
* reliable demo flow,
* clear code,
* deployability.

Do NOT over-engineer.

---

# 1. Product Source of Truth

Before implementing anything, read the project documents supplied alongside this file.

Expected product documents:

* `CREDENCE.md` / `Credence.txt`
* `CREDENCE_STORY.md` / `Credence story.txt`
* this `AGENTS.md`

Priority when requirements conflict:

1. `AGENTS.md`
2. Credence MVP Overview
3. Credence story
4. existing code

The MVP Overview defines WHAT must exist.

The story document provides narrative/UX context.

Do not turn every narrative sentence from the story into a separate feature.

Do not add features that are not required for the MVP.

---

# 2. Mandatory Technology Stack

Use the following stack.

## Frontend

* Next.js
* App Router
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Axios
* TanStack React Query
* Zustand

Additional Web3 libraries may be installed where necessary:

* viem
* wagmi

Use the smallest additional dependency set possible.

Do not replace the requested libraries with alternatives.

For example:

* Do not replace Axios with native fetch for the application API layer.
* Do not replace React Query with SWR.
* Do not replace Zustand with Redux.
* Do not replace Tailwind/shadcn with another component framework.

## Backend

* NestJS
* TypeScript
* MongoDB
* Mongoose
* Axios where HTTP clients are required

Allowed supporting Nest packages include:

* `@nestjs/config`
* `@nestjs/mongoose`
* `@nestjs/schedule`
* `class-validator`
* `class-transformer`
* JWT/auth libraries where needed

## Blockchain

Use official/current Somnia and DreamDEX tooling.

Primary Event Contract integration should use the currently supported:

`@somnia-chain/markets-sdk`

but VERIFY the current official version and API before implementation.

Use:

* viem for generic EVM operations
* Somnia Shannon Testnet during development

Never use a developer private key to execute user trades.

User trading transactions must be signed by the user's connected wallet.

---

# 3. Critical DreamDEX Rule

DO NOT INVENT DREAMDEX APIs.

This rule is absolute.

Before implementing DreamDEX functionality:

1. Read the official DreamDEX Event Contract documentation.
2. Read the current DreamDEX Bot Kit.
3. Inspect current Event Contract examples.
4. Inspect the installed `@somnia-chain/markets-sdk` TypeScript definitions/source.
5. Verify all function names.
6. Verify all argument types.
7. Verify market status enums.
8. Verify order placement behavior.
9. Verify collateral/token decimals.
10. Verify settlement/redeem behavior.
11. Verify testnet contract addresses dynamically or from official sources.

Never guess:

* API URLs
* SDK methods
* contract addresses
* token addresses
* token decimals
* order side encoding
* market status encoding
* outcome indexes
* settlement functions
* price units
* quantity units
* expiration units

If documentation and an old example disagree, prefer the CURRENT SDK and CURRENT official documentation.

Add comments documenting any non-obvious DreamDEX implementation decisions.

---

# 4. Network

Develop against Somnia Shannon Testnet.

Expected chain:

```ts
chainId = 50312
```

The currently documented Shannon RPC is:

```txt
https://dream-rpc.somnia.network
```

Do NOT send mainnet transactions during development.

Make chain configuration environment-driven.

Frontend must detect when the wallet is connected to the wrong chain and provide:

`Switch to Somnia Shannon`

before allowing:

* Publish & Trade
* Unlock
* Back Prediction

Do not silently execute on another chain.

---

# 5. Repository Architecture

Use a simple monorepo.

Recommended structure:

```txt
credence/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
├── .env.example
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   └── ...
│   │
│   └── api/
│       ├── src/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── predictions/
│       │   ├── markets/
│       │   ├── unlocks/
│       │   ├── backs/
│       │   ├── leaderboard/
│       │   ├── reputation/
│       │   ├── settlement/
│       │   ├── dreamdex/
│       │   ├── demo/
│       │   └── common/
│       └── ...
│
└── packages/
    └── shared/
        ├── types/
        ├── constants/
        └── utils/
```

Use npm workspaces unless an existing repository already uses another package manager.

Do not introduce Turborepo unless it materially simplifies the project.

This project is small enough not to need sophisticated build orchestration.

---

# 6. Architectural Principle

Keep three layers separate.

## DreamDEX

DreamDEX is the execution and settlement venue.

It owns:

* Event Contracts
* Event market state
* order execution
* positions
* settlement
* redemption where applicable

## Credence Backend

Credence owns:

* prediction identity
* predictor profiles
* reputation
* prediction history
* locked/public visibility
* unlock purchases
* leaderboard
* demo seed records
* cached/reference market metadata

## Credence Frontend

Credence provides:

* human-friendly discovery
* wallet interaction
* social prediction feed
* predictor reputation
* unlock flow
* Back Prediction flow

Never duplicate DreamDEX as a second prediction market.

Credence should sit on top of DreamDEX.

---

# 7. MVP Navigation

The application should contain four primary product areas:

```txt
Home
Markets
Leaderboard
Profile
```

Additional detail routes are allowed:

```txt
/prediction/[id]
/profile/[walletAddress]
```

Do not create unnecessary giant dashboard sections.

Desktop navigation may use a compact sidebar.

Mobile should use a compact bottom navigation or responsive navigation.

---

# 8. UI Direction

Design Credence as a premium social-finance application.

Do NOT make it look like:

* generic admin dashboard,
* enterprise SaaS,
* raw blockchain explorer,
* crowded professional trading terminal.

It should feel like:

Prediction market + social reputation + creator marketplace.

Use:

* strong typography
* generous spacing
* restrained cards
* subtle borders
* dark-first interface
* clear probability information
* simple badges
* concise financial information
* responsive layout

Avoid excessive gradients and excessive glassmorphism.

Use shadcn components consistently.

Core components should include:

```txt
AppShell
Sidebar / MobileNav
WalletButton
MarketCard
MarketProbability
PredictionCard
LockedPredictionCard
PredictionComposer
PredictorAvatar
ReputationBadge
VerifiedBadge
StatCard
LeaderboardRow
PredictionHistoryRow
UnlockDialog
BackPredictionDialog
TransactionDialog
TransactionStatus
EmptyState
ErrorState
Skeleton
```

Use Lucide icons where useful.

---

# 9. Required Frontend Routes

## `/`

Home / prediction feed.

Show:

* current DreamDEX markets summary
* active public predictions
* locked predictions from Verified Predictors

Prediction cards should prominently show the predictor.

Public example:

```txt
Sarah predicts ETH UP

Reputation 57

ETH — Next 15 Minutes

UP

Confidence 68%

Market probability at prediction 42%

Back Prediction
```

Locked example:

```txt
David made a BTC prediction

Verified Predictor
Reputation 88
Rank #7

BTC — Next 15 Minutes

Direction       Locked
Confidence      Locked
Reasoning       Locked

Unlock — 1 USDso
```

Do NOT send hidden prediction data to unauthorized clients.

This is a backend security requirement, not merely a CSS blur.

---

## `/markets`

Display current live DreamDEX Event Contracts.

Each market should contain information available from the official integration, for example:

```txt
BTC — Next 15 Minutes

UP       65%
DOWN     35%

12:43 remaining
```

Do not hardcode BTC/ETH if DreamDEX returns different markets.

Render available markets dynamically.

Allow selecting a market to create a prediction.

---

## `/leaderboard`

Rank users using Credence Reputation.

Show approximately:

```txt
Rank
Predictor
Reputation
Accuracy
Resolved
P&L
Verified
```

Allow clicking a predictor.

Verified status is NOT manually assigned.

Verified is derived from:

```txt
reputation >= 80
AND
resolvedPredictions >= 25
```

---

## `/profile/[address]`

Show:

* wallet identity
* optional demo display name
* Verified badge
* Credence Reputation
* global rank
* accuracy
* resolved count
* correct count
* realized P&L
* complete resolved prediction history
* active public predictions
* active locked predictions as permitted

Both wins AND losses must be visible.

Resolved history cannot be hidden by the predictor.

---

# 10. Wallet Authentication

Wallet address is the user's identity.

Do not use username/password authentication.

Implement wallet-signature authentication.

Suggested flow:

```txt
GET /auth/nonce?address=0x...

server returns nonce

frontend requests wallet signature

POST /auth/verify
{
  address,
  nonce,
  signature
}

server verifies signature

server creates/authenticates User

server returns authenticated session/JWT
```

Prefer an HTTP-only secure cookie if deployment topology makes it straightforward.

Otherwise use a short-lived JWT with careful storage.

Normalize wallet addresses consistently.

Use checksum addresses for display where possible and lowercase canonical values for database uniqueness.

Never trust an address sent in a POST body as proof of identity.

Authenticated backend actions must derive user identity from authentication.

---

# 11. User Model

Mongoose model approximately:

```ts
User {
  walletAddress: string; // unique, lowercase canonical

  displayName?: string;
  avatarSeed?: string;

  reputationScore: number;

  resolvedPredictions: number;
  correctPredictions: number;
  incorrectPredictions: number;

  accuracy: number;

  realizedPnl: string;

  createdAt: Date;
  updatedAt: Date;
}
```

Do not store `verified` as manually editable truth.

Provide a domain function:

```ts
isVerifiedPredictor(user)
```

with:

```ts
user.reputationScore >= 80 &&
user.resolvedPredictions >= 25
```

If a denormalized `isVerified` field is stored for query performance, it must always be derived automatically.

---

# 12. Prediction Model

Use one schema for REAL and SEEDED predictions.

Do not create a fake UI-only prediction type.

Suggested model:

```ts
Prediction {
  _id: ObjectId;

  predictor: ObjectId;
  predictorAddress: string;

  source: "LIVE" | "DEMO_SEED";

  // DreamDEX identity
  marketId: string;
  venueId?: string;
  symbol?: string;
  underlying?: string;

  marketTitle: string;

  marketStartAt?: Date;
  marketExpiryAt: Date;

  // prediction
  direction: "UP" | "DOWN";
  confidence: number;

  reasoning?: string;

  visibility: "PUBLIC" | "LOCKED";

  // snapshot when prediction was submitted
  marketProbabilityAtEntry: number;

  // actual DreamDEX trade
  stakeAmount: string;
  collateralSymbol?: string;
  collateralTokenAddress?: string;

  transactionHash?: string;
  orderId?: string;
  positionReference?: string;

  // lifecycle
  status:
    | "PENDING_TRADE"
    | "ACTIVE"
    | "RESOLVED"
    | "FAILED";

  finalOutcome?: "UP" | "DOWN" | "VOID";

  isCorrect?: boolean;

  realizedPnl?: string;

  resolvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

For seeded data:

```txt
source = DEMO_SEED
```

Never generate fake transaction hashes.

For live predictions:

```txt
source = LIVE
transactionHash = actual chain transaction hash
```

---

# 13. Prediction Visibility Security

THIS IS CRITICAL.

For an ACTIVE LOCKED prediction, unauthorized users MUST NOT receive:

* direction
* confidence
* reasoning

Do not implement this by sending the values to React and applying blur CSS.

Do not include them in:

* page HTML
* server rendered data
* React Query cache
* JSON API
* Zustand state
* DOM attributes

Public active locked DTO:

```ts
{
  id,
  predictor,
  reputation,
  rank,
  market,
  visibility: "LOCKED",
  unlockPrice,
  createdAt
}
```

Unlocked DTO may additionally contain:

```ts
{
  direction,
  confidence,
  reasoning,
  marketProbabilityAtEntry
}
```

A user may access locked fields only if:

```txt
user is prediction creator
OR
prediction has resolved
OR
user has a confirmed Unlock record
```

Always enforce this in NestJS.

Never trust the frontend.

---

# 14. Important MVP Privacy Disclosure

DreamDEX trades are on a public blockchain.

A sophisticated user may be able to inspect a predictor's on-chain activity and infer their position.

Therefore:

Do NOT market Credence's paid predictions as cryptographically secret.

The MVP provides:

> application-level gated access to the predictor's structured insight, confidence, and reasoning.

Add an honest README note explaining this limitation.

Do not spend hackathon time building zero-knowledge or privacy infrastructure.

---

# 15. Publish & Trade

This is the core creator action.

Prediction form:

```txt
Market
Direction
Current DreamDEX Probability

Confidence
Stake

Reasoning — optional

Prediction Visibility
Public
Locked — only if Verified

Publish & Trade
```

Rules:

* Direction: UP or DOWN
* Confidence: 50–99%
* stake > minimum accepted by selected Event Contract
* reasoning optional
* non-Verified predictor cannot select Locked
* live market must still be tradable
* connected wallet must be correct chain

The button must NOT merely create a Mongo record.

It must execute a real DreamDEX Event Contract trade.

---

# 16. Publish & Trade Transaction Sequence

Implement a robust staged workflow.

Suggested state machine:

```txt
IDLE

→ VALIDATING

→ PREPARING_TRADE

→ AWAITING_WALLET

→ TRANSACTION_SUBMITTED

→ CONFIRMING

→ RECORDING_PREDICTION

→ SUCCESS
```

Failure states:

```txt
WALLET_REJECTED
TRADE_FAILED
MARKET_EXPIRED
INSUFFICIENT_BALANCE
INSUFFICIENT_ALLOWANCE
INVALID_ORDER
NETWORK_ERROR
RECORDING_FAILED
```

Do not show success until a real transaction has been confirmed as required by the selected DreamDEX SDK path.

After transaction confirmation:

POST the prediction to Credence API with:

* market identity
* direction
* confidence
* reasoning
* visibility
* stake
* observed market probability
* real tx hash

The backend should verify as much transaction information as practical.

A user must not be able to manually POST arbitrary fake tx hashes and earn reputation.

---

# 17. DreamDEX Adapter

Create a dedicated abstraction.

Frontend:

```txt
lib/dreamdex/
```

Backend:

```txt
src/dreamdex/
```

Do not scatter SDK calls throughout React components.

Expose domain operations such as:

```ts
listEventMarkets()
getEventMarket(marketId)
getMarketProbabilities(marketId)

prepareOrExecutePredictionTrade(...)

getUserPosition(...)
getMarketSettlement(...)
```

These are OUR wrapper names.

Inside these wrappers use the verified real SDK API.

Do not pretend these names are DreamDEX SDK methods.

---

# 18. Market Data

Use DreamDEX as the authoritative market source.

React Query should own remote market state.

Examples:

```ts
useMarkets()
useMarket(marketId)
usePredictionFeed()
useLeaderboard()
useProfile(address)
```

Configure sensible refetch intervals.

Do not poll every second unnecessarily.

Market countdown can update locally from an expiry timestamp.

Invalidate relevant queries after:

* Publish & Trade
* unlock confirmation
* Back Prediction
* settlement update

---

# 19. Zustand Responsibilities

Use Zustand only for CLIENT UI/application state that does not belong in React Query.

Appropriate examples:

```txt
connected app preferences
selected market
prediction composer draft
pending transaction UI
sidebar/mobile nav state
```

Do NOT duplicate backend data into Zustand.

React Query = server state.

Zustand = client state.

---

# 20. Axios Architecture

Create one configured Axios client.

Example:

```txt
services/api.ts
```

Responsibilities:

* API base URL
* credentials
* auth token where applicable
* consistent error normalization
* request/response handling

Then feature services:

```txt
services/auth.service.ts
services/predictions.service.ts
services/users.service.ts
services/leaderboard.service.ts
services/unlocks.service.ts
```

React components must not contain arbitrary Axios calls.

---

# 21. Verified Predictor

Eligibility:

```ts
const VERIFIED_REPUTATION_MIN = 80;
const VERIFIED_RESOLVED_MIN = 25;
```

Verified iff:

```ts
score >= 80 && resolved >= 25
```

Do not manually assign verification to real accounts.

Seeded profiles must use the exact same logic.

Only a Verified Predictor can publish an ACTIVE LOCKED prediction.

If they later fall below 80:

For the MVP:

* they lose eligibility to create new locked predictions,
* already published active locked predictions remain in their existing state.

Document this behavior.

---

# 22. Locked Predictions

When a Verified Predictor publishes:

```txt
Visibility

○ Public

● Locked — 1 payment token
```

The unlock price must be configured, not scattered as magic numbers.

Example environment values:

```txt
UNLOCK_TOKEN_ADDRESS=
UNLOCK_TOKEN_SYMBOL=
UNLOCK_TOKEN_DECIMALS=
UNLOCK_PRICE_BASE_UNITS=
```

Determine the appropriate testnet stable/payment token from current official Somnia/DreamDEX resources.

Do NOT assume token decimals.

If USDso is used, verify its current environment/address/decimals.

---

# 23. Unlock Model

```ts
PredictionUnlock {
  prediction: ObjectId;

  buyerAddress: string;
  predictorAddress: string;

  paymentTokenAddress: string;
  paymentTokenSymbol: string;

  amount: string;

  transactionHash: string;

  status:
    | "PENDING"
    | "CONFIRMED"
    | "FAILED";

  confirmedAt?: Date;

  createdAt: Date;
}
```

Create unique constraints for:

```txt
prediction + buyerAddress
transactionHash
```

One transaction must never unlock multiple unrelated predictions.

---

# 24. Paid Unlock Flow

Unlock must NOT be:

```ts
setUnlocked(true)
```

It must have an actual testnet payment where feasible.

Recommended MVP design:

Direct token transfer:

```txt
Sarah
→ stable/payment token transfer
→ David wallet
```

No custom monetization smart contract is required unless the existing repo already contains one.

Flow:

```txt
Sarah presses Unlock

→ authenticated API requests unlock instructions

→ backend returns:
   recipient
   token address
   amount
   chain

→ frontend asks wallet to execute payment

→ wallet confirms

→ frontend receives txHash

→ POST /predictions/:id/unlock/confirm

→ backend fetches transaction receipt

→ backend verifies payment

→ creates confirmed PredictionUnlock

→ frontend refetches prediction

→ hidden information is returned
```

Backend verification must validate:

* correct network
* transaction success
* expected token
* expected sender
* expected recipient
* amount >= required amount
* transaction hash unused

If native-token payment is selected instead, validate native transfer value.

Do not grant access solely because frontend says payment succeeded.

---

# 25. Unlock UX

Before:

```txt
David made a BTC prediction

Verified Predictor
Reputation 88
Rank #7

BTC — Next 15 Minutes

Direction     Locked
Confidence    Locked
Reasoning     Locked

Unlock — 1 USDso
```

Dialog:

```txt
Unlock David's Prediction

David
Reputation 88
73.4% historical accuracy
64 resolved predictions

Unlock price
1 USDso

[Cancel]
[Unlock Prediction]
```

Transaction status:

```txt
Preparing payment
Waiting for wallet
Submitted
Confirming on Somnia
Unlocked
```

After:

```txt
Prediction Unlocked

David predicts DOWN

Confidence 78%

DreamDEX probability at entry
35%

Reasoning
BTC rejected the local high...
```

Then show:

`Back Prediction`

---

# 26. Back Prediction

Unlocking must NOT automatically trade.

Back Prediction is a separate decision.

Flow:

```txt
Back Prediction

BTC — Next 15 Minutes

David predicted
DOWN

David entered at
35%

Current DreamDEX probability
38%

Your stake
[ 10 ]

[Confirm Trade]
```

Before confirmation:

* refresh market
* ensure market still tradable
* show current price/probability
* never use stale entry probability as execution price

Then execute the follower's actual DreamDEX trade using their own connected wallet.

Record a Back record after success.

---

# 27. Back Record

```ts
BackedPrediction {
  prediction: ObjectId;

  backerAddress: string;

  direction: "UP" | "DOWN";

  stakeAmount: string;

  marketProbabilityAtExecution?: number;

  transactionHash: string;

  orderId?: string;

  status:
    | "CONFIRMED"
    | "FAILED";

  createdAt: Date;
}
```

Use the direction of the original prediction.

Do not allow an API caller to alter it.

---

# 28. Prediction Resolution

NestJS should implement a small settlement service.

Use `@nestjs/schedule`.

A cron job may run approximately every 30–60 seconds.

Process:

```txt
find ACTIVE predictions whose associated market may have ended

→ query current DreamDEX Event Contract state

→ determine whether finalized

→ get final outcome

→ update Prediction

→ calculate isCorrect

→ mark RESOLVED

→ calculate available realized P&L if supported

→ update predictor statistics

→ recompute reputation

→ leaderboard changes automatically
```

Never infer settlement from local timer alone.

DreamDEX/chain state is authoritative.

A countdown reaching `0` means:

```txt
Awaiting settlement
```

not necessarily:

```txt
Resolved
```

---

# 29. Resolved Predictions Become Public

Immediately after resolution:

ALL predictions become publicly readable.

This includes predictions that were previously LOCKED.

Public resolved record:

```txt
BTC DOWN

Prediction DOWN

Confidence 78%

DreamDEX probability at entry
35%

Result
Correct

Status
Resolved
```

If wrong:

```txt
BTC DOWN

Result
Incorrect
```

The predictor cannot delete or hide a failed prediction.

Do not provide a delete-prediction API for resolved records.

---

# 30. Credence Reputation Formula

Implement a transparent deterministic reputation algorithm.

Start every new user at:

```ts
50
```

Range:

```ts
0 <= reputation <= 100
```

Use a Brier-score improvement model against the DreamDEX market probability.

This gives Credence a principled answer to:

> Was the user merely correct, or did they provide a better forecast than the market?

For each resolved binary prediction:

Let:

```txt
m = DreamDEX probability at prediction time for the selected outcome

c = predictor confidence for selected outcome

y = 1 if selected outcome won
y = 0 if selected outcome lost
```

Convert percentages to values between 0 and 1.

Calculate:

```ts
marketBrier = (m - y) ** 2;
predictorBrier = (c - y) ** 2;

improvement = marketBrier - predictorBrier;

delta = improvement * REPUTATION_K;
```

Use:

```ts
REPUTATION_K = 5;
```

Then:

```ts
newScore = clamp(oldScore + delta, 0, 100);
```

Round presentation to an appropriate precision.

Example:

David predicts DOWN.

DreamDEX DOWN probability:

```txt
m = .35
```

David confidence:

```txt
c = .78
```

DOWN wins:

```txt
y = 1

marketBrier =
(.35 - 1)^2
= .4225

predictorBrier =
(.78 - 1)^2
= .0484

improvement =
.3741

delta =
.3741 * 5
= 1.8705
```

So roughly:

```txt
88 → 90
```

This matches the product story:

a correct low-market-probability prediction can create meaningful reputation gains.

If David had confidently been wrong, the score would fall.

This prevents users from gaining reputation merely by choosing random unlikely events repeatedly.

---

# 31. Reputation Recalculation

Prefer deterministic recalculation.

Implement:

```ts
calculateReputation(resolvedPredictions)
```

Starting from 50.

Process predictions chronologically.

This makes the score reproducible and auditable.

Do not make the reputation score an arbitrary manually editable DB number.

After resolution also update:

```txt
resolvedPredictions
correctPredictions
incorrectPredictions
accuracy
realizedPnl
```

Accuracy:

```ts
correct / resolved * 100
```

Avoid division by zero.

---

# 32. Leaderboard

Leaderboard is ordered primarily by:

```txt
reputationScore DESC
```

Tie-breakers:

```txt
resolvedPredictions DESC
accuracy DESC
```

Verified badge determined dynamically.

Return rank in API.

Do not calculate global rank independently in each frontend card.

---

# 33. Demo Data Requirement

Credence requires seeded demo history because no hackathon team can reasonably wait for dozens of markets to resolve before showing a reputation ecosystem.

Implement:

```bash
pnpm seed:demo
```

or equivalent.

Generate approximately:

* 8–12 predictor profiles
* 100+ resolved historical predictions
* wins and losses
* different confidence levels
* different market probabilities
* different P&L
* different resulting reputation scores
* several Verified Predictors
* several normal predictors

Do not make everyone perfect.

---

# 34. Demo Predictor Targets

Aim for data that naturally produces profiles similar to:

```txt
Nova
Reputation ~94
80+ resolved
Verified

Marcus
Reputation ~91
60+ resolved
Verified

David
Reputation ~88
35+ resolved
Verified

Maya
Reputation ~84
30+ resolved
Verified

Theo
Reputation <80
40+ resolved
Not Verified

Luna
Reputation ~74
30+ resolved
Not Verified

Kai
Reputation ~69
25+ resolved
Not Verified
```

Do not manually override the reputation formula just to hit exact numbers.

Generate reasonable histories and use the resulting scores.

---

# 35. Seed Data Integrity

Seeded predictions must use:

```txt
source = DEMO_SEED
```

Never create:

* fake chain transaction hashes
* fake explorer URLs
* fake order IDs
* fake on-chain proofs

Seeded historical P&L can exist as demo history but must remain internally distinguishable.

Live predictions must use:

```txt
source = LIVE
```

README must explain the distinction.

---

# 36. Demo User

The live wallet used during the presentation can begin as a new Credence user:

```txt
Reputation 50
Resolved 0
Not Verified
```

This wallet should be able to:

* inspect David
* inspect his history
* unlock David's active prediction
* reveal it
* Back Prediction
* produce a real DreamDEX transaction

---

# 37. Demo Locked Prediction

The seed/demo system must allow preparing one Verified Predictor with an active locked prediction corresponding to a currently usable DreamDEX Event Contract.

Do not fabricate a fake DreamDEX market if a real active market can be used.

If the active market cannot be reliably seeded because it rotates, provide a developer/demo script that:

1. retrieves a current live DreamDEX Event Contract,
2. creates the demo state around that current market,
3. leaves real trading execution to the connected wallet.

---

# 38. Required API Modules

Create clean Nest modules.

## AuthModule

Endpoints approximately:

```txt
GET  /auth/nonce
POST /auth/verify
POST /auth/logout
GET  /auth/me
```

## MarketsModule

```txt
GET /markets
GET /markets/:marketId
```

Proxy/cache/normalize DreamDEX market data where useful.

## PredictionsModule

```txt
GET  /predictions/feed
GET  /predictions/:id
POST /predictions
GET  /predictions/user/:address
```

No arbitrary edit/delete of resolved predictions.

## UsersModule

```txt
GET /users/:address
GET /users/:address/history
```

## UnlocksModule

```txt
POST /predictions/:id/unlock/prepare
POST /predictions/:id/unlock/confirm
```

## BacksModule

```txt
POST /predictions/:id/backs
GET  /predictions/:id/backs/me
```

## LeaderboardModule

```txt
GET /leaderboard
```

## DemoModule

Development only.

Do not expose dangerous reset/seed operations publicly in production.

---

# 39. Backend Response Format

Use a consistent response shape where practical.

Example:

```ts
{
  data: ...,
  meta?: ...,
}
```

Errors should have:

```ts
{
  statusCode,
  message,
  code?
}
```

Do not leak stack traces to production.

---

# 40. Input Validation

Use DTOs and `class-validator`.

Validate:

* Ethereum address format
* confidence bounds
* stake
* prediction direction
* visibility
* transaction hash
* market ID
* pagination
* allowed enum values

Never trust frontend values.

Use Mongoose indexes.

---

# 41. MongoDB Indexes

At minimum consider:

User:

```txt
walletAddress UNIQUE
reputationScore
```

Prediction:

```txt
predictorAddress + createdAt
marketId + status
status + marketExpiryAt
visibility + status + createdAt
source
```

PredictionUnlock:

```txt
prediction + buyerAddress UNIQUE
transactionHash UNIQUE
```

BackedPrediction:

```txt
transactionHash UNIQUE
backerAddress + createdAt
```

Do not prematurely add dozens of indexes.

---

# 42. No Financial Precision With JS Floating Point

Blockchain token amounts must never use unsafe JS floating-point arithmetic.

Use:

* bigint
* SDK-supported unit helpers
* viem `parseUnits`
* viem `formatUnits`

Persist monetary amounts as strings where appropriate.

Market probabilities may use normal decimal numbers when they are purely 0–1 analytical values.

Do not treat on-chain token base units as Number.

---

# 43. Frontend Transaction UX

Every blockchain action should clearly represent stages.

Use transaction dialogs for:

## Publish & Trade

```txt
Checking market
Preparing transaction
Approval required
Waiting for wallet
Transaction submitted
Confirming
Prediction published
```

## Unlock

```txt
Preparing payment
Waiting for wallet
Payment submitted
Verifying payment
Prediction unlocked
```

## Back

```txt
Refreshing market
Preparing trade
Waiting for wallet
Transaction submitted
Position opened
```

Provide explorer links for REAL transaction hashes.

Never provide explorer links for seeded records.

---

# 44. Error UX

Handle at minimum:

```txt
Wallet not connected
Wrong network
Wallet rejected request
Market expired
Market not tradable
Insufficient funds
Token approval required
Order rejected
RPC error
DreamDEX API unavailable
Payment verification failed
Prediction already unlocked
Prediction already resolved
Backend unavailable
```

Use human-readable errors.

Do not dump raw EVM errors directly into the page.

Keep detailed errors in console/logging during development.

---

# 45. Loading & Empty States

Every major screen must have:

* skeleton/loading
* populated state
* empty state
* error state

No blank screens.

---

# 46. Responsive Design

The entire MVP must be usable around:

```txt
375px mobile
768px tablet
1440px desktop
```

Critical mobile actions:

* connect wallet
* unlock
* prediction creation
* Back Prediction

must remain practical.

Use drawers/sheets for complex mobile dialogs where appropriate.

---

# 47. Accessibility

At minimum:

* semantic buttons
* keyboard navigation
* visible focus states
* labels on form inputs
* sufficient contrast
* do not communicate win/loss through color alone

Use icons/text together.

---

# 48. Environment Variables

Create `.env.example`.

Frontend example:

```txt
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOMNIA_CHAIN_ID=50312
NEXT_PUBLIC_SOMNIA_RPC_URL=
NEXT_PUBLIC_EXPLORER_URL=

NEXT_PUBLIC_DREAMDEX_NETWORK=testnet
```

Backend:

```txt
PORT=4000
NODE_ENV=development

MONGODB_URI=

JWT_SECRET=

WEB_ORIGIN=

SOMNIA_CHAIN_ID=50312
SOMNIA_RPC_URL=

DREAMDEX_NETWORK=testnet
DREAMDEX_API_URL=

UNLOCK_TOKEN_ADDRESS=
UNLOCK_TOKEN_SYMBOL=
UNLOCK_TOKEN_DECIMALS=
UNLOCK_PRICE_BASE_UNITS=
```

Only add other variables once actually required.

Never commit:

* private keys
* production secrets
* JWT secrets
* DB credentials

The backend should not require a trading private key for normal user operations.

---

# 49. Development Logging

Use concise structured logs.

Log:

* market fetch failures
* settlement detection
* transaction verification
* payment verification
* reputation update
* seed execution

Do not log:

* private keys
* auth signatures unnecessarily
* JWT contents
* secrets

---

# 50. Testing Strategy

This is a hackathon MVP, but critical logic must be tested.

Backend unit tests:

## Reputation

Test:

* correct likely prediction
* correct unlikely prediction
* wrong likely prediction
* wrong high-confidence prediction
* clamping at 0
* clamping at 100
* deterministic recomputation

## Verification

Test:

```txt
score 79 / 40 predictions = not verified
score 80 / 24 predictions = not verified
score 80 / 25 predictions = verified
```

## Locked Access

Test:

* anonymous cannot see hidden fields
* unrelated wallet cannot see hidden fields
* buyer with confirmed unlock can see
* creator can see
* everyone can see after resolution

## Payment Verification

Test invalid:

* wrong sender
* wrong recipient
* wrong token
* insufficient amount
* failed tx
* reused tx

## Settlement

Test:

* active remains active
* finalized UP
* finalized DOWN
* void outcome if supported

---

# 51. Frontend Testing

At minimum test core utilities and critical components.

If time permits, add Playwright for:

```txt
connect/auth mock flow
browse feed
open profile
locked prediction display
unlock mocked test flow
Back Prediction dialog
```

Actual wallet confirmation can remain manual in full E2E.

Do not spend half the hackathon creating an enormous automated test system.

---

# 52. Sequential Build Plan

THIS ORDER IS MANDATORY.

Do not jump ahead to polished pages before proving the core integration.

---

# PHASE 0 — Repository Bootstrap

Goal:

Clean working workspace.

Tasks:

1. initialize git repository if required
2. configure pnpm workspace
3. create `apps/web`
4. create `apps/api`
5. create `packages/shared`
6. configure TypeScript
7. install requested dependencies
8. configure Tailwind
9. configure shadcn
10. configure ESLint
11. create `.env.example`
12. create README skeleton
13. confirm:

```bash
pnpm dev
pnpm build
pnpm lint
```

work appropriately.

Do not build product UI yet.

Commit:

```txt
chore: bootstrap credence monorepo
```

---

# PHASE 1 — DREAMDEX PROOF OF INTEGRATION

THIS IS THE MOST IMPORTANT FIRST MILESTONE.

Before building reputation or feeds, prove DreamDEX works.

Research current official Event Contract SDK.

Document findings in:

```txt
docs/DREAMDEX_INTEGRATION.md
```

Include:

* installed SDK version
* testnet config
* available Event Contract listing method
* market object shape
* probability/order-book derivation
* trade execution method
* transaction result shape
* settlement/finalization method
* redemption method if required
* token/collateral decimals
* links to official sources consulted

Build an ugly internal route:

```txt
/dev/dreamdex
```

Development only.

It must:

1. connect wallet
2. switch to Shannon
3. retrieve real Event Contracts
4. show raw relevant market fields
5. choose one
6. execute the smallest valid testnet trade
7. wait for transaction confirmation
8. show tx hash
9. retrieve/read position if supported

DO NOT CONTINUE TO THE FULL APP UNTIL THIS WORKS.

If integration fails:

debug it here.

Do not hide the failure behind mock data.

Success criterion:

> Connected wallet executes at least one genuine DreamDEX Event Contract testnet position from the application.

Commit:

```txt
feat: prove dreamdex event contract integration
```

---

# PHASE 2 — Backend Foundation

Implement:

* Nest config
* Mongo connection
* global validation
* CORS
* error handling
* User model
* Prediction model
* Unlock model
* Back model
* health endpoint

Add:

```txt
GET /health
```

Return:

```json
{
  "status": "ok"
}
```

Implement wallet auth.

Test authentication.

Commit:

```txt
feat: add credence backend foundation
```

---

# PHASE 3 — DreamDEX Domain Adapter

Move tested Phase 1 logic into reusable adapters.

Implement live market reads.

Backend should be able to read Event Contract settlement state without a user key.

Frontend should expose wallet-bound trade calls.

Delete temporary duplicated integration code once abstraction works.

Commit:

```txt
refactor: create dreamdex event contract adapter
```

---

# PHASE 4 — Markets

Build `/markets`.

Use real DreamDEX data.

Implement:

* list
* loading
* errors
* countdown
* underlying
* UP/DOWN probabilities
* status
* select market

No fake market data outside demo/dev fallback.

Commit:

```txt
feat: add live dreamdex markets
```

---

# PHASE 5 — Publish & Trade

Build prediction composer.

Implement:

* direction
* confidence
* stake
* reasoning
* market snapshot
* public visibility for normal predictor
* wallet transaction
* transaction confirmation
* API prediction persistence

Prove:

```txt
real transaction hash
+
Mongo prediction record
```

are linked.

Display new prediction in user's profile.

Commit:

```txt
feat: add publish and trade prediction flow
```

---

# PHASE 6 — Feed + Profiles

Build Home feed.

Build profiles.

Show:

* reputation
* stats
* public active predictions
* resolved history
* win/loss
* market entry probability

Build public DTO protection for locked predictions even if locking is not enabled yet.

Commit:

```txt
feat: add prediction feed and predictor profiles
```

---

# PHASE 7 — Reputation

Implement Brier-based reputation.

Implement stats.

Implement verification rule.

Implement leaderboard.

Add tests.

Commit:

```txt
feat: add verifiable predictor reputation
```

---

# PHASE 8 — Demo Seeder

Implement:

```bash
pnpm seed:demo
```

Seed:

* 8–12 users
* 100+ historical predictions
* realistic wins/losses
* realistic scores
* Verified users

Ensure re-running the command is predictable.

Never overwrite live data accidentally.

Require development/demo environment guard.

Commit:

```txt
feat: add credence demo dataset
```

---

# PHASE 9 — Locked Predictions

Enable locked visibility for Verified users.

Enforce eligibility backend-side.

Ensure hidden fields never leak through API.

Create locked feed/profile cards.

Commit:

```txt
feat: add verified predictor locked insights
```

---

# PHASE 10 — Paid Unlock

Implement actual testnet payment.

Implement prepare/confirm API.

Verify receipt server-side.

Create wallet-specific unlock access.

Test with:

Wallet A = David

Wallet B = Sarah

Wallet B pays.

Wallet B sees prediction.

Wallet C does not.

Commit:

```txt
feat: add onchain paid prediction unlocks
```

---

# PHASE 11 — Back Prediction

Implement real DreamDEX follower trade.

Ensure current market state refreshes before execution.

Show:

```txt
creator entry probability
vs
current probability
```

Use current execution data for Sarah's actual trade.

Persist real transaction.

Commit:

```txt
feat: add back prediction dreamdex execution
```

---

# PHASE 12 — Settlement

Implement settlement polling.

Resolve predictions using DreamDEX state.

Make formerly locked predictions public.

Update:

* correct/incorrect
* P&L where supported
* reputation
* statistics
* leaderboard

Add tests.

Commit:

```txt
feat: add event settlement and reputation updates
```

---

# PHASE 13 — UI POLISH

Only now spend significant time polishing.

Complete:

* responsive layout
* navigation
* skeletons
* empty states
* dialogs
* toasts
* status chips
* countdowns
* transaction UX
* mobile
* profile aesthetics
* leaderboard
* locked/revealed transition

Do not add new product features during polish.

Commit:

```txt
style: polish credence hackathon experience
```

---

# PHASE 14 — Demo Preparation

Prepare two wallets.

Example:

```txt
Wallet A
David / creator

Wallet B
Sarah / viewer
```

Seed historical data.

Ensure David is Verified.

Prepare a usable current locked prediction.

Demo sequence:

```txt
1. Open David profile.

2. Show:
   reputation
   ranking
   wins
   losses

3. Show active locked BTC/ETH prediction.

4. Switch/use Sarah.

5. Press Unlock.

6. Confirm real testnet payment.

7. Reveal:
   direction
   confidence
   reasoning

8. Press Back Prediction.

9. Enter stake.

10. Confirm actual DreamDEX transaction.

11. Show successful tx/explorer.

12. Show an already-resolved example:
    Correct
    88 → 90
    leaderboard movement.
```

Do not wait on camera for a live market to resolve.

Use an already-resolved historical/demo state to explain settlement.

---

# PHASE 15 — Deployment

Recommended:

Frontend:

```txt
Vercel
```

Backend:

```txt
Railway
or
Render
```

Database:

```txt
MongoDB Atlas
```

Configure production CORS.

Set real environment variables.

Verify Shannon configuration.

Test deployed app with fresh browser session.

Test two separate wallets.

---

# PHASE 16 — README

README must contain:

```txt
# Credence

tagline

problem

solution

how it works

architecture

DreamDEX integration

Credence reputation formula

Verified Predictor rule

paid prediction flow

Back Prediction flow

tech stack

testnet network

local setup

environment variables

demo seed instructions

deployment

demo flow

known MVP limitations
```

Explicitly disclose:

> Credence includes demo seed data to populate historical predictor profiles and demonstrate reputation and leaderboard states. Seeded historical predictions are not represented as real DreamDEX transactions. Live Event Contract discovery, supported trading flows, and demonstrated on-chain transactions use the DreamDEX/Somnia testnet integration.

Also disclose:

> Locked predictions are application-level gated content in the MVP. Because DreamDEX positions are executed on a public blockchain, sophisticated observers may be able to infer aspects of on-chain trading activity.

Do not make false privacy claims.

---

# PHASE 17 — FINAL QA

Before considering the project complete, run the full checklist.

## Build

```txt
frontend builds
backend builds
lint passes
tests pass
```

## Wallet

```txt
connect works
disconnect works
wrong chain works
switch network works
auth works
```

## Markets

```txt
real markets load
countdowns work
no hardcoded active market assumptions
```

## Prediction

```txt
normal user can publish
real DreamDEX transaction occurs
prediction persists
profile updates
feed updates
```

## Verification

```txt
<80 cannot lock
<25 resolved cannot lock
>=80 + >=25 can lock
```

## Unlock

```txt
locked fields absent before payment
payment is real
receipt verified
buyer receives access
other wallet does not
```

## Back

```txt
current market refreshed
real DreamDEX trade occurs
real tx saved
```

## Resolution

```txt
correct outcome detected
prediction becomes public
score updates
stats update
leaderboard updates
```

## Demo

```txt
seed script works
leaderboard populated
wins and losses visible
no fake transaction hashes
demo flow completes reliably
```

---

# 53. Features Explicitly OUT OF SCOPE

DO NOT BUILD any of these unless specifically instructed later:

* AI prediction agents
* AI market analysis
* AI-generated reasoning
* automated copy trading
* auto-back
* subscriptions
* creator tiers
* comments
* likes
* reposts
* direct messages
* group prediction rooms
* Prediction Circles
* notifications
* follows unless absolutely trivial after MVP
* advanced charts
* candlestick terminal
* complex portfolio analytics
* custom market creation
* separate prediction-market protocol
* multi-chain
* mobile native application
* NFTs
* governance token
* points token
* referral program
* complex revenue sharing
* ZK privacy
* elaborate smart-contract architecture

Keep the MVP focused.

---

# 54. Coding Standards

Use strict TypeScript.

Avoid:

```ts
any
```

unless interacting with badly typed third-party data and the boundary is documented.

Prefer small functions.

Keep business logic out of controllers/components.

Nest:

```txt
controller
→ service
→ repository/model/integration
```

React:

```txt
page
→ feature component
→ hook/service
```

Do not create 1,000-line files.

Do not prematurely abstract every 5 lines.

Use meaningful names.

---

# 55. Never Fake Success

Do not produce:

```txt
toast.success("Trade completed")
```

unless there is evidence the transaction succeeded.

Do not fake:

* transaction hashes
* wallet balances
* Event Contract outcomes
* DreamDEX positions
* payment confirmations

Demo history may be seeded.

Blockchain integration may NOT be fabricated.

Core rule:

> Seed the history. Do not fake the integration.

---

# 56. When Blocked

If DreamDEX behavior is unclear:

STOP that integration task.

Research:

1. official docs
2. official Bot Kit
3. package source/types
4. existing working current examples

Document findings.

Do not invent an implementation merely to keep moving.

If an old tutorial uses a removed method, do not copy it blindly.

For spot-market examples in particular, note that DreamDEX has changed order APIs over time. Event Contracts must follow the CURRENT Event Contract SDK rather than unrelated/legacy spot examples.

---

# 57. Codex Working Protocol

Work phase-by-phase.

At the beginning of every phase:

1. inspect relevant existing code
2. state internally what must change
3. implement the smallest complete solution
4. run typecheck
5. run relevant tests
6. fix errors
7. manually verify where appropriate
8. update documentation if behavior changed
9. only then proceed

Do not leave:

* TODO placeholders in core flows
* fake API responses
* `console.log` stand-ins
* broken TypeScript
* commented-out failed implementations

Do not rewrite working parts unnecessarily.

---

# 58. Definition of Done

Credence is complete when a judge can perform this experience on the deployed Shannon testnet MVP:

```txt
Connect wallet

→ browse a real DreamDEX Event Contract

→ create a prediction

→ Publish & Trade

→ sign a real DreamDEX transaction

→ prediction appears in Credence

→ inspect seeded predictors with meaningful histories

→ inspect a Verified Predictor

→ see an active locked prediction

→ pay through wallet to unlock it

→ reveal prediction

→ press Back Prediction

→ sign another real DreamDEX trade

→ see successful position

→ inspect resolved prediction history

→ understand reputation calculation

→ inspect leaderboard
```

The product should communicate within approximately two minutes:

> Great predictors should not need millions of followers to monetize what they know. They should need proof that they are good at predicting.

> Credence turns DreamDEX Event Contract performance into that proof.

Final screen:

> DreamDEX shows what the market believes.

> Credence shows you who actually knows.











Hackathon Explanation and things to take note of.
Introduction
Build the next generation of prediction market experiences on DreamDEX.

Somnia, in collaboration with DreamDEX, invites developers, AI engineers, Web3 builders, and trading application teams to build innovative products powered by DreamDEX Event Contracts.

The Somnia × DreamDEX Event Contracts Hackathon is designed to accelerate the adoption of Event Contracts by giving builders the tools, infrastructure, and support to create new prediction market experiences.

Build consumer-facing trading applications, AI-powered trading agents, analytics tools, social prediction products, or entirely new experiences that showcase what can be built with DreamDEX Event Contracts.

Timeline
Registrations open - 18th Aug

Submission Timeline - 25th Aug - 8th Sep

Prizes
$5,000 USDso Prize Pool

Build innovative applications and compete for a share of the $5,000 USDso prize pool.

Beyond the prize pool, top teams may receive:

Social media spotlight
Opportunity to showcase their project to the Somnia community
Featured placement in the Somnia Discord showcase series
Eligibility
The hackathon is open to developers and teams from around the world.

We especially welcome:

AI and AI-agent web3 developers
Trading application developers
Full-stack developers
Product-focused builders
Developers interested in prediction markets and on-chain trading
You can participate individually or as a team.

We encourage experienced builders to create production-ready applications rather than simple proof-of-concept.

What to Build
Your project should demonstrate a meaningful use of DreamDEX Event Contracts and create a useful, innovative, or engaging experience for users.

Projects should ideally demonstrate:

A working prototype
Integration with DreamDEX Event Contracts
Meaningful use of DreamDEX APIs and/or SDKs
A clear and intuitive user experience
Potential for user adoption, trading activity, or ecosystem impact
Submission Guidelines
Each team should submit:

Working prototype on testnet
GitHub repository
2–3 minute demo video
Optional:

Presentation deck
A feedback report regarding SDK and documentation
Judging criteria
Innovation & Originality — 20%
How novel is the idea? Does the project use Event Contracts creatively to solve a real-world problem?

Technical Implementation — 25%
How effectively does the project use DreamDEX Event Contracts and available APIs/SDKs? How strong and functional is the technical implementation?

User Experience & Design — 20%
How intuitive, accessible, and usable is the product? Does it provide a compelling overall user experience?

Business & Ecosystem Impact — 20%
Does the project have the potential to:

Attract new users
Generate trading activity
Increase Event Contracts adoption
Expand the DreamDEX ecosystem
Create a sustainable product or use case
Presentation & Demo — 15%
How clearly does the team communicate:

The problem
The solution
The product
The demonstration
The future vision
Developer Resources
DreamDEX Bot Kit - https://github.com/somnia-chain/dreamdex-bot-kit
Setup you bot through DreamDex Bot Builder
Complete Documentation - https://docs.dreamdex.io/developers/event-contracts
Starter Template- https://github.com/IronicDeGawd/ec-dreamdex-hackathon-template
Contact Us
Pls join our global telegram dev community for important updates and queries related to the hacakthon https://t.me/+XHq0F0JXMyhmMzM0

You can also request test STT tokens from here.

About us
Somnia is a high-performance, EVM-compatible Layer 1 built to power the next generation of on-chain applications.

Through its collaboration with DreamDEX, Somnia is supporting developers building new experiences around Event Contracts, prediction markets, trading, and agentic applications.

This hackathon is an opportunity for builders to experiment with the technology, bring new users and use cases into the ecosystem, and create products with potential for continued development beyond the hackathon.