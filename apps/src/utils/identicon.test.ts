import assert from "node:assert/strict";
import { test } from "node:test";
import { identiconCells } from "./identicon.ts";

const ADDRESS = "0x0E5cC5a1b9d27F4c3E8A61dB04f2C08f";

test("identiconCells is deterministic and mirrored", () => {
  const cells = identiconCells(ADDRESS);
  assert.deepEqual(cells, identiconCells(ADDRESS));
  for (let row = 0; row < 5; row += 1) {
    assert.equal(cells[row * 5], cells[row * 5 + 4]);
    assert.equal(cells[row * 5 + 1], cells[row * 5 + 3]);
  }
});
