import {
  BaseError,
  ContractFunctionRevertedError,
  type PublicClient,
} from "viem";
import {
  UNISWAP_FEE_TIERS,
  UNISWAP_MONAD,
  uniswapFactoryAbi,
  uniswapQuoterAbi,
} from "../../chain/abis/uniswap.ts";
import type { SwapQuoteRequest } from "../services/runner-ports.ts";
import { isTransient, RetryableStepError } from "./failures.ts";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BPS = 10_000n;
const RETRIES = 3;
const RETRY_DELAY_MS = 150;

export class NoLiquidityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoLiquidityError";
  }
}

export class QuoteUnavailableError extends RetryableStepError {
  constructor() {
    super("Could not reach Monad to price this swap. Try again in a moment.");
    this.name = "QuoteUnavailableError";
  }
}

export interface SwapQuote {
  fee: number;
  amountOut: bigint;
}

export interface QuoteOptions {
  client: PublicClient;
  maxDeviationBps: number;
  retryDelayMs?: number;
}

type TierResult = SwapQuote | "none" | "unavailable";

const knownPools = new WeakMap<PublicClient, Set<string>>();

function isRevert(error: unknown): boolean {
  if (!(error instanceof BaseError)) return false;
  const reverted = error.walk(
    (cause) => cause instanceof ContractFunctionRevertedError,
  );
  return (
    reverted instanceof ContractFunctionRevertedError &&
    (reverted.raw !== undefined || /revert/i.test(reverted.reason ?? ""))
  );
}

function isFlaky(error: unknown): boolean {
  return isTransient(error) && !isRevert(error);
}

async function withRetry<T>(run: () => Promise<T>, delayMs: number) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!isFlaky(error) || attempt >= RETRIES) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs * 2 ** attempt),
      );
    }
  }
}

async function poolExists(
  request: SwapQuoteRequest,
  fee: number,
  options: QuoteOptions,
): Promise<boolean> {
  const { client } = options;
  const pools = knownPools.get(client) ?? new Set<string>();
  knownPools.set(client, pools);
  const key = `${request.tokenIn}:${request.tokenOut}:${fee}`.toLowerCase();
  if (pools.has(key)) return true;
  const pool = await withRetry(
    () =>
      client.readContract({
        address: UNISWAP_MONAD.factory,
        abi: uniswapFactoryAbi,
        functionName: "getPool",
        args: [request.tokenIn, request.tokenOut, fee],
      }),
    options.retryDelayMs ?? RETRY_DELAY_MS,
  );
  if (pool === ZERO_ADDRESS) return false;
  pools.add(key);
  return true;
}

async function simulateTier(
  request: SwapQuoteRequest,
  fee: number,
  options: QuoteOptions,
): Promise<TierResult> {
  const { tokenIn, tokenOut, amountIn } = request;
  try {
    const { result } = await withRetry(
      () =>
        options.client.simulateContract({
          address: UNISWAP_MONAD.quoterV2,
          abi: uniswapQuoterAbi,
          functionName: "quoteExactInputSingle",
          args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
        }),
      options.retryDelayMs ?? RETRY_DELAY_MS,
    );
    return { fee, amountOut: result[0] };
  } catch (error) {
    return isFlaky(error) ? "unavailable" : "none";
  }
}

async function quoteTier(
  request: SwapQuoteRequest,
  fee: number,
  options: QuoteOptions,
): Promise<TierResult> {
  try {
    if (!(await poolExists(request, fee, options))) return "none";
  } catch (error) {
    if (isFlaky(error)) return "unavailable";
    throw error;
  }
  return simulateTier(request, fee, options);
}

export async function quoteBestSwap(
  request: SwapQuoteRequest,
  options: QuoteOptions,
): Promise<SwapQuote> {
  const results: TierResult[] = [];
  for (const fee of UNISWAP_FEE_TIERS)
    results.push(await quoteTier(request, fee, options));
  const best = results
    .filter((result): result is SwapQuote => typeof result === "object")
    .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1))[0];
  const deviation = BigInt(options.maxDeviationBps);
  const floor = (request.expectedOut * (BPS - deviation)) / BPS;
  if (best && best.amountOut >= floor) return best;
  if (results.includes("unavailable")) throw new QuoteUnavailableError();
  throw new NoLiquidityError(
    `Not enough liquidity to swap into ${request.pairLabel} right now.`,
  );
}
