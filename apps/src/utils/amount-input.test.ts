import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanAmountInput } from "./amount-input.ts";

test("cleanAmountInput keeps one decimal point and the token's precision", () => {
  assert.equal(cleanAmountInput("1.2.3"), "1.23");
  assert.equal(cleanAmountInput("abc12"), "12");
  assert.equal(cleanAmountInput(".5"), "0.5");
  assert.equal(cleanAmountInput("0,25"), "0.25");
  assert.equal(cleanAmountInput("1.1234567", 6), "1.123456");
  assert.equal(cleanAmountInput("3."), "3.");
});
