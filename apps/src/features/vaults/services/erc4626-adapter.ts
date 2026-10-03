import "server-only";
import type { Address } from "viem";
import { z } from "zod";
import { erc4626Abi } from "@/features/chain/abis/erc4626";
import {
  MONAD_TOKENS,
  type MonadTokenSymbol,
} from "@/features/chain/config/tokens";
import { monadClient } from "@/features/chain/services/public-client";
import type { Erc4626Venue } from "../config/venues";
import type { MarketRead, PositionRead, VaultAdapter } from "../types";

const MORPHO_API = "https://api.morpho.org/graphql";
const MONAD_CHAIN_ID = 143;
const PERCENT = 100;
const APY_REVALIDATE_SECONDS = 300;

const morphoResponseSchema = z.object({
  data: z.object({
    vaults: z.object({
      items: z.array(
        z.object({
          address: z.string(),
          state: z.object({ netApy: z.number().nullable() }).nullable(),
        }),
      ),
    }),
  }),
});

async function readMorphoApys(
  addresses: Address[],
): Promise<Map<string, number>> {
  const query = `{ vaults(where: { chainId_in: [${MONAD_CHAIN_ID}], address_in: ${JSON.stringify(addresses)} }) { items { address state { netApy } } } }`;
  const response = await fetch(MORPHO_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
    next: { revalidate: APY_REVALIDATE_SECONDS, tags: ["vaults"] },
  });
  if (!response.ok) throw new Error(`Morpho API ${response.status}`);
  const parsed = morphoResponseSchema.parse(await response.json());
  return new Map(
    parsed.data.vaults.items.map((item) => [
      item.address.toLowerCase(),
      (item.state?.netApy ?? 0) * PERCENT,
    ]),
  );
}

function vaultEntries(venue: Erc4626Venue): [MonadTokenSymbol, Address][] {
  return Object.entries(venue.vaults) as [MonadTokenSymbol, Address][];
}

export class Erc4626Adapter implements VaultAdapter {
  constructor(
    readonly venue: Erc4626Venue,
    private readonly priceUsd: (symbol: string) => number | undefined,
  ) {}

  async readMarkets(): Promise<MarketRead[]> {
    const entries = vaultEntries(this.venue);
    const [apys, totals] = await Promise.all([
      readMorphoApys(entries.map(([, address]) => address)),
      monadClient().multicall({
        allowFailure: false,
        contracts: entries.map(([, address]) => ({
          address,
          abi: erc4626Abi,
          functionName: "totalAssets" as const,
        })),
      }),
    ]);
    return entries.flatMap(([symbol, address], position) => {
      const price = this.priceUsd(symbol);
      if (price === undefined) return [];
      const token = MONAD_TOKENS[symbol];
      const tvlUsd = (Number(totals[position]) / 10 ** token.decimals) * price;
      return [
        {
          assetSymbol: symbol,
          apy: apys.get(address.toLowerCase()) ?? 0,
          tvlUsd,
          liquidityUsd: tvlUsd,
          priceUsd: price,
        },
      ];
    });
  }

  async readPosition(
    user: Address,
    assetSymbol: string,
  ): Promise<PositionRead> {
    const vault = this.venue.vaults[assetSymbol as MonadTokenSymbol];
    if (!vault) return { units: 0n, assets: 0n };
    const units = await monadClient().readContract({
      address: vault,
      abi: erc4626Abi,
      functionName: "balanceOf",
      args: [user],
    });
    const assets = await monadClient().readContract({
      address: vault,
      abi: erc4626Abi,
      functionName: "convertToAssets",
      args: [units],
    });
    return { units, assets };
  }
}
