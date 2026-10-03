import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeEventTopics, erc20Abi, type Log, toHex } from "viem";
import { receivedAmount } from "./receipts.ts";

const TOKEN = "0x00000000000000000000000000000000000000aa";
const OTHER = "0x00000000000000000000000000000000000000bb";
const USER = "0x0000000000000000000000000000000000000001";
const POOL = "0x0000000000000000000000000000000000000002";

function transferLog(
  address: string,
  from: string,
  to: string,
  value: bigint,
): Log {
  const topics = encodeEventTopics({
    abi: erc20Abi,
    eventName: "Transfer",
    args: { from: from as `0x${string}`, to: to as `0x${string}` },
  });
  return {
    address: address as `0x${string}`,
    topics,
    data: toHex(value, { size: 32 }),
    blockNumber: 1n,
    blockHash: "0x",
    transactionHash: "0x",
    transactionIndex: 0,
    logIndex: 0,
    removed: false,
  } as Log;
}

test("receivedAmount sums only transfers of the token to the recipient", () => {
  const logs = [
    transferLog(TOKEN, POOL, USER, 70n),
    transferLog(TOKEN, POOL, USER, 30n),
    transferLog(OTHER, POOL, USER, 999n),
    transferLog(TOKEN, USER, POOL, 500n),
  ];
  assert.equal(receivedAmount(logs, TOKEN, USER), 100n);
  assert.equal(receivedAmount(logs, OTHER, POOL), 0n);
});
