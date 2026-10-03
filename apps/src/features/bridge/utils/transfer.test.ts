import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeFunctionData, erc20Abi } from "viem";
import { buildTransferRequest } from "./transfer.ts";

const DEPOSIT = "0x00000000000000000000000000000000000000d1";
const TOKEN = "0x00000000000000000000000000000000000000aa";

test("buildTransferRequest sends native value straight to the deposit address", () => {
  const request = buildTransferRequest({
    chainId: 8453,
    tokenAddress: null,
    depositAddress: DEPOSIT,
    amountInBase: "1500",
  });
  assert.deepEqual(request, { chainId: 8453, to: DEPOSIT, value: 1500n });
});

test("buildTransferRequest encodes an ERC-20 transfer for tokens", () => {
  const request = buildTransferRequest({
    chainId: 1,
    tokenAddress: TOKEN,
    depositAddress: DEPOSIT,
    amountInBase: "25",
  });
  assert.equal(request.to, TOKEN);
  assert.equal(request.value, undefined);
  const decoded = decodeFunctionData({
    abi: erc20Abi,
    data: request.data ?? "0x",
  });
  assert.equal(decoded.functionName, "transfer");
  assert.deepEqual(
    [String(decoded.args?.[0]).toLowerCase(), decoded.args?.[1]],
    [DEPOSIT, 25n],
  );
});
