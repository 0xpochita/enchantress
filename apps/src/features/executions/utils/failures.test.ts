import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContractFunctionRevertedError,
  erc20Abi,
  HttpRequestError,
  TimeoutError,
  TransactionReceiptNotFoundError,
} from "viem";
import {
  ExecutionStepError,
  failureOf,
  isTransient,
  RetryableStepError,
  retryNote,
} from "./failures.ts";

const withStatus = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { status });

test("network, timeout, rate limit and server errors are transient", () => {
  const transient = [
    new HttpRequestError({ url: "https://rpc.invalid" }),
    new TimeoutError({ body: {}, url: "https://rpc.invalid" }),
    new TransactionReceiptNotFoundError({ hash: "0x01" }),
    new RetryableStepError("No price for USDC"),
    withStatus(429),
    withStatus(503),
    Object.assign(new Error("socket"), { code: "ECONNRESET" }),
    new TypeError("fetch failed"),
    new Error("wrapped", { cause: withStatus(502) }),
  ];
  for (const error of transient) assert.equal(isTransient(error), true);
});

test("reverts, rejections and validation errors are terminal", () => {
  const terminal = [
    new ContractFunctionRevertedError({
      abi: erc20Abi,
      functionName: "approve",
    }),
    new ExecutionStepError("REVERTED", "The transaction reverted on Monad."),
    withStatus(400),
    withStatus(403),
    new Error("plain"),
    "not an error",
  ];
  for (const error of terminal) assert.equal(isTransient(error), false);
});

test("retry notes never echo the raw message of an RPC error", () => {
  const note = retryNote(
    new HttpRequestError({ url: "https://rpc.invalid/key" }),
  );
  assert.equal(note, "Temporary problem (HttpRequestError), retrying.");
  assert.match(retryNote(new RetryableStepError("No price for WETH")), /WETH/);
});

test("failureOf keeps known messages and hides unexpected ones", () => {
  const known = failureOf(new ExecutionStepError("NO_WALLET", "No wallet."));
  assert.deepEqual(known, {
    code: "ExecutionStepError",
    message: "No wallet.",
  });
  assert.equal(failureOf(new Error("db exploded")).code, "UNEXPECTED");
});
