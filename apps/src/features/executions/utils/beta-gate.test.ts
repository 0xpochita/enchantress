import assert from "node:assert/strict";
import { test } from "node:test";
import { checkBetaGate } from "./beta-gate.ts";

const base = {
  email: "Me@Example.com",
  allowlist: [] as string[],
  spentTodayUsd: 0,
  valueUsd: 50,
  maxPerDayUsd: 100,
};

test("checkBetaGate allows within the daily cap and open allowlist", () => {
  assert.deepEqual(checkBetaGate(base), { ok: true });
});

test("checkBetaGate enforces the allowlist case insensitively", () => {
  assert.equal(
    checkBetaGate({ ...base, allowlist: ["me@example.com"] }).ok,
    true,
  );
  assert.equal(
    checkBetaGate({ ...base, allowlist: ["other@example.com"] }).ok,
    false,
  );
  assert.equal(
    checkBetaGate({ ...base, email: null, allowlist: ["x@y.z"] }).ok,
    false,
  );
});

test("checkBetaGate rejects deposits over the remaining daily amount", () => {
  const result = checkBetaGate({ ...base, spentTodayUsd: 80 });
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.reason, /\$20\.00 more today/);
});
