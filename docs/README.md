# Credence technical documentation

This directory documents the behavior implemented in this repository. When a
document and the code disagree, the code is authoritative and the document
should be corrected in the same change.

## Start here

| Audience | Read first | What it answers |
| --- | --- | --- |
| Evaluator or new contributor | [Architecture](ARCHITECTURE.md) | What runs where, who owns each fact, and what is trusted? |
| Frontend/API engineer | [Prediction lifecycle](PREDICTION_LIFECYCLE.md) | Which transitions are legal and how are retries made safe? |
| API consumer | [API reference](API_REFERENCE.md) | Which endpoints exist and which data is authenticated or redacted? |
| Security reviewer | [Security model](SECURITY.md) | What is protected, what is assumed, and where are the remaining risks? |
| Operator | [Operations runbook](OPERATIONS.md) | How is Credence configured, deployed, monitored, and recovered? |
| Anyone debugging a failure | [Troubleshooting](TROUBLESHOOTING.md) | What does an error mean and what is the safe next action? |

## Source map

| Concern | Canonical implementation |
| --- | --- |
| Shared API types and escrow ABI | `packages/shared/src/` |
| Wallet connection and UI | `apps/web/app/providers.tsx`, `apps/web/lib/wagmi.ts` |
| Publication recovery | `apps/web/components/prediction-composer.tsx`, `apps/web/lib/publish-once.ts` |
| Authentication | `apps/api/src/auth/` |
| Prediction rules and DTO redaction | `apps/api/src/predictions/` |
| DreamDEX discovery and verification | `apps/api/src/dreamdex/` |
| Resolution and accounting | `apps/api/src/settlement/`, `apps/api/src/reputation/` |
| Insight access and refunds | `apps/api/src/unlocks/`, `contracts/src/InsightEscrow.sol` |
| Operator scripts | `scripts/` |

## Documentation guarantees

- Contract addresses and transaction hashes are configuration or deployment
  outputs, never invented examples presented as live facts.
- A DreamDEX market is identified by its exact bytes32 ID and stored window
  contract. A symbol, title, expiry duration, or pool alone is not identity.
- Demo history is labeled `DEMO_SEED` and is not represented as wallet-proven
  live performance.
- “Realized P&L,” “settled P&L,” and wallet balance are distinct concepts.
- No operation requiring a private key should print that key or place it in a
  `NEXT_PUBLIC_*` variable.

## Keeping the docs current

Changes to a route, state transition, environment variable, contract method,
worker safety property, or public response shape should update the relevant
document. Run the repository verification commands in [CONTRIBUTING.md](../CONTRIBUTING.md)
before merging.
