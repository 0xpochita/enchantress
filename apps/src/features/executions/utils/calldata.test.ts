import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeFunctionData, erc20Abi } from "viem";
import { approveCalldata, minimumOut } from "./calldata.ts";

const POOL = "0x0000000000000000000000000000000000000002";

test("approveCalldata encodes spender and amount", () => {
  const decoded = decodeFunctionData({
    abi: erc20Abi,
    data: approveCalldata(POOL, 123n),
  });
  assert.equal(decoded.functionName, "approve");
  assert.deepEqual(decoded.args, [POOL, 123n]);
});

test("minimumOut applies slippage in basis points", () => {
  assert.equal(minimumOut(10_000n, 50), 9_950n);
  assert.equal(minimumOut(3n, 50), 2n);
});
