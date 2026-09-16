# DreamDEX Auto-Claim

Auto-Claim is an explicit, per-prediction opt-in. After a prediction trade has a verified fill, the owner:

1. grants the DreamDEX binary module an ERC-6909 allowance for that prediction's exact outcome ID and filled amount;
2. signs DreamDEX's EIP-712 `RedeemAuthorization` for the exact owner, market, side, amount, nonce and deadline;
3. sends the signed authorization to Credence, where the signature is encrypted at rest.

No private key is stored. The authorization does not change the payout recipient: DreamDEX `redeemFor` pays the signed owner. KeeperHub supplies the executor and transaction gas through its Direct Contract Call API.

## Execution safety

The API discovers resolved records, but onchain state is the execution authority. Immediately before submission it verifies the exact market address, final state, payout vector, outcome ID, owner balance, authorization deadline and exact allowance. It repeats the read before calling KeeperHub and refuses if the position changed.

Each economic redemption has one durable Mongo execution key. KeeperHub receives the same key as `Idempotency-Key`. Credence retains the execution record after KeeperHub's 24-hour replay window, and never automatically resubmits an unknown outcome after the safe replay period.

KeeperHub success alone does not mark a claim verified. Credence verifies the `redeemFor` calldata, successful receipt, exact outcome-token decrease, collateral transfer and balance increase at the owner, and absence of collateral payout to the executor. Only then does the existing claim-accounting path record realized P&L. The manual `redeem` path remains available outside an in-flight KeeperHub execution.

## Shannon allowance test

The deployed Shannon contracts were tested on an isolated Anvil fork at market `0x000000000000000000000000000000000000000000000000000000000001c1c1`, immediately after its resolution block. No transaction was broadcast to Shannon.

- `redeemFor` with neither allowance nor operator grant reverted with selector `0xdeda9030`.
- `approve(binaryModule, outcomeId, amount)` set an allowance for only that outcome ID.
- `isOperator(owner, binaryModule)` remained `false`.
- With only the outcome-specific allowance, the exact signed `redeemFor` simulated and executed successfully on the fork, and the owner's outcome balance decreased by the signed amount.

Credence therefore requests the narrower outcome-specific allowance. It also accepts a pre-existing global operator grant when reading legacy owner state, because the deployed module accepts either permission form.

## Configuration

Set `ENABLE_AUTO_CLAIM=true` only with:

- `KEEPERHUB_API_URL`: HTTPS KeeperHub deployment URL.
- `KEEPERHUB_API_KEY`: organization API key allowed to use direct contract calls.
- `AUTO_CLAIM_ENCRYPTION_KEY`: 32 random bytes encoded as 64 hexadecimal characters.
- `AUTO_CLAIM_AUTH_TTL_SECONDS`: signature lifetime, between one hour and 90 days.
