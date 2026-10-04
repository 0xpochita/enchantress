import assert from "node:assert/strict";
import { test } from "node:test";
import { isOfferedForNewIndex } from "./tokens.ts";

test("offers swappable Monad assets for new indexes", () => {
  for (const symbol of ["USDC", "USDT0", "WETH", "WMON", "WBTC"])
    assert.equal(isOfferedForNewIndex(symbol), true, symbol);
});

test("closes AUSD, cbBTC and unknown symbols to new indexes", () => {
  for (const symbol of ["AUSD", "cbBTC", "DAI"])
    assert.equal(isOfferedForNewIndex(symbol), false, symbol);
});
