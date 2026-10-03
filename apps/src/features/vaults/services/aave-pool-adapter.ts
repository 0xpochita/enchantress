import "server-only";
import { type Address, erc20Abi } from "viem";
import {
  aaveDataProviderAbi,
  aaveOracleAbi,
  aavePoolAbi,
  aTokenAbi,
} from "@/features/chain/abis/aave";
import { MONAD_TOKENS } from "@/features/chain/config/tokens";
import { monadClient } from "@/features/chain/services/public-client";
import type { AavePoolVenue } from "../config/venues";
import type { MarketRead, PositionRead, VaultAdapter } from "../types";
import {
  baseUnitsToUsd,
  rayRateToApy,
  scaledToAssets,
} from "../utils/aave-math";

interface ReserveSnapshot {
  liquidityRate: bigint;
  liquidityIndex: bigint;
  aToken: Address;
  isUsable: boolean;
  supplied: bigint;
  available: bigint;
  priceE8: bigint;
}

async function readReserve(
  venue: AavePoolVenue,
  asset: Address,
): Promise<ReserveSnapshot> {
  const [reserve, config, paused, supplied, priceE8] =
    await monadClient().multicall({
      allowFailure: false,
      contracts: [
        {
          address: venue.pool,
          abi: aavePoolAbi,
          functionName: "getReserveData",
          args: [asset],
        },
        {
          address: venue.dataProvider,
          abi: aaveDataProviderAbi,
          functionName: "getReserveConfigurationData",
          args: [asset],
        },
        {
          address: venue.dataProvider,
          abi: aaveDataProviderAbi,
          functionName: "getPaused",
          args: [asset],
        },
        {
          address: venue.dataProvider,
          abi: aaveDataProviderAbi,
          functionName: "getATokenTotalSupply",
          args: [asset],
        },
        {
          address: venue.oracle,
          abi: aaveOracleAbi,
          functionName: "getAssetPrice",
          args: [asset],
        },
      ],
    });
  const available = await monadClient().readContract({
    address: asset,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [reserve.aTokenAddress],
  });
  const [, , , , , , , , isActive, isFrozen] = config;
  return {
    liquidityRate: reserve.currentLiquidityRate,
    liquidityIndex: reserve.liquidityIndex,
    aToken: reserve.aTokenAddress,
    isUsable: isActive && !isFrozen && !paused,
    supplied,
    available,
    priceE8,
  };
}

export class AavePoolAdapter implements VaultAdapter {
  constructor(readonly venue: AavePoolVenue) {}

  async readMarkets(): Promise<MarketRead[]> {
    const reads = await Promise.all(
      this.venue.assets.map(async (symbol) => {
        const token = MONAD_TOKENS[symbol];
        const reserve = await readReserve(this.venue, token.address);
        if (!reserve.isUsable) return [];
        return [
          {
            assetSymbol: symbol,
            apy: rayRateToApy(reserve.liquidityRate),
            tvlUsd: baseUnitsToUsd(
              reserve.supplied,
              token.decimals,
              reserve.priceE8,
            ),
            liquidityUsd: baseUnitsToUsd(
              reserve.available,
              token.decimals,
              reserve.priceE8,
            ),
            priceUsd: baseUnitsToUsd(
              10n ** BigInt(token.decimals),
              token.decimals,
              reserve.priceE8,
            ),
          },
        ];
      }),
    );
    return reads.flat();
  }

  async readPosition(
    user: Address,
    assetSymbol: string,
  ): Promise<PositionRead> {
    const token = MONAD_TOKENS[assetSymbol as keyof typeof MONAD_TOKENS];
    const reserve = await monadClient().readContract({
      address: this.venue.pool,
      abi: aavePoolAbi,
      functionName: "getReserveData",
      args: [token.address],
    });
    const units = await monadClient().readContract({
      address: reserve.aTokenAddress,
      abi: aTokenAbi,
      functionName: "scaledBalanceOf",
      args: [user],
    });
    return { units, assets: scaledToAssets(units, reserve.liquidityIndex) };
  }
}
