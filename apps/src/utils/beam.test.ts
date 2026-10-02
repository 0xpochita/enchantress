import assert from "node:assert/strict";
import { test } from "node:test";
import {
  beamFrame,
  beamGradientWindow,
  isPhaseDone,
  nextBeamPhase,
} from "./beam.ts";

test("beam phases loop p1, splash, p2, idle", () => {
  assert.equal(nextBeamPhase("p1"), "splash");
  assert.equal(nextBeamPhase("splash"), "p2");
  assert.equal(nextBeamPhase("p2"), "idle");
  assert.equal(nextBeamPhase("idle"), "p1");
});

test("p1 travels to the center and lights the source node early", () => {
  assert.equal(beamFrame("p1", 0).isStackActive, true);
  assert.equal(beamFrame("p1", 800).percentage, 0.5);
  assert.equal(beamFrame("p1", 800).isStackActive, false);
});

test("p2 travels to the end and lights the vault node late", () => {
  assert.equal(beamFrame("p2", 0).percentage, 0.5);
  assert.equal(beamFrame("p2", 800).percentage, 1);
  assert.equal(beamFrame("p2", 800).isShieldActive, true);
});

test("splash hides the beam", () => {
  assert.equal(beamFrame("splash", 100).isBeamVisible, false);
  assert.equal(beamFrame("splash", 100).isSplashing, true);
});

test("isPhaseDone respects each phase duration", () => {
  assert.equal(isPhaseDone("idle", 999), false);
  assert.equal(isPhaseDone("idle", 1000), true);
});

test("beamGradientWindow centers a 10 percent window", () => {
  assert.deepEqual(beamGradientWindow(0.5), { x1: "45%", x2: "55%" });
});
