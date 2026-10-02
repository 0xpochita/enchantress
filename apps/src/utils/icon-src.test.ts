import assert from "node:assert/strict";
import { test } from "node:test";
import { iconSrc } from "./icon-src.ts";

test("iconSrc maps bare keys to svg files and keeps explicit paths", () => {
  assert.equal(iconSrc("usdc"), "/crypto/usdc.svg");
  assert.equal(iconSrc("/crypto/aave.png"), "/crypto/aave.png");
});
