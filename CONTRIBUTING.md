# Contributing to Credence

## Principles

- Preserve exact DreamDEX window identity. Never replace a market by symbol,
  duration, pool, or a successor ID.
- Do not invent SDK methods, addresses, quotes, fills, receipts, or settlement.
- Keep the server draft authoritative for pre-expiry forecast existence.
- Treat retry paths as financial paths: they must reuse evidence and avoid a
  second trade or new signer nonce.
- Keep locked fields out of unauthorized API DTOs.
- Keep demo and LIVE evidence visibly distinct.
- Make focused changes and leave unrelated user work untouched.

## Repository workflow

1. Read [the documentation index](docs/README.md) and relevant source modules.
2. State the invariant the change must preserve.
3. Add or update a regression test before declaring a lifecycle fix complete.
4. Prefer pure helpers for economic/state rules and keep chain verification at
   API boundaries.
5. Update docs when routes, schemas, state transitions, configuration, or
   operator behavior change.
6. Review the diff for secrets, generated noise, and unrelated edits.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
forge test --root contracts
git diff --check
```

If a tool is unavailable, report that explicitly. Do not claim an unrun check
passed. Chain-dependent smoke tests require Shannon test tokens and explicit
operator authorization; unit tests must not depend on live balances.

## Commit hygiene

Use concise, outcome-oriented commits. Never add `.env.local`, private operation
artifacts, raw signed transactions, database backups, or wallet keys. Before
pushing, inspect `git status`, staged filenames, and the staged diff.

## Documentation style

Document verified behavior and limitations, not aspirations. Use exact names for
states, routes, environment variables, contracts, and ownership boundaries.
Examples must be obviously synthetic unless they point to a real, cited public
resource. Avoid embedding secrets or presenting testnet behavior as mainnet-ready.
