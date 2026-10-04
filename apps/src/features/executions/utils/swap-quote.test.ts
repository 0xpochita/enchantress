import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type Address,
  createPublicClient,
  custom,
  decodeFunctionData,
  encodeFunctionResult,
  HttpRequestError,
  isHex,
  RpcRequestError,
} from "viem";
import {
  uniswapFactoryAbi,
  uniswapQuoterAbi,
} from "../../chain/abis/uniswap.ts";
import { isTransient } from "./failures.ts";
import {
  NoLiquidityError,
  QuoteUnavailableError,
  quoteBestSwap,
} from "./swap-quote.ts";

const POOL = "0x00000000000000000000000000000000000000aa";
const ZERO = "0x0000000000000000000000000000000000000000";
const TOKEN_IN: Address = "0x0000000000000000000000000000000000000001";
const TOKEN_OUT: Address = "0x0000000000000000000000000000000000000002";

type Answer = (fee: number) => Address | bigint | Error;

const flaky = () => new HttpRequestError({ url: "stub", status: 503 });
const reverted = () =>
  new RpcRequestError({
    body: {},
    url: "stub",
    error: { code: 3, message: "execution reverted", data: "0x" },
  });

function decode(data: `0x${string}`) {
  try {
    return {
      abi: uniswapFactoryAbi,
      ...decodeFunctionData({ abi: uniswapFactoryAbi, data }),
    };
  } catch {
    return {
      abi: uniswapQuoterAbi,
      ...decodeFunctionData({ abi: uniswapQuoterAbi, data }),
    };
  }
}

function feeOf(call: ReturnType<typeof decode>): number {
  if (call.functionName === "getPool") return call.args[2];
  return call.args[0].fee;
}

function respond(call: ReturnType<typeof decode>, answer: Answer) {
  const value = answer(feeOf(call));
  if (value instanceof Error) throw value;
  if (typeof value === "string")
    return encodeFunctionResult({
      abi: uniswapFactoryAbi,
      functionName: "getPool",
      result: value,
    });
  return encodeFunctionResult({
    abi: uniswapQuoterAbi,
    functionName: "quoteExactInputSingle",
    result: [value, 0n, 0, 0n],
  });
}

function stub(pools: Answer, quotes: Answer) {
  const calls: string[] = [];
  const client = createPublicClient({
    transport: custom(
      {
        async request({ method, params }) {
          const data = Array.isArray(params) ? params[0]?.data : undefined;
          if (method !== "eth_call" || !isHex(data)) throw new Error(method);
          const call = decode(data);
          calls.push(`${call.functionName}:${feeOf(call)}`);
          return respond(
            call,
            call.functionName === "getPool" ? pools : quotes,
          );
        },
      },
      { retryCount: 0 },
    ),
  });
  return { client, calls };
}

function quote(client: ReturnType<typeof stub>["client"]) {
  return quoteBestSwap(
    {
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1000n,
      expectedOut: 0n,
      pairLabel: "WMON",
    },
    { client, maxDeviationBps: 500, retryDelayMs: 1 },
  );
}

test("a transient failure is retried and then priced", async () => {
  let failures = 2;
  const { client } = stub(
    () => POOL,
    (fee) => (fee === 3000 && failures-- > 0 ? flaky() : BigInt(fee)),
  );
  assert.deepEqual(await quote(client), { fee: 10000, amountOut: 10000n });
  assert.equal(failures, -1);
});

test("persistent transient failures raise QuoteUnavailableError", async () => {
  const { client } = stub(
    () => POOL,
    () => flaky(),
  );
  await assert.rejects(quote(client), QuoteUnavailableError);
  assert.equal(isTransient(new QuoteUnavailableError()), true);
});

test("a reverting quoter means no liquidity, without retries", async () => {
  const { client, calls } = stub(
    () => POOL,
    () => reverted(),
  );
  await assert.rejects(quote(client), NoLiquidityError);
  assert.equal(
    calls.filter((call) => call === "quoteExactInputSingle:500").length,
    1,
  );
});

test("tiers without a pool are skipped and found pools are cached", async () => {
  const { client, calls } = stub(
    (fee) => (fee === 500 ? POOL : ZERO),
    (fee) => BigInt(fee),
  );
  assert.deepEqual(await quote(client), { fee: 500, amountOut: 500n });
  assert.deepEqual(
    calls.filter((call) => call.startsWith("quote")),
    ["quoteExactInputSingle:500"],
  );
  await quote(client);
  assert.equal(calls.filter((call) => call === "getPool:500").length, 1);
});
