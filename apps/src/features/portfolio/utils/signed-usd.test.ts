import assert from "node:assert/strict";
import { test } from "node:test";
import { formatSignedUsd } from "./signed-usd.ts";

test("sub-cent losses read as zero instead of -$0.00", () => {
  assert.equal(formatSignedUsd(-0.002), formatSignedUsd(0));
  assert.ok(formatSignedUsd(0).startsWith("+"));
});

test("real gains and losses keep their sign", () => {
  assert.ok(formatSignedUsd(1.5).startsWith("+"));
  assert.ok(formatSignedUsd(-1.5).startsWith("-"));
});
