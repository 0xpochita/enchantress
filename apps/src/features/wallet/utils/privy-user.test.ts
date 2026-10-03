import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bearerToken,
  isTokenRejection,
  summarizePrivyAccounts,
} from "./privy-user.ts";

function errorWithCode(code: string): Error {
  return Object.assign(new Error(code), { code });
}

test("isTokenRejection flags bad tokens but not infrastructure failures", () => {
  assert.equal(isTokenRejection(errorWithCode("ERR_JWT_EXPIRED")), true);
  assert.equal(
    isTokenRejection(errorWithCode("ERR_JWS_SIGNATURE_VERIFICATION_FAILED")),
    true,
  );
  assert.equal(isTokenRejection(errorWithCode("ERR_JWKS_TIMEOUT")), false);
  assert.equal(isTokenRejection(new TypeError("fetch failed")), false);
  assert.equal(isTokenRejection("ERR_JWT_EXPIRED"), false);
});

test("summarizePrivyAccounts picks the email and the embedded EVM wallet", () => {
  const summary = summarizePrivyAccounts([
    { type: "wallet", address: "0xEXT", wallet_client_type: "metamask" },
    { type: "email", address: "me@example.com" },
    {
      type: "wallet",
      id: "wallet-1",
      address: "0xAbC",
      wallet_client_type: "privy",
      chain_type: "ethereum",
      delegated: true,
    },
  ]);
  assert.deepEqual(summary, {
    email: "me@example.com",
    walletId: "wallet-1",
    walletAddress: "0xabc",
    isDelegated: true,
  });
});

test("summarizePrivyAccounts returns nulls before the wallet exists", () => {
  assert.deepEqual(summarizePrivyAccounts([]), {
    email: null,
    walletId: null,
    walletAddress: null,
    isDelegated: false,
  });
});

test("bearerToken accepts only a well formed bearer header", () => {
  assert.equal(bearerToken("Bearer abc.def"), "abc.def");
  assert.equal(bearerToken("bearer abc"), "abc");
  assert.equal(bearerToken("Basic abc"), null);
  assert.equal(bearerToken(null), null);
});
