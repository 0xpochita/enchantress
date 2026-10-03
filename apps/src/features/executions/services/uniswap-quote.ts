import "server-only";
import type { Address } from "viem";
import { serverEnv } from "@/config/env.server";
import {
  UNISWAP_FEE_TIERS,
  UNISWAP_MONAD,
  uniswapFactoryAbi,
  uniswapQuoterAbi,
} from "@/features/chain/abis/uniswap";
import { monadClient } from "@/features/chain/services/public-client";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BPS = 10_000n;

export class NoLiquidityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoLiquidityError";
  }
}

export interface SwapQuote {
  fee: number;
  amountOut: bigint;
}

async function quoteTier(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  fee: number,
): Promise<SwapQuote | null> {
  const client = monadClient();
  const pool = await client.readContract({
    address: UNISWAP_MONAD.factory,
    abi: uniswapFactoryAbi,
    functionName: "getPool",
    args: [tokenIn, tokenOut, fee],
  });
  if (pool === ZERO_ADDRESS) return null;
  try {
    const { result } = await client.simulateContract({
      address: UNISWAP_MONAD.quoterV2,
      abi: uniswapQuoterAbi,
      functionName: "quoteExactInputSingle",
      args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
    });
    return { fee, amountOut: result[0] };
  } catch {
    return null;
  }
}

export async function bestSwapQuote(input: {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  expectedOut: bigint;
  pairLabel: string;
}): Promise<SwapQuote> {
  const quotes = await Promise.all(
    UNISWAP_FEE_TIERS.map((fee) =>
      quoteTier(input.tokenIn, input.tokenOut, input.amountIn, fee),
    ),
  );
  const best = quotes
    .filter((quote): quote is SwapQuote => quote !== null)
    .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1))[0];
  const deviation = BigInt(serverEnv().SWAP_MAX_ORACLE_DEVIATION_BPS);
  const floor = (input.expectedOut * (BPS - deviation)) / BPS;
  if (!best || best.amountOut < floor)
    throw new NoLiquidityError(
      `Not enough liquidity to swap into ${input.pairLabel} right now.`,
    );
  return best;
}
