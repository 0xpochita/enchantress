import "server-only";
import { unstable_cache } from "next/cache";
import { ORIGIN_CHAINS } from "@/config/chains";
import { MONAD_TOKENS } from "@/features/chain/config/tokens";
import { type BridgeCatalog, buildBridgeCatalog } from "../utils/catalog";
import { fetchAuroraTokens, isAuroraConfigured } from "./aurora-client";

const CATALOG_REVALIDATE_SECONDS = 300;

export const MONAD_USDC_ASSET_ID =
  "nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx";

export const MONAD_USDT0_ASSET_ID =
  "nep245:v2_1.omni.hot.tg:143_4EJiJxSALvGoTZbnc8K7Ft9533et";

export const MONAD_DIRECT_ASSETS: Record<string, "USDC" | "USDT0"> = {
  [MONAD_USDC_ASSET_ID]: "USDC",
  [MONAD_USDT0_ASSET_ID]: "USDT0",
};

export interface BridgeTokenDetail {
  assetId: string;
  chainId: string;
  symbol: string;
  decimals: number;
  contractAddress: string | null;
  priceUsd: number;
}

export interface BridgeSource {
  catalog: BridgeCatalog;
  details: Record<string, BridgeTokenDetail>;
}

const chainsForCatalog = ORIGIN_CHAINS.map(
  ({ id, name, iconKey, auroraCode }) => ({
    id,
    name,
    iconKey,
    auroraCode,
  }),
);

function fallbackSource(): BridgeSource {
  const usdc = MONAD_TOKENS.USDC;
  const token = {
    assetId: MONAD_USDC_ASSET_ID,
    blockchain: "monad",
    symbol: usdc.symbol,
    price: 1,
    decimals: usdc.decimals,
    contractAddress: usdc.address,
  };
  return {
    catalog: buildBridgeCatalog(chainsForCatalog.slice(0, 1), [token]),
    details: {
      [MONAD_USDC_ASSET_ID]: {
        assetId: MONAD_USDC_ASSET_ID,
        chainId: "monad",
        symbol: usdc.symbol,
        decimals: usdc.decimals,
        contractAddress: usdc.address,
        priceUsd: 1,
      },
    },
  };
}

const cachedAuroraTokens = unstable_cache(
  fetchAuroraTokens,
  ["aurora-tokens"],
  {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: ["aurora-tokens"],
  },
);

export async function getBridgeSource(): Promise<BridgeSource> {
  if (!isAuroraConfigured()) return fallbackSource();
  const tokens = await cachedAuroraTokens();
  const catalog = buildBridgeCatalog(chainsForCatalog, tokens);
  const byChainCode = new Map(ORIGIN_CHAINS.map((c) => [c.auroraCode, c.id]));
  const details: Record<string, BridgeTokenDetail> = {};
  for (const token of tokens) {
    const chainId = byChainCode.get(token.blockchain);
    if (!chainId) continue;
    details[token.assetId] = {
      assetId: token.assetId,
      chainId,
      symbol: token.symbol,
      decimals: token.decimals,
      contractAddress: token.contractAddress ?? null,
      priceUsd: token.price,
    };
  }
  return { catalog, details };
}

export async function getBridgeTokenDetail(
  assetId: string,
): Promise<BridgeTokenDetail | undefined> {
  return (await getBridgeSource()).details[assetId];
}
