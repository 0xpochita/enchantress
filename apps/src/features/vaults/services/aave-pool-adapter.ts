import {
  type Address,
  encodeFunctionData,
  erc20Abi,
  maxUint256,
  type PublicClient,
  parseAbi,
} from "viem";
import {
  aaveDataProviderAbi,
  aaveOracleAbi,
  aavePoolAbi,
  aTokenAbi,
} from "../../chain/abis/aave.ts";
import {
  MONAD_TOKENS,
  type MonadTokenSymbol,
} from "../../chain/config/tokens.ts";
import type { AavePoolVenue } from "../config/venues.ts";
import type {
  MarketRead,
  PolicyCall,
  UnitsChange,
  VaultAdapter,
  VenueCalls,
  VenueHolding,
} from "../types.ts";
import { baseUnitsToUsd, RAY, rayRateToApy } from "../utils/aave-math.ts";

const normalizedIncomeAbi = parseAbi([
  "function getReserveNormalizedIncome(address asset) view returns (uint256)",
]);

function assetAddress(symbol: string): Address {
  return MONAD_TOKENS[symbol as MonadTokenSymbol].address;
}

const AAVE_POLICY_CALLS: PolicyCall[] = [
  {
    rule: "Aave supply to self",
    abi: aavePoolAbi,
    functionName: "supply",
    selfFields: ["supply.onBehalfOf"],
  },
  {
    rule: "Aave withdraw to self",
    abi: aavePoolAbi,
    functionName: "withdraw",
    selfFields: ["withdraw.to"],
  },
];

export function aavePoolCalls(venue: AavePoolVenue): VenueCalls {
  const to = venue.pool;
  return {
    venue,
    exitStepKind: "withdraw",
    callTarget: () => to,
    callTargets: () => [to],
    policyCalls: () => AAVE_POLICY_CALLS,
    supplyTransaction: (symbol, amount, owner) => ({
      to,
      data: encodeFunctionData({
        abi: aavePoolAbi,
        functionName: "supply",
        args: [assetAddress(symbol), amount, owner, 0],
      }),
    }),
    exitTransaction: (symbol, amount, owner) => ({
      to,
      data: encodeFunctionData({
        abi: aavePoolAbi,
        functionName: "withdraw",
        args: [assetAddress(symbol), amount, owner],
      }),
    }),
    exitAmount: (units, rateRay, closesPosition) =>
      closesPosition ? maxUint256 : (units * rateRay) / RAY,
  };
}

function reserveData(
  client: PublicClient,
  venue: AavePoolVenue,
  asset: Address,
) {
  return client.readContract({
    address: venue.pool,
    abi: aavePoolAbi,
    functionName: "getReserveData",
    args: [asset],
  });
}

async function isReserveUsable(
  client: PublicClient,
  venue: AavePoolVenue,
  asset: Address,
): Promise<boolean> {
  const provider = { address: venue.dataProvider, abi: aaveDataProviderAbi };
  const [config, paused] = await Promise.all([
    client.readContract({
      ...provider,
      functionName: "getReserveConfigurationData",
      args: [asset],
    }),
    client.readContract({
      ...provider,
      functionName: "getPaused",
      args: [asset],
    }),
  ]);
  const [, , , , , , , , isActive, isFrozen] = config;
  return isActive && !isFrozen && !paused;
}

interface ReserveTotals {
  rate: bigint;
  supplied: bigint;
  available: bigint;
  priceE8: bigint;
}

function toMarketRead(
  symbol: MonadTokenSymbol,
  totals: ReserveTotals,
): MarketRead {
  const { decimals } = MONAD_TOKENS[symbol];
  return {
    assetSymbol: symbol,
    apy: rayRateToApy(totals.rate),
    tvlUsd: baseUnitsToUsd(totals.supplied, decimals, totals.priceE8),
    liquidityUsd: baseUnitsToUsd(totals.available, decimals, totals.priceE8),
    priceUsd: baseUnitsToUsd(10n ** BigInt(decimals), decimals, totals.priceE8),
  };
}

async function readMarket(
  client: PublicClient,
  venue: AavePoolVenue,
  symbol: MonadTokenSymbol,
): Promise<MarketRead[]> {
  const asset = MONAD_TOKENS[symbol].address;
  const [reserve, usable, supplied, priceE8] = await Promise.all([
    reserveData(client, venue, asset),
    isReserveUsable(client, venue, asset),
    client.readContract({
      address: venue.dataProvider,
      abi: aaveDataProviderAbi,
      functionName: "getATokenTotalSupply",
      args: [asset],
    }),
    client.readContract({
      address: venue.oracle,
      abi: aaveOracleAbi,
      functionName: "getAssetPrice",
      args: [asset],
    }),
  ]);
  if (!usable) return [];
  const available = await underlyingBalance(
    client,
    asset,
    reserve.aTokenAddress,
  );
  const rate = reserve.currentLiquidityRate;
  return [toMarketRead(symbol, { rate, supplied, available, priceE8 })];
}

function underlyingBalance(
  client: PublicClient,
  asset: Address,
  holder: Address,
) {
  return client.readContract({
    address: asset,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [holder],
  });
}

async function scaledBalance(
  client: PublicClient,
  venue: AavePoolVenue,
  owner: Address,
  symbol: string,
): Promise<bigint> {
  const reserve = await reserveData(client, venue, assetAddress(symbol));
  return client.readContract({
    address: reserve.aTokenAddress,
    abi: aTokenAbi,
    functionName: "scaledBalanceOf",
    args: [owner],
  });
}

function normalizedIncome(
  client: PublicClient,
  venue: AavePoolVenue,
  symbol: string,
) {
  return client.readContract({
    address: venue.pool,
    abi: normalizedIncomeAbi,
    functionName: "getReserveNormalizedIncome",
    args: [assetAddress(symbol)],
  });
}

async function readHolding(
  client: PublicClient,
  venue: AavePoolVenue,
  owner: Address,
  symbol: string,
): Promise<VenueHolding> {
  const asset = assetAddress(symbol);
  const reserve = await reserveData(client, venue, asset);
  const [heldUnits, available, rateRay] = await Promise.all([
    client.readContract({
      address: reserve.aTokenAddress,
      abi: aTokenAbi,
      functionName: "scaledBalanceOf",
      args: [owner],
    }),
    underlyingBalance(client, asset, reserve.aTokenAddress),
    normalizedIncome(client, venue, symbol),
  ]);
  return {
    heldUnits,
    maxUnits: (available * RAY) / rateRay,
    availableAssets: available,
    rateRay,
  };
}

export function aavePoolAdapter(
  venue: AavePoolVenue,
  client: PublicClient,
): VaultAdapter {
  const unitsNow = (change: UnitsChange) =>
    scaledBalance(client, venue, change.owner, change.assetSymbol);
  return {
    ...aavePoolCalls(venue),
    readMarkets: async () =>
      (
        await Promise.all(
          venue.assets.map((symbol) => readMarket(client, venue, symbol)),
        )
      ).flat(),
    rate: (symbol) => normalizedIncome(client, venue, symbol),
    readHolding: (owner, symbol) => readHolding(client, venue, owner, symbol),
    unitsBefore: (owner, symbol) => scaledBalance(client, venue, owner, symbol),
    suppliedUnits: async (change) =>
      (await unitsNow(change)) - (change.unitsBefore ?? 0n),
    burnedUnits: async (change) =>
      (change.unitsBefore ?? 0n) - (await unitsNow(change)),
  };
}
