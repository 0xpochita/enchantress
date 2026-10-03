import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type Address,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  type Log,
  type TransactionReceipt,
} from "viem";
import { erc4626Abi } from "../../chain/abis/erc4626.ts";
import type { Erc4626Venue } from "../config/venues.ts";
import { UnknownMarketError } from "../errors.ts";
import { type StubCall, stubClient } from "../testing/stub-client.ts";
import { RAY } from "../utils/aave-math.ts";
import { erc4626Adapter } from "./erc4626-adapter.ts";

const USER: Address = "0x0000000000000000000000000000000000000001";
const OTHER = "0x0000000000000000000000000000000000000002";
const VAULT = "0x0000000000000000000000000000000000000f00";

const venue: Erc4626Venue = {
  id: "vault-test",
  name: "Vault test",
  iconKey: "vault",
  kind: "erc4626",
  vaults: { USDC: VAULT },
};

function chain() {
  const reads: Record<string, (call: StubCall) => unknown> = {
    balanceOf: () => 800n,
    maxRedeem: () => 500n,
    convertToAssets: (call) => (BigInt(String(call.args[0])) * 12n) / 10n,
  };
  return stubClient([erc4626Abi], (call) => reads[call.functionName](call));
}

function depositLog(vault: string, owner: string, shares: bigint): Log {
  const topics = encodeEventTopics({
    abi: erc4626Abi,
    eventName: "Deposit",
    args: { sender: owner as `0x${string}`, owner: owner as `0x${string}` },
  });
  return {
    address: vault as `0x${string}`,
    topics,
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      [shares * 2n, shares],
    ),
    blockNumber: 1n,
    blockHash: "0x",
    transactionHash: "0x",
    transactionIndex: 0,
    logIndex: 0,
    removed: false,
  } as Log;
}

test("transactions deposit and redeem for the owner on the asset vault", () => {
  const adapter = erc4626Adapter(venue, chain());
  const supply = adapter.supplyTransaction("USDC", 500n, USER);
  const exit = adapter.exitTransaction("USDC", 40n, USER);
  assert.deepEqual(
    [supply.to, exit.to, adapter.callTarget("USDC")],
    [VAULT, VAULT, VAULT],
  );
  const [deposit, redeem] = [supply, exit].map((tx) =>
    decodeFunctionData({ abi: erc4626Abi, data: tx.data }),
  );
  assert.deepEqual(deposit.args, [500n, USER]);
  assert.deepEqual(redeem.args, [40n, USER, USER]);
  assert.equal(adapter.exitStepKind, "redeem");
  assert.throws(() => adapter.callTarget("WETH"), UnknownMarketError);
});

test("exit amount redeems exactly the units, even when closing", () => {
  const adapter = erc4626Adapter(venue, chain());
  assert.equal(adapter.exitAmount(999n, RAY, true), 999n);
  assert.equal(adapter.exitAmount(749n, RAY * 2n, false), 749n);
});

test("holding reads shares, max redeem and the share rate", async () => {
  const adapter = erc4626Adapter(venue, chain());
  assert.equal(await adapter.rate("USDC"), (RAY * 12n) / 10n);
  assert.deepEqual(await adapter.readHolding(USER, "USDC"), {
    heldUnits: 800n,
    maxUnits: 500n,
    availableAssets: 600n,
    rateRay: (RAY * 12n) / 10n,
  });
});

test("minted shares come from the receipt and burned shares from the step", async () => {
  const adapter = erc4626Adapter(venue, chain());
  const logs = [
    depositLog(VAULT, USER, 70n),
    depositLog(VAULT, OTHER, 5n),
    depositLog(OTHER, USER, 9n),
  ];
  const receipt = { logs } as unknown as TransactionReceipt;
  const change = {
    assetSymbol: "USDC",
    owner: USER,
    receipt,
    unitsBefore: null,
  };
  assert.equal(await adapter.unitsBefore(USER, "USDC"), null);
  assert.equal(await adapter.suppliedUnits({ ...change, amount: 0n }), 70n);
  assert.equal(await adapter.burnedUnits({ ...change, amount: 33n }), 33n);
});
