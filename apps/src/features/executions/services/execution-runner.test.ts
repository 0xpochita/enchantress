import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type Address,
  decodeFunctionData,
  encodeEventTopics,
  erc20Abi,
  type Hex,
  HttpRequestError,
  type Log,
  maxUint256,
  numberToHex,
  type TransactionReceipt,
  toHex,
} from "viem";
import type { ExecutionRow, ExecutionStepRow } from "@/lib/db/schema";
import { aavePoolAbi } from "../../chain/abis/aave.ts";
import { UNISWAP_MONAD, uniswapRouterAbi } from "../../chain/abis/uniswap.ts";
import { MONAD_TOKEN_LIST } from "../../chain/config/tokens.ts";
import type { AavePoolVenue } from "../../vaults/config/venues.ts";
import { venueConfig } from "../../vaults/services/vault-adapters.ts";
import {
  type MemoryMarkets,
  memoryAdapter,
} from "../../vaults/testing/memory-adapter.ts";
import type { VaultAdapter } from "../../vaults/types.ts";
import { RAY } from "../../vaults/utils/aave-math.ts";
import { type PlannedStep, planDeposit } from "../utils/plan.ts";
import {
  indexLotGroups,
  planWithdrawLegs,
  reduceLots,
  withdrawSteps,
} from "../utils/withdraw.ts";
import type { LoadedExecution } from "./execution-repository.ts";
import { advanceWith } from "./execution-runner.ts";
import type {
  ChainReader,
  ExecutionStore,
  LedgerWrite,
  PriceSource,
  RunnerPorts,
  Transaction,
  TransactionSender,
  Wallet,
} from "./runner-ports.ts";

const WALLET: Wallet = {
  id: "wallet-1",
  address: "0x00000000000000000000000000000000000000e1",
};
const RATE = (RAY * 11n) / 10n;
const PRICES: Record<string, number> = { USDC: 1, WETH: 2000 };
function aaveVenue(): AavePoolVenue {
  const venue = venueConfig("aave-v3");
  if (venue?.kind !== "aave-pool") throw new Error("aave-v3 missing");
  return venue;
}

const VENUE = aaveVenue();
const POOL = VENUE.pool;

interface StoredLot {
  id: string;
  indexId: string;
  venueId: string;
  assetSymbol: string;
  units: bigint;
}

interface LedgerRow {
  executionId: string;
  direction: "in" | "out";
  assetSymbol: string;
  amountBase: bigint;
  valueUsd: number;
  txHash: string;
}

function symbolOf(address: string): string {
  const token = MONAD_TOKEN_LIST.find(
    (t) => t.address.toLowerCase() === address.toLowerCase(),
  );
  if (!token) throw new Error(`Unknown token ${address}`);
  return token.symbol;
}

function transferLog(token: Address, to: Address, value: bigint): Log {
  return {
    address: token,
    topics: encodeEventTopics({
      abi: erc20Abi,
      eventName: "Transfer",
      args: { from: POOL, to },
    }),
    data: toHex(value, { size: 32 }),
    blockNumber: 1n,
    blockHash: "0x",
    transactionHash: "0x",
    transactionIndex: 0,
    logIndex: 0,
    removed: false,
  } as Log;
}

function executionRow(id: string, kind: string): ExecutionRow {
  const now = new Date();
  return {
    id,
    userId: "user-1",
    indexId: "index-1",
    kind,
    status: "executing",
    depositAsset: "USDC",
    depositAmountBase: "0",
    valueUsd: "0",
    originChain: null,
    originAssetId: null,
    originAmountBase: null,
    originTxHash: null,
    auroraDepositAddress: null,
    auroraDepositMemo: null,
    auroraDeadline: null,
    auroraStatus: null,
    errorCode: null,
    errorMessage: null,
    leaseUntil: null,
    createdAt: now,
    updatedAt: now,
  };
}

function stepRow(executionId: string, step: PlannedStep): ExecutionStepRow {
  return {
    ...step,
    id: `${executionId}-${step.position}`,
    executionId,
    amountOutBase: null,
    unitsBefore: null,
    status: "pending",
    privyTransactionId: null,
    txHash: null,
    attempts: 0,
    lastError: null,
    updatedAt: new Date(),
  };
}

interface MemoryState {
  executions: Map<string, LoadedExecution>;
  lots: StoredLot[];
  ledger: LedgerRow[];
  leased: Set<string>;
}

type StoreOps<K extends keyof ExecutionStore> = Pick<ExecutionStore, K>;

function leaseOps(
  state: MemoryState,
): StoreOps<"acquireLease" | "releaseLease" | "load"> {
  return {
    acquireLease: async (id) => {
      const status = state.executions.get(id)?.execution.status;
      const active = status === "executing" || status === "bridging";
      if (state.leased.has(id) || !active) return false;
      state.leased.add(id);
      return true;
    },
    releaseLease: async (id) => {
      state.leased.delete(id);
    },
    load: async (id) => {
      const loaded = state.executions.get(id);
      if (!loaded) return undefined;
      const steps = loaded.steps.map((step) => ({ ...step }));
      return { execution: { ...loaded.execution }, steps };
    },
  };
}

function stepOps(state: MemoryState): StoreOps<"updateStep" | "finish"> {
  const findStep = (stepId: string) =>
    [...state.executions.values()]
      .flatMap((loaded) => loaded.steps)
      .find((step) => step.id === stepId);
  return {
    updateStep: async (stepId, patch) => {
      Object.assign(findStep(stepId) ?? {}, patch);
    },
    finish: async (id, status, error) => {
      const loaded = state.executions.get(id);
      if (!loaded) return;
      loaded.execution.status = status;
      loaded.execution.errorCode = error?.code ?? null;
    },
  };
}

function ledgerRow(input: LedgerWrite, direction: "in" | "out"): LedgerRow {
  return {
    executionId: input.execution.id,
    direction,
    assetSymbol: input.step.assetSymbol,
    amountBase: input.amountBase,
    valueUsd: input.valueUsd,
    txHash: input.txHash,
  };
}

function withdrawLots(
  state: MemoryState,
  step: ExecutionStepRow,
  burned: bigint,
) {
  const market = state.lots.filter(
    (lot) =>
      lot.venueId === step.venueId && lot.assetSymbol === step.assetSymbol,
  );
  for (const update of reduceLots(market, burned))
    Object.assign(state.lots.find((lot) => lot.id === update.id) ?? {}, update);
}

function ledgerOps(
  state: MemoryState,
): StoreOps<"recordDeposit" | "recordWithdraw" | "hasLedgerEntry"> {
  return {
    recordDeposit: async (input) => {
      const { indexId } = input.execution;
      const { venueId, assetSymbol } = input.step;
      const id = `lot-${state.lots.length}`;
      state.lots.push({
        id,
        indexId,
        venueId,
        assetSymbol,
        units: input.units,
      });
      state.ledger.push(ledgerRow(input, "in"));
    },
    recordWithdraw: async (input) => {
      withdrawLots(state, input.step, input.burnedUnits);
      state.ledger.push(ledgerRow(input, "out"));
    },
    hasLedgerEntry: async (executionId, txHash) =>
      state.ledger.some(
        (row) => row.executionId === executionId && row.txHash === txHash,
      ),
  };
}

function memoryStore(state: MemoryState): ExecutionStore {
  return {
    ...leaseOps(state),
    ...stepOps(state),
    ...ledgerOps(state),
    walletOf: async () => WALLET,
  };
}

function marketOf(markets: MemoryMarkets, asset: Address) {
  const found = markets.get(symbolOf(asset));
  if (!found) throw new Error(`No market ${asset}`);
  return found;
}

function poolEffect(markets: MemoryMarkets, data: Hex): Log[] {
  const call = decodeFunctionData({ abi: aavePoolAbi, data });
  if (call.functionName === "supply") {
    const [asset, amount] = call.args;
    marketOf(markets, asset).units += (amount * RAY) / RATE;
    return [];
  }
  if (call.functionName !== "withdraw") return [];
  const [asset, amount, to] = call.args;
  const held = marketOf(markets, asset);
  const all = amount === maxUint256;
  const assets = all ? (held.units * RATE) / RAY : amount;
  held.units -= all ? held.units : (assets * RAY + RATE - 1n) / RATE;
  return [transferLog(asset, to, assets)];
}

function swapEffect(data: Hex): Log[] {
  const call = decodeFunctionData({ abi: uniswapRouterAbi, data });
  if (call.functionName !== "exactInputSingle") return [];
  const [params] = call.args;
  return [
    transferLog(params.tokenOut, params.recipient, params.amountOutMinimum),
  ];
}

function effectOf(markets: MemoryMarkets, tx: Transaction): Log[] {
  if (tx.to === POOL) return poolEffect(markets, tx.data);
  if (tx.to === UNISWAP_MONAD.swapRouter02) return swapEffect(tx.data);
  return [];
}

function fakeChain(markets: MemoryMarkets) {
  const chain = {
    receipts: new Map<Hex, TransactionReceipt>(),
    sent: [] as Transaction[],
    revertNext: false,
    apply: (tx: Transaction): Hex => {
      chain.sent.push(tx);
      const hash = numberToHex(chain.sent.length, { size: 32 });
      const status = chain.revertNext ? "reverted" : "success";
      chain.revertNext = false;
      const logs = effectOf(markets, tx);
      const receipt = { status, transactionHash: hash, logs };
      chain.receipts.set(hash, receipt as unknown as TransactionReceipt);
      return hash;
    },
  };
  return chain;
}

type FakeChain = ReturnType<typeof fakeChain>;

interface Faults {
  receipt: Error[];
  state: Error[];
}

function fakeSender(chain: FakeChain, faults: Faults): TransactionSender {
  return {
    send: async (input) => ({ transactionId: chain.apply(input), hash: null }),
    state: async (id) => {
      const fault = faults.state.shift();
      if (fault) throw fault;
      return { status: "confirmed", hash: id };
    },
  };
}

function fakeReader(
  chain: FakeChain,
  faults: Faults,
  adapter: VaultAdapter,
): ChainReader {
  return {
    receipt: async (hash) => {
      const fault = faults.receipt.shift();
      if (fault) throw fault;
      const receipt = chain.receipts.get(hash);
      if (!receipt) throw new Error("missing receipt");
      return receipt;
    },
    adapter: (venueId) => (venueId === VENUE.id ? adapter : undefined),
  };
}

const fakePrices: PriceSource = {
  priceUsd: async (symbol) => PRICES[symbol],
  valueUsd: async (symbol, amountBase) => {
    const decimals = symbol === "WETH" ? 18 : 6;
    const valueUsd = (Number(amountBase) / 10 ** decimals) * PRICES[symbol];
    return { valueUsd, priced: true };
  },
};

function createWorld() {
  const markets: MemoryMarkets = new Map(
    ["USDC", "WETH"].map((symbol) => [
      symbol,
      { units: 0n, rateRay: RATE, availableAssets: 10n ** 30n },
    ]),
  );
  const adapter = memoryAdapter(VENUE, markets);
  const state: MemoryState = {
    executions: new Map(),
    lots: [],
    ledger: [],
    leased: new Set(),
  };
  const chain = fakeChain(markets);
  const faults: Faults = { receipt: [], state: [] };
  const ports: RunnerPorts = {
    store: memoryStore(state),
    sender: fakeSender(chain, faults),
    chain: fakeReader(chain, faults, adapter),
    prices: fakePrices,
    swaps: {
      quote: async (request) => ({ fee: 3000, amountOut: request.expectedOut }),
      slippageBps: () => 50,
    },
    advanceBridging: async () => {},
  };
  return { ports, markets, adapter, chain, faults, ...state };
}

type World = ReturnType<typeof createWorld>;

function addExecution(
  world: World,
  id: string,
  kind: string,
  steps: PlannedStep[],
) {
  world.executions.set(id, {
    execution: executionRow(id, kind),
    steps: steps.map((step) => stepRow(id, step)),
  });
}

async function drive(world: World, id: string) {
  for (let tick = 0; tick < 50; tick++) {
    if (world.executions.get(id)?.execution.status !== "executing") return;
    await advanceWith(world.ports, id);
  }
  throw new Error("execution did not finish");
}

function statusOf(world: World, id: string) {
  return world.executions.get(id)?.execution.status;
}

function unitsBySymbol(world: World) {
  return Object.fromEntries(
    ["USDC", "WETH"].map((symbol) => [
      symbol,
      world.lots
        .filter((lot) => lot.assetSymbol === symbol)
        .reduce((sum, lot) => sum + lot.units, 0n),
    ]),
  );
}

async function withdrawFraction(world: World, id: string, fraction: number) {
  const totals = world.lots.map((lot) => ({ ...lot }));
  const merged = [
    ...Map.groupBy(totals, (lot) => lot.assetSymbol).values(),
  ].map((group) => ({
    ...group[0],
    units: group.reduce((sum, lot) => sum + lot.units, 0n),
  }));
  const holdings = await Promise.all(
    indexLotGroups(merged, "index-1").map(async ({ lot, otherUnits }) => {
      const read = await world.adapter.readHolding(
        WALLET.address,
        lot.assetSymbol,
      );
      return { ...lot, otherUnits, rateRay: read.rateRay, exit: world.adapter };
    }),
  );
  addExecution(
    world,
    id,
    "withdraw",
    withdrawSteps(planWithdrawLegs(holdings, fraction)),
  );
  await drive(world, id);
}

function depositPlan(amountBase: bigint) {
  return planDeposit({
    depositAsset: "USDC",
    depositAmountBase: amountBase,
    slices: [
      { assetSymbol: "USDC", weightBps: 5000, venueId: "aave-v3" },
      { assetSymbol: "WETH", weightBps: 5000, venueId: "aave-v3" },
    ],
  });
}

test("a deposit plan runs approve, swap, approve, supply and records lots", async () => {
  const world = createWorld();
  const plan = depositPlan(100_000_000n);
  addExecution(world, "dep", "deposit", plan);
  await drive(world, "dep");
  assert.equal(statusOf(world, "dep"), "succeeded");
  assert.deepEqual(
    plan.map((step) => step.kind),
    ["approve", "supply", "approve", "swap", "approve", "supply"],
  );
  const wethOut = (25n * 10n ** 15n * 9950n) / 10000n;
  assert.deepEqual(unitsBySymbol(world), {
    USDC: (50_000_000n * RAY) / RATE,
    WETH: (wethOut * RAY) / RATE,
  });
  assert.deepEqual(
    world.ledger.map((row) => [row.direction, row.assetSymbol, row.amountBase]),
    [
      ["in", "USDC", 50_000_000n],
      ["in", "WETH", wethOut],
    ],
  );
  assert.equal(world.ledger[1]?.valueUsd, 49.75);
  assert.equal(world.leased.size, 0);
});

test("withdrawing 50% then 100% empties the lots and writes out rows", async () => {
  const world = createWorld();
  addExecution(world, "dep", "deposit", depositPlan(100_000_000n));
  await drive(world, "dep");
  const before = unitsBySymbol(world);
  await withdrawFraction(world, "half", 0.5);
  assert.equal(statusOf(world, "half"), "succeeded");
  const half = unitsBySymbol(world);
  for (const symbol of ["USDC", "WETH"]) {
    const remaining = half[symbol] ?? 0n;
    const expected = (before[symbol] ?? 0n) - (before[symbol] ?? 0n) / 2n;
    assert.ok(remaining >= expected - 1n && remaining <= expected + 1n);
  }
  await withdrawFraction(world, "all", 1);
  assert.equal(statusOf(world, "all"), "succeeded");
  assert.deepEqual(unitsBySymbol(world), { USDC: 0n, WETH: 0n });
  assert.deepEqual(
    [...world.markets.values()].map((market) => market.units),
    [0n, 0n],
  );
  const outs = world.ledger.filter((row) => row.direction === "out");
  assert.equal(outs.length, 4);
  assert.ok(outs.every((row) => row.amountBase > 0n));
});

test("a transient RPC error leaves the step sent and the next tick records it", async () => {
  const world = createWorld();
  addExecution(world, "dep", "deposit", depositPlan(10_000_000n).slice(0, 2));
  for (let tick = 0; tick < 3; tick++) await advanceWith(world.ports, "dep");
  world.faults.receipt.push(
    new HttpRequestError({ url: "https://rpc.invalid", status: 503 }),
  );
  await advanceWith(world.ports, "dep");
  const supply = world.executions.get("dep")?.steps[1];
  assert.equal(statusOf(world, "dep"), "executing");
  assert.equal(supply?.status, "sent");
  assert.match(supply?.lastError ?? "", /HttpRequestError/);
  assert.doesNotMatch(supply?.lastError ?? "", /rpc\.invalid/);
  assert.equal(world.lots.length, 0);
  assert.equal(world.leased.size, 0);
  world.faults.state.push(
    Object.assign(new Error("Bad gateway"), { status: 502 }),
  );
  await advanceWith(world.ports, "dep");
  assert.equal(statusOf(world, "dep"), "executing");
  await advanceWith(world.ports, "dep");
  assert.equal(statusOf(world, "dep"), "succeeded");
  assert.equal(world.lots.length, 1);
  assert.equal(world.ledger.length, 1);
});

test("a reverted transaction fails the execution", async () => {
  const world = createWorld();
  addExecution(world, "dep", "deposit", depositPlan(10_000_000n).slice(0, 2));
  world.chain.revertNext = true;
  await drive(world, "dep");
  assert.equal(statusOf(world, "dep"), "failed");
  assert.equal(world.executions.get("dep")?.steps[0]?.status, "failed");
  assert.equal(world.lots.length, 0);
});
