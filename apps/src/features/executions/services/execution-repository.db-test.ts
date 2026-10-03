import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { executions, indexes, users } from "@/lib/db/schema";
import { ExecutionRequestError } from "../types.ts";
import type { PlannedStep } from "../utils/plan.ts";
import {
  cancelUnsentBridging,
  createBridgingExecution,
  createExecution,
  finishExecution,
  landBridgedExecution,
  loadExecution,
  recordOriginTx,
  transitionExecution,
} from "./execution-repository.ts";

const userIds: string[] = [];
let indexId = "";

const STEP: PlannedStep = {
  position: 0,
  kind: "supply",
  assetSymbol: "USDC",
  venueId: "aave-v3",
  spender: null,
  amountBase: "1000000",
  amountFromPosition: null,
};

async function newUser(): Promise<string> {
  const [row] = await db()
    .insert(users)
    .values({ privyDid: `db-test:${randomUUID()}` })
    .returning({ id: users.id });
  userIds.push(row.id);
  return row.id;
}

function depositFor(userId: string) {
  return createExecution({
    kind: "deposit",
    userId,
    indexId,
    depositAsset: "USDC",
    depositAmountBase: 1_000_000n,
    valueUsd: 1,
    steps: [STEP],
  });
}

function bridgingFor(userId: string) {
  return createBridgingExecution({
    userId,
    indexId,
    valueUsd: 1,
    estimatedLandedBase: 990_000n,
    originChain: "base",
    originAssetId: "nep141:base-usdc",
    originAmountBase: 1_000_000n,
    depositAddress: "0x0000000000000000000000000000000000000001",
    depositMemo: null,
    deadline: new Date(Date.now() + 600_000),
  });
}

async function statusOf(id: string): Promise<string | undefined> {
  return (await loadExecution(id))?.execution.status;
}

before(async () => {
  const [index] = await db().select({ id: indexes.id }).from(indexes).limit(1);
  assert.ok(index, "Seed the indexes first (pnpm db:seed).");
  indexId = index.id;
});

after(async () => {
  if (userIds.length > 0) {
    await db().delete(executions).where(inArray(executions.userId, userIds));
    await db().delete(users).where(inArray(users.id, userIds));
  }
  await db().$client.end();
});

test("two concurrent starts for one user: exactly one wins", async () => {
  const userId = await newUser();
  const results = await Promise.allSettled([
    depositFor(userId),
    bridgingFor(userId),
    depositFor(userId),
  ]);
  const won = results.filter((r) => r.status === "fulfilled");
  const lost = results.filter((r) => r.status === "rejected");
  assert.equal(won.length, 1);
  for (const result of lost) {
    assert.ok(result.reason instanceof ExecutionRequestError);
    assert.equal(result.reason.status, 409);
    assert.equal(result.reason.code, "BUSY");
  }
});

test("a finished execution frees the user for the next one", async () => {
  const userId = await newUser();
  const first = await depositFor(userId);
  await finishExecution(first.id, "succeeded");
  const second = await depositFor(userId);
  assert.equal(await statusOf(second.id), "executing");
});

test("a landed bridge moves to executing with its steps, once", async () => {
  const execution = await bridgingFor(await newUser());
  const landing = { id: execution.id, landedBase: 985_000n, steps: [STEP] };
  assert.equal(await landBridgedExecution(landing), true);
  assert.equal(await landBridgedExecution(landing), false);
  const loaded = await loadExecution(execution.id);
  assert.equal(loaded?.execution.status, "executing");
  assert.equal(loaded?.execution.depositAmountBase, "985000");
  assert.equal(loaded?.execution.auroraStatus, "SUCCESS");
  assert.equal(loaded?.steps.length, 1);
});

test("only an unsent bridging deposit can be cancelled", async () => {
  const unsent = await bridgingFor(await newUser());
  assert.equal(await cancelUnsentBridging(unsent.id), true);
  assert.equal(await statusOf(unsent.id), "cancelled");

  const sent = await bridgingFor(await newUser());
  await recordOriginTx(sent.id, `0x${"ab".repeat(32)}`);
  assert.equal(await cancelUnsentBridging(sent.id), false);
  assert.equal(await statusOf(sent.id), "bridging");

  const executing = await depositFor(await newUser());
  assert.equal(await cancelUnsentBridging(executing.id), false);
  assert.equal(await statusOf(executing.id), "executing");
});

test("illegal transitions are rejected and leave the status alone", async () => {
  const execution = await depositFor(await newUser());
  for (const to of ["refunded", "cancelled", "bridging"] as const)
    assert.equal(await transitionExecution({ id: execution.id, to }), false);
  assert.equal(await statusOf(execution.id), "executing");
  await finishExecution(execution.id, "failed");
  await finishExecution(execution.id, "succeeded");
  assert.equal(await statusOf(execution.id), "failed");
});

test("a stale unfunded bridge no longer blocks the next deposit", async () => {
  const userId = await newUser();
  const stale = await bridgingFor(userId);
  await db()
    .update(executions)
    .set({ createdAt: new Date(Date.now() - 10 * 60_000) })
    .where(eq(executions.id, stale.id));
  const next = await depositFor(userId);
  assert.equal(await statusOf(stale.id), "cancelled");
  assert.equal(await statusOf(next.id), "executing");
});
