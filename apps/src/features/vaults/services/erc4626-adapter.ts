import {
  type Address,
  encodeFunctionData,
  type Log,
  type PublicClient,
  parseEventLogs,
} from "viem";
import { z } from "zod";
import { erc4626Abi } from "../../chain/abis/erc4626.ts";
import {
  MONAD_TOKENS,
  type MonadTokenSymbol,
} from "../../chain/config/tokens.ts";
import type { Erc4626Venue } from "../config/venues.ts";
import { UnknownMarketError } from "../errors.ts";
import type {
  MarketRead,
  PolicyCall,
  PriceOf,
  VaultAdapter,
  VenueCalls,
  VenueHolding,
} from "../types.ts";
import { RAY } from "../utils/aave-math.ts";

const MORPHO_API = "https://api.morpho.org/graphql";
const MONAD_CHAIN_ID = 143;
const PERCENT = 100;
const APY_REVALIDATE_SECONDS = 300;

const ERC4626_POLICY_CALLS: PolicyCall[] = [
  {
    rule: "Vault deposit to self",
    abi: erc4626Abi,
    functionName: "deposit",
    selfFields: ["deposit.receiver"],
  },
  {
    rule: "Vault redeem to self",
    abi: erc4626Abi,
    functionName: "redeem",
    selfFields: ["redeem.receiver", "redeem.owner"],
  },
];

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

function vaultOf(venue: Erc4626Venue, symbol: string): Address {
  const vault = venue.vaults[symbol as MonadTokenSymbol];
  if (!vault) throw new UnknownMarketError(venue.name, symbol);
  return vault;
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function mintedShares(logs: Log[], vault: Address, owner: Address): bigint {
  return parseEventLogs({ abi: erc4626Abi, eventName: "Deposit", logs })
    .filter(
      (log) =>
        sameAddress(log.address, vault) && sameAddress(log.args.owner, owner),
    )
    .reduce((sum, log) => sum + log.args.shares, 0n);
}

export function erc4626Calls(venue: Erc4626Venue): VenueCalls {
  return {
    venue,
    exitStepKind: "redeem",
    callTarget: (symbol) => vaultOf(venue, symbol),
    callTargets: () => Object.values(venue.vaults),
    policyCalls: () => ERC4626_POLICY_CALLS,
    supplyTransaction: (symbol, amount, owner) => ({
      to: vaultOf(venue, symbol),
      data: encodeFunctionData({
        abi: erc4626Abi,
        functionName: "deposit",
        args: [amount, owner],
      }),
    }),
    exitTransaction: (symbol, amount, owner) => ({
      to: vaultOf(venue, symbol),
      data: encodeFunctionData({
        abi: erc4626Abi,
        functionName: "redeem",
        args: [amount, owner, owner],
      }),
    }),
    exitAmount: (units) => units,
  };
}

function toMarketRead(
  symbol: MonadTokenSymbol,
  totalAssets: bigint,
  apy: number,
  price: number,
): MarketRead {
  const decimals = MONAD_TOKENS[symbol].decimals;
  const tvlUsd = (Number(totalAssets) / 10 ** decimals) * price;
  return {
    assetSymbol: symbol,
    apy,
    tvlUsd,
    liquidityUsd: tvlUsd,
    priceUsd: price,
  };
}

async function readMarkets(
  client: PublicClient,
  venue: Erc4626Venue,
  priceUsd: PriceOf,
): Promise<MarketRead[]> {
  const entries = vaultEntries(venue);
  const [apys, totals] = await Promise.all([
    readMorphoApys(entries.map(([, address]) => address)),
    Promise.all(
      entries.map(([, address]) =>
        client.readContract({
          address,
          abi: erc4626Abi,
          functionName: "totalAssets",
        }),
      ),
    ),
  ]);
  return entries.flatMap(([symbol, address], position) => {
    const price = priceUsd(symbol);
    if (price === undefined) return [];
    const apy = apys.get(address.toLowerCase()) ?? 0;
    return [toMarketRead(symbol, totals[position], apy, price)];
  });
}

function convertToAssets(client: PublicClient, vault: Address, shares: bigint) {
  return client.readContract({
    address: vault,
    abi: erc4626Abi,
    functionName: "convertToAssets",
    args: [shares],
  });
}

async function readHolding(
  client: PublicClient,
  vault: Address,
  owner: Address,
): Promise<VenueHolding> {
  const shares = { address: vault, abi: erc4626Abi, args: [owner] } as const;
  const [heldUnits, maxUnits, rateRay] = await Promise.all([
    client.readContract({ ...shares, functionName: "balanceOf" }),
    client.readContract({ ...shares, functionName: "maxRedeem" }),
    convertToAssets(client, vault, RAY),
  ]);
  const availableAssets = await convertToAssets(client, vault, maxUnits);
  return { heldUnits, maxUnits, availableAssets, rateRay };
}

export function erc4626Adapter(
  venue: Erc4626Venue,
  client: PublicClient,
): VaultAdapter {
  return {
    ...erc4626Calls(venue),
    readMarkets: (priceUsd) => readMarkets(client, venue, priceUsd),
    rate: (symbol) => convertToAssets(client, vaultOf(venue, symbol), RAY),
    readHolding: (owner, symbol) =>
      readHolding(client, vaultOf(venue, symbol), owner),
    unitsBefore: async () => null,
    suppliedUnits: async (change) =>
      mintedShares(
        change.receipt.logs,
        vaultOf(venue, change.assetSymbol),
        change.owner,
      ),
    burnedUnits: async (change) => change.amount,
  };
}
