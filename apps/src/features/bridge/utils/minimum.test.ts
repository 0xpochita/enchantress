import assert from "node:assert/strict";
import { test } from "node:test";
import { minimumAmountMessage } from "./minimum.ts";

test("minimumAmountMessage turns Aurora base units into a readable minimum", () => {
  assert.equal(
    minimumAmountMessage(
      "Amount is too low for bridge, try at least 150000",
      6,
      "USDC",
    ),
    "Minimum 0.15 USDC",
  );
  assert.equal(minimumAmountMessage("Rate limited", 6, "USDC"), null);
});
