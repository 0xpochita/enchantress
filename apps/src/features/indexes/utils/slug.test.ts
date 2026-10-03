import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify, uniqueSlug } from "./slug.ts";

test("slugify keeps lowercase letters and digits joined by dashes", () => {
  assert.equal(slugify("  My Monad Yield #2! "), "my-monad-yield-2");
  assert.equal(slugify("Café Crème"), "cafe-creme");
});

test("slugify falls back when nothing usable is left", () => {
  assert.equal(slugify("🚀🚀🚀"), "index");
});

test("slugify caps the length without a trailing dash", () => {
  const slug = slugify(`${"a".repeat(47)} b`);
  assert.equal(slug, "a".repeat(47));
});

test("uniqueSlug appends the first free numeric suffix", () => {
  assert.equal(uniqueSlug("eth-yield", []), "eth-yield");
  assert.equal(uniqueSlug("eth-yield", ["eth-yield"]), "eth-yield-2");
  assert.equal(
    uniqueSlug("eth-yield", ["eth-yield", "eth-yield-2", "eth-yield-4"]),
    "eth-yield-3",
  );
});
