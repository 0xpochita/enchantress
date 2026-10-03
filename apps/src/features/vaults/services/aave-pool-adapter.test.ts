import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type Address,
  decodeFunctionData,
  erc20Abi,
  maxUint256,
  parseAbi,
  type TransactionReceipt,
} from "viem";
import {
  aaveDataProviderAbi,
  aaveOracleAbi,
  aavePoolAbi,
  aTokenAbi,
} from "../../chain/abis/aave.ts";
import { MONAD_TOKENS } from "../../chain/config/tokens.ts";
import type { AavePoolVenue } from "../config/venues.ts";
import { type StubCall, stubClient } from "../testing/stub-client.ts";
import { RAY } from "../utils/aave-math.ts";
import { aavePoolAdapter } from "./aave-pool-adapter.ts";

const USER = "0x0000000000000000000000000000000000000001";
const A_TOKEN = "0x00000000000000000000000000000000000000a1";
const USDC = MONAD_TOKENS.USDC.address;
const INCOME = (RAY * 11n) / 10n;

const venue: AavePoolVenue = {
  id: "aave-test",
  name: "Aave test",
  iconKey: "aave",
  kind: "aave-pool",
  pool: "0x0000000000000000000000000000000000000a00",
  dataProvider: "0x0000000000000000000000000000000000000b00",
  oracle: "0x0000000000000000000000000000000000000c00",
  assets: ["USDC"],
};

const incomeAbi = parseAbi([
  "function getReserveNormalizedIncome(address asset) view returns (uint256)",
]);

const reserve = {
  configuration: 0n,
  liquidityIndex: RAY,
  currentLiquidityRate: 0n,
  variableBorrowIndex: RAY,
  currentVariableBorrowRate: 0n,
  currentStableBorrowRate: 0n,
  lastUpdateTimestamp: 0,
  id: 1,
  aTokenAddress: A_TOKEN as Address,
  stableDebtTokenAddress: USER as Address,
  variableDebtTokenAddress: USER as Address,
  interestRateStrategyAddress: USER as Address,
  accruedToTreasury: 0n,
  unbacked: 0n,
  isolationModeTotalDebt: 0n,
};

const ABIS = [
  aavePoolAbi,
  incomeAbi,
  aTokenAbi,
  erc20Abi,
  aaveDataProviderAbi,
  aaveOracleAbi,
];

function chain(state: { units: bigint; frozen?: boolean }) {
  const reads: Record<string, (call: StubCall) => unknown> = {
    getReserveData: () => reserve,
    getReserveNormalizedIncome: () => INCOME,
    scaledBalanceOf: () => state.units,
    balanceOf: (call) => (call.to === USDC ? 2_200_000n : 0n),
    getReserveConfigurationData: () => [
      6n,
      0n,
      0n,
      0n,
      0n,
      true,
      true,
      false,
      true,
      state.frozen ?? false,
    ],
    getPaused: () => false,
    getATokenTotalSupply: () => 5_000_000n,
    getAssetPrice: () => 100_000_000n,
  };
  return stubClient(ABIS, (call) => reads[call.functionName](call));
}

const receipt = { logs: [] } as unknown as TransactionReceipt;

test("transactions call the pool on behalf of the owner", () => {
  const adapter = aavePoolAdapter(venue, chain({ units: 0n }));
  const supply = adapter.supplyTransaction("USDC", 500n, USER);
  const exit = adapter.exitTransaction("USDC", 700n, USER);
  assert.equal(adapter.callTarget("USDC"), venue.pool);
  assert.deepEqual([supply.to, exit.to], [venue.pool, venue.pool]);
  const decoded = [supply, exit].map((tx) =>
    decodeFunctionData({ abi: aavePoolAbi, data: tx.data }),
  );
  assert.deepEqual(decoded[0].args, [USDC, 500n, USER, 0]);
  assert.deepEqual(decoded[1].args, [USDC, 700n, USER]);
  assert.equal(adapter.exitStepKind, "withdraw");
});

test("exit amount converts units at the rate and closes with max uint", () => {
  const adapter = aavePoolAdapter(venue, chain({ units: 0n }));
  assert.equal(adapter.exitAmount(1_000n, INCOME, false), 1_100n);
  assert.equal(adapter.exitAmount(3n, INCOME, false), 3n);
  assert.equal(adapter.exitAmount(1_000n, INCOME, true), maxUint256);
});

test("holding reads units, liquidity and normalized income", async () => {
  const adapter = aavePoolAdapter(venue, chain({ units: 900n }));
  assert.equal(await adapter.rate("USDC"), INCOME);
  assert.deepEqual(await adapter.readHolding(USER, "USDC"), {
    heldUnits: 900n,
    maxUnits: 2_000_000n,
    availableAssets: 2_200_000n,
    rateRay: INCOME,
  });
});

test("units minted and burned are scaled balance deltas", async () => {
  const state = { units: 100n };
  const adapter = aavePoolAdapter(venue, chain(state));
  const before = await adapter.unitsBefore(USER, "USDC");
  state.units = 350n;
  const change = {
    assetSymbol: "USDC",
    owner: USER,
    receipt,
    amount: 0n,
  } as const;
  assert.equal(
    await adapter.suppliedUnits({ ...change, unitsBefore: before }),
    250n,
  );
  state.units = 50n;
  assert.equal(
    await adapter.burnedUnits({ ...change, unitsBefore: 350n }),
    300n,
  );
});

test("markets are priced from the oracle and frozen reserves are dropped", async () => {
  const [market] = await aavePoolAdapter(
    venue,
    chain({ units: 0n }),
  ).readMarkets(() => undefined);
  assert.deepEqual(market, {
    assetSymbol: "USDC",
    apy: 0,
    tvlUsd: 5,
    liquidityUsd: 2.2,
    priceUsd: 1,
  });
  const frozen = aavePoolAdapter(venue, chain({ units: 0n, frozen: true }));
  assert.deepEqual(await frozen.readMarkets(() => undefined), []);
});
