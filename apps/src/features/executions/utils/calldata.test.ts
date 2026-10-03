import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeFunctionData, erc20Abi } from "viem";
import { aavePoolAbi } from "../../chain/abis/aave.ts";
import { erc4626Abi } from "../../chain/abis/erc4626.ts";
import {
  aaveSupplyCalldata,
  aaveWithdrawCalldata,
  approveCalldata,
  erc4626RedeemCalldata,
  minimumOut,
} from "./calldata.ts";

const USER = "0x0000000000000000000000000000000000000001";
const POOL = "0x0000000000000000000000000000000000000002";
const ASSET = "0x0000000000000000000000000000000000000003";

test("approveCalldata encodes spender and amount", () => {
  const decoded = decodeFunctionData({
    abi: erc20Abi,
    data: approveCalldata(POOL, 123n),
  });
  assert.equal(decoded.functionName, "approve");
  assert.deepEqual(decoded.args, [POOL, 123n]);
});

test("aaveSupplyCalldata supplies on behalf of the user with no referral", () => {
  const decoded = decodeFunctionData({
    abi: aavePoolAbi,
    data: aaveSupplyCalldata(ASSET, 500n, USER),
  });
  assert.equal(decoded.functionName, "supply");
  assert.deepEqual(decoded.args, [ASSET, 500n, USER, 0]);
});

test("aaveWithdrawCalldata sends the withdrawn asset to the user", () => {
  const decoded = decodeFunctionData({
    abi: aavePoolAbi,
    data: aaveWithdrawCalldata(ASSET, 700n, USER),
  });
  assert.equal(decoded.functionName, "withdraw");
  assert.deepEqual(decoded.args, [ASSET, 700n, USER]);
});

test("erc4626RedeemCalldata redeems the user's shares to the user", () => {
  const decoded = decodeFunctionData({
    abi: erc4626Abi,
    data: erc4626RedeemCalldata(42n, USER),
  });
  assert.equal(decoded.functionName, "redeem");
  assert.deepEqual(decoded.args, [42n, USER, USER]);
});

test("minimumOut applies slippage in basis points", () => {
  assert.equal(minimumOut(10_000n, 50), 9_950n);
  assert.equal(minimumOut(3n, 50), 2n);
});
