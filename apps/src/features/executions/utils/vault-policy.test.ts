import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { UNISWAP_MONAD } from "../../chain/abis/uniswap.ts";
import { buildVaultPolicyRules, vaultSpenders } from "./vault-policy.ts";

test("every rule is pinned to Monad with zero native value", () => {
  for (const rule of buildVaultPolicyRules()) {
    const chain = rule.conditions.find((c) => c.field === "chain_id");
    const value = rule.conditions.find((c) => c.field === "value");
    assert.deepEqual([chain?.value, value?.value], ["143", "0x0"]);
    assert.equal(rule.action, "ALLOW");
    assert.equal(rule.method, "eth_sendTransaction");
  }
});

test("approvals may only target vault contracts and the swap router", () => {
  const approve = buildVaultPolicyRules()[0];
  const spender = approve.conditions.find((c) => c.field === "approve.spender");
  assert.deepEqual(spender?.value, [
    ...vaultSpenders(),
    UNISWAP_MONAD.swapRouter02,
  ]);
  assert.ok(approve.conditions.every((c) => c.field !== "transfer.recipient"));
});

test("every outbound action is forced back to the signing wallet", () => {
  const selfFields = buildVaultPolicyRules()
    .flatMap((rule) => rule.conditions)
    .filter((c) => c.value === "{{wallet.address}}")
    .map((c) => c.field);
  assert.deepEqual(selfFields, [
    "supply.onBehalfOf",
    "withdraw.to",
    "deposit.receiver",
    "redeem.receiver",
    "redeem.owner",
    "exactInputSingle.params.recipient",
  ]);
});

test("rules stay byte-identical to the live Privy policy", () => {
  const json = JSON.stringify(buildVaultPolicyRules());
  assert.equal(
    createHash("sha256").update(json).digest("hex"),
    "05ac9c6f08931036eaebd34e750fad3fa7129cad6a909284d91df98b19d5ea83",
  );
});
