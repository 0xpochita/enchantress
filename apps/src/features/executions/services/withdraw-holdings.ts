import "server-only";
import { type Address, erc20Abi } from "viem";
import { aavePoolAbi, aTokenAbi } from "@/features/chain/abis/aave";
import { erc4626Abi } from "@/features/chain/abis/erc4626";
import {
  MONAD_TOKENS,
  type MonadTokenSymbol,
} from "@/features/chain/config/tokens";
import { monadClient } from "@/features/chain/services/public-client";
import {
  type AavePoolVenue,
  type Erc4626Venue,
  VENUE_CONFIGS,
} from "@/features/vaults/config/venues";
import { scaledToAssets } from "@/features/vaults/utils/aave-math";
import type { WithdrawHolding } from "../utils/withdraw";
import { type LotTotal, userLotTotals } from "./execution-repository";

const RAY = 10n ** 27n;

export interface HoldingRead extends WithdrawHolding {
  assets: bigint;
  maxUnits: bigint;
  availableAssets: bigint;
}

interface LotGroup {
  lot: LotTotal;
  otherUnits: bigint;
}

function smaller(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function tokenOf(symbol: string) {
  return MONAD_TOKENS[symbol as MonadTokenSymbol];
}

async function aaveBalances(aToken: Address, asset: Address, user: Address) {
  return monadClient().multicall({
    allowFailure: false,
    contracts: [
      {
        address: aToken,
        abi: aTokenAbi,
        functionName: "scaledBalanceOf",
        args: [user],
      },
      {
        address: asset,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [aToken],
      },
    ],
  });
}

async function readAaveHolding(
  venue: AavePoolVenue,
  group: LotGroup,
  user: Address,
): Promise<HoldingRead> {
  const token = tokenOf(group.lot.assetSymbol);
  const reserve = await monadClient().readContract({
    address: venue.pool,
    abi: aavePoolAbi,
    functionName: "getReserveData",
    args: [token.address],
  });
  const [held, available] = await aaveBalances(
    reserve.aTokenAddress,
    token.address,
    user,
  );
  const units = smaller(group.lot.units, held);
  return {
    venueId: venue.id,
    assetSymbol: group.lot.assetSymbol,
    venueKind: "aave-pool",
    units,
    otherUnits: group.otherUnits,
    liquidityIndex: reserve.liquidityIndex,
    assets: scaledToAssets(units, reserve.liquidityIndex),
    maxUnits: (available * RAY) / reserve.liquidityIndex,
    availableAssets: available,
  };
}

async function convertToAssets(vault: Address, shares: bigint[]) {
  return monadClient().multicall({
    allowFailure: false,
    contracts: shares.map((amount) => ({
      address: vault,
      abi: erc4626Abi,
      functionName: "convertToAssets" as const,
      args: [amount] as const,
    })),
  });
}

async function readVaultHolding(
  venue: Erc4626Venue,
  group: LotGroup,
  user: Address,
): Promise<HoldingRead> {
  const vault = venue.vaults[group.lot.assetSymbol as MonadTokenSymbol];
  if (!vault) throw new Error(`${venue.name} has no ${group.lot.assetSymbol}`);
  const [held, maxRedeem] = await monadClient().multicall({
    allowFailure: false,
    contracts: [
      {
        address: vault,
        abi: erc4626Abi,
        functionName: "balanceOf",
        args: [user],
      },
      {
        address: vault,
        abi: erc4626Abi,
        functionName: "maxRedeem",
        args: [user],
      },
    ],
  });
  const units = smaller(group.lot.units, held);
  const [assets, availableAssets] = await convertToAssets(vault, [
    units,
    maxRedeem,
  ]);
  return {
    venueId: venue.id,
    assetSymbol: group.lot.assetSymbol,
    venueKind: "erc4626",
    units,
    otherUnits: group.otherUnits,
    liquidityIndex: 0n,
    assets,
    maxUnits: maxRedeem,
    availableAssets,
  };
}

function groupLots(totals: LotTotal[], indexId: string): LotGroup[] {
  const sameMarket = (a: LotTotal, b: LotTotal) =>
    a.venueId === b.venueId && a.assetSymbol === b.assetSymbol;
  return totals
    .filter((lot) => lot.indexId === indexId && lot.units > 0n)
    .map((lot) => ({
      lot,
      otherUnits: totals
        .filter((other) => other.indexId !== indexId && sameMarket(other, lot))
        .reduce((sum, other) => sum + other.units, 0n),
    }));
}

function readHolding(group: LotGroup, user: Address): Promise<HoldingRead> {
  const venue = VENUE_CONFIGS.find((v) => v.id === group.lot.venueId);
  if (!venue) throw new Error(`Unknown venue ${group.lot.venueId}`);
  return venue.kind === "aave-pool"
    ? readAaveHolding(venue, group, user)
    : readVaultHolding(venue, group, user);
}

export async function readIndexHoldings(
  userId: string,
  user: Address,
  indexId: string,
): Promise<HoldingRead[]> {
  const groups = groupLots(await userLotTotals(userId), indexId);
  const reads = await Promise.all(groups.map((g) => readHolding(g, user)));
  return reads.filter((read) => read.units > 0n);
}
