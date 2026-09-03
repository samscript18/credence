# DreamDEX Event Contract integration

Verified on 2 September 2026. Phase 1 is complete: a connected browser wallet executed a real DreamDEX Event Contract trade on Somnia Shannon, and the receipt and token movements were independently confirmed through the Shannon RPC.

## Installed SDK

- Package: `@somnia-chain/markets-sdk`
- Installed version: `0.29.0`
- Official minimum for current Event Contract examples: `0.28.0`
- Generic EVM and wallet transport: `viem` `2.56.3` through `wagmi` `3.7.7`

The installed package includes TypeScript declarations and readable source. The implementation was checked against its `README.md`, `src/unified/exchange.ts`, `src/somniaMarketsClient.ts`, `src/trade.ts`, `src/orders.ts`, `src/binary/settlement.ts`, `src/addresses.ts`, and Shannon chain definition.

## Shannon testnet configuration

| Item | Verified value/source |
| --- | --- |
| Chain | `somniaShannon` exported by `@somnia-chain/markets-sdk/chains` |
| Chain ID | `50312` |
| HTTP RPC | `https://dream-rpc.somnia.network` (environment-driven in Credence) |
| SDK WebSocket RPC | `wss://api.infra.testnet.somnia.network/ws` |
| Indexer | `https://dev.smk.somnia.host/v1/graphql` |
| Explorer | `https://shannon-explorer.somnia.network` |
| Protocol addresses | `SOMNIA_TESTNET_ADDRESSES` exported by the installed SDK |
| Collateral | tUSDC, read from each market/on-chain snapshot |
| Testnet collateral decimals | `6`, confirmed by a live `getMarketOnchain` response |

Credence does not copy market or pool addresses. Both are dynamic per Event Contract, and pools are recycled. Protocol addresses are supplied by the installed SDK's generated deployment manifest rather than transcribed into application code.

## Market discovery and object shape

For the Phase 1 browser proof, `SomniaMarkets.loadMarkets(true)` returns a symbol-keyed `Record<string, UnifiedMarket>`. Event Contracts are the entries where:

```ts
market.active && isBinaryMarket(market.info)
```

The current unified binary shape includes:

- top-level `id`, `symbol`, `active`, `precision`, `limits`, and two `outcomes` (`YES` index `0`, `NO` index `1`);
- `info.marketId` (`bytes32` identity), `poolAddress`, `marketAddress`, `venueId`, `operatorId`;
- typed `asset`, `intervalSec`, `tradingStart`, `expiry`, `status`, and `strike`;
- `collateral`, `baseDecimals`, and `quoteDecimals`.

The binary-only read surface also exposes `client.listLiveBinaryMarkets({ ...filters })`. Production adapters can use it when they do not need the unified symbol registry.

A live read-only probe returned real BTC and ETH markets across the current 1-minute, 5-minute, and 15-minute series. It also demonstrated why venue scope must be explicit in the domain adapter: current live rows span more than one `venueId`.

## On-chain status and lifecycle

The indexer is discovery/history, not the write authority. Immediately before a write, Credence calls:

```ts
exchange.client.getMarketOnchain(market.info.marketId)
```

The verified numeric lifecycle is:

| Value | Status |
| --- | --- |
| `0` | Listed |
| `1` | Trading |
| `2` | Locked |
| `3` | Settling (normally transient) |
| `4` | Resolved |
| `5` | Voided |

Only status `1` accepts orders. A countdown reaching zero is not settlement evidence.

`MarketOnchain` supplies the current generation's pool, market contract, ERC-6909 outcome-token contract, `yesId`, `noId`, collateral, decimals, expiry, status, finalization flags, and winning outcome. Credence reuses one validated snapshot for the write and immediate balance reads so a recycled pool cannot cross market generations mid-operation.

## Probability and order-book derivation

The YES/UP outcome symbol is `market.outcomes[0].symbol`; NO/DOWN is index `1`. `exchange.fetchOrderBook(yesSymbol, depth)` returns human-unit bids and asks.

One order book represents both outcomes. Prices are YES probabilities in `(0, 1)`; a NO probability is the complement (`1 - YES`). The current SDK reads the pool grid and snaps unified prices and quantities to the venue tick/lot sizes. A quantity below one lot is rejected before broadcast.

The Phase 1 proof selects the venue minimum from `market.limits.amount.min`, crosses the current YES ask with a protective limit, and explicitly requests IOC so no unfilled remainder rests with collateral escrowed.

## Browser trade execution

User trades are wallet-signed. Credence constructs a read-only exchange at application startup and binds the connected viem `walletClient` only after the wallet is on Shannon:

```ts
exchange.setSigner({ walletClient });
```

The verified unified call is:

```ts
exchange.createOrder(
  yesSymbol,
  "limit",
  "buy",
  minimumLot,
  protectivePrice,
  { timeInForce: "IOC" },
);
```

The SDK auto-checks/requests the ERC-20 collateral approval when needed. It waits for the transaction receipt and, on supported versions, throws decoded contract reverts.

The unified return is `UnifiedOrder`. Its real transaction result is in `order.info as PlaceOrderResult`, not on `order.receipt`. Relevant fields are:

- `result.hash` and `result.receipt`;
- optional `result.orderId`;
- `result.fills`;
- unified `order.filled`, `order.amount`, `order.status`, and `order.txHash`.

The proof rejects any receipt whose status is not `success`, displays a Shannon explorer link only for the real returned hash, and then reads the wallet's YES/NO ERC-6909 balances with `client.getOutcomeBalance(...)`.

## Testnet collateral faucet

The testnet collateral contract exposes `faucet(uint256)`. The SDK method is:

```ts
exchange.trader.faucet({ amount: 10n * 10n ** 6n });
```

The Phase 1 page provides this as a separate wallet transaction. It does not assume mainnet USDso decimals or conflate tUSDC with real USD value.

## Settlement and redemption

Settled Event Contracts disappear from `loadMarkets()`. Scan them through:

```ts
exchange.client.listBinaryMarkets({
  venueId,
  status: "Finalized",
});
```

Resolution/finalization is read from `getMarketOnchain(marketId)`. For redemption use the raw trader with an explicit outcome index, especially for voids:

```ts
exchange.trader.redeem({
  marketId,
  market: onchain.marketAddress,
  outcomeToken: onchain.outcomeToken,
  outcomeIdx: 0, // YES/UP; 1 is NO/DOWN
  amount,
});
```

Resolved winners redeem through the settlement rail. A void pays both sides at `0.5`, so each held outcome must be redeemed explicitly. Losing-side redemption can succeed while paying zero, so Credence must determine the outcome first. DreamDEX currently configures maker, taker, and settlement fees to zero, but later code should read rather than assume venue fee data where payout math is displayed.

## Phase 1 verification record

Completed automatically:

- official documentation, Bot Kit Event Contract core/starter, hackathon starter, and installed package source inspected;
- SDK `0.29.0` installed;
- live indexer returned current Event Contracts;
- live WebSocket RPC returned an authoritative status-`1` market snapshot;
- returned collateral and decimals matched the SDK deployment data;
- development-only wallet route implemented without private keys or mocked success.

Connected-wallet hard gate completed:

| Evidence | Confirmed value |
| --- | --- |
| Transaction | [`0xc5d0e4496c60c7da06e8efccfcdc16e8ec1ed05e13fcf3ef71fe25e7c9053478`](https://shannon-explorer.somnia.network/tx/0xc5d0e4496c60c7da06e8efccfcdc16e8ec1ed05e13fcf3ef71fe25e7c9053478) |
| Chain ID | `50312` (Somnia Shannon) |
| Block | `478029324` |
| Sender | `0x421ab98aeb38cb022fe80d5bd1da7ea404bdd90b` |
| Event Contract pool | `0xa34e33f71c566134ceecdd6869bcc693b3d69c17` |
| Receipt | `success` |
| Gas used | `828682` |
| DreamDEX order ID | `166020696663386069640` |
| Filled quantity | `0.001` |
| Post-trade outcome balances | YES `1000` base units, NO `0` |

The Shannon receipt contains the expected tUSDC ERC-20 transfer logs and an ERC-6909 outcome-token transfer for `1000` base units, alongside the pool's order/fill events. This verifies that the result came from an actual DreamDEX Event Contract execution rather than a UI-only success state. No private key entered the application or repository; the connected user wallet signed the transaction.

Phase 2 may proceed because the mandatory real-transaction gate has passed.

## Official/current sources consulted

- [DreamDEX Event Contracts](https://docs.dreamdex.io/developers/event-contracts)
- [DreamDEX Event Contract recipes](https://docs.dreamdex.io/developers/event-contracts/recipes)
- [Market structure and lifecycle](https://docs.dreamdex.io/developers/event-contracts/market-structure)
- [Contracts and addresses](https://docs.dreamdex.io/developers/event-contracts/contracts-and-addresses)
- [Event Contract gotchas](https://docs.dreamdex.io/developers/event-contracts/gotchas)
- [`@somnia-chain/markets-sdk` on npm](https://www.npmjs.com/package/@somnia-chain/markets-sdk)
- [Official DreamDEX Bot Kit Event Contract guide](https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/event-contracts.md)
- [Official Bot Kit Event Contract core](https://github.com/somnia-chain/dreamdex-bot-kit/tree/main/packages/ec-core/src)
- [Official Bot Kit Event Contract starter](https://github.com/somnia-chain/dreamdex-bot-kit/tree/main/strategies/ec-starter)
- [Hackathon Event Contract starter template](https://github.com/IronicDeGawd/ec-dreamdex-hackathon-template)
