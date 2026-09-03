"use client";

import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

export const DREAMDEX_INDEXER_URL = "https://dev.smk.somnia.host/v1/graphql";
export const DREAMDEX_WS_RPC_URL = "wss://api.infra.testnet.somnia.network/ws";

let exchange: SomniaMarkets | undefined;

export function getDreamDexExchange(): SomniaMarkets {
  exchange ??= new SomniaMarkets({
    indexerUrl: DREAMDEX_INDEXER_URL,
    chain: somniaShannon,
    wsRpcUrl: DREAMDEX_WS_RPC_URL,
    // These are generated from the package's release-time deployment manifests.
    // Credence never copies or invents protocol/market addresses.
    addresses: SOMNIA_TESTNET_ADDRESSES,
  });
  return exchange;
}
