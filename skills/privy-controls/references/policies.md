# Privy policies reference

Source: https://docs.privy.io/controls/policies/overview.md and linked pages.

## Shape

```ts
{
  version: '1.0',                 // only version
  name: string,
  chain_type: 'ethereum' | 'solana' | 'tron' | 'sui',
  rules: Rule[],
  owner_id?: string,              // key quorum ID; or `owner: {public_key}` (not both)
}
// Rule
{ name: string, method: Method, conditions: Condition[], action: 'ALLOW' | 'DENY' }
// Condition
{ field_source, field, operator, value, abi?, typed_data? }
```

EVM `method` values: `eth_sendTransaction`, `eth_signTransaction`, `eth_signUserOperation`, `eth_signTypedData_v4`, `personal_sign`, `eth_sign7702Authorization`, `wallet_sendCalls`, `exportPrivateKey`, `exportSeedPhrase`, wallet actions `transfer`, `earn_deposit`, `earn_withdraw`, and `*`. For `exportPrivateKey`, leave `conditions` empty.

Operators: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `in` (max 100 values), `in_condition_set`, `contains`, `starts_with`, `ends_with`.

EVM-relevant field sources:

| field_source | fields |
| - | - |
| `ethereum_transaction` | `to`, `value`, `chain_id` (for send/sign tx, userOp, `wallet_sendCalls`) |
| `ethereum_calldata` | `function_name`, `fn.argName` (e.g. `transfer.amount`). **Requires `abi`** (JSON), even for no-arg functions |
| `ethereum_typed_data_domain` | `chainId`, `verifyingContract` |
| `ethereum_typed_data_message` | dot path in `message` (requires `typed_data`) |
| `ethereum_7702_authorization` | `contract` |
| `message` | `content`, `byte_length` (`personal_sign`) |
| `action_request_body` | Transfer: `source.asset`, `source.asset_address`, `source.amount`, `source.chain`, `destination.address`, ...; Earn: `vault_id`, `amount`, `raw_amount` |
| `system` | `current_unix_timestamp` (seconds, as string) |
| `reference` | `aggregation.<aggregation_id>` (stateful; only `eth_signTransaction`, `eth_signUserOperation`) |

## Evaluation

1. Only rules whose `method` matches the request are evaluated.
2. Any matching `DENY` -> denied. Else any matching `ALLOW` -> allowed. Else default **DENY**.
3. A wallet with a policy can only use methods the policy has rules for. Add an "allow all" rule (`conditions: []`, `action: 'ALLOW'`) for methods you want open.
4. Enforced in the enclave. For sign-and-broadcast, simulation runs first (simulation errors mask policy errors).
5. Values are raw: wei, token base units. Hex strings are used in docs (`'0x2386F26FC10000'` = 0.01 ETH).

## Node SDK

```ts
const policy = await privy.policies().create({...});              // POST /v1/policies
await privy.policies().createRule(policyId, {name, method, conditions, action}); // POST /v1/policies/<id>/rules
await privy.policies().updateRule(ruleId, {policy_id: policyId, name, method, conditions, action}); // PATCH /v1/policies/<id>/rules/<rule_id>
await privy.policies().deleteRule(ruleId, {policy_id: policyId});
await privy.policies().update(policyId, {name, rules});          // PATCH /v1/policies/<id> (whole policy)
```

Docs recommend per-rule updates over whole-policy updates to avoid races. If the policy has an owner, PATCH/DELETE need the owner's authorization signature (pass `authorization_context`; check the exact param on https://docs.privy.io/api-reference/policies/update.md).

Attaching a policy:
- Wallet-level: `policy_ids` at wallet create or `PATCH /v1/wallets/<id>` (one policy per wallet).
- Signer-level (override): React `addSigners({signers: [{signerId, policyIds: [id]}]})`, or server `additional_signers: [{signer_id, override_policy_ids: [id]}]`.
- Dashboard: Wallet infrastructure > Policies.

## Ethereum examples (from docs)

Allowlist a contract:
```ts
{field_source: 'ethereum_transaction', field: 'to', operator: 'eq', value: '0xContract'}
```

Max native value (0.01 ETH):
```ts
{field_source: 'ethereum_transaction', field: 'value', operator: 'lte', value: '0x2386F26FC10000'}
```

Restrict chains:
```ts
{field_source: 'ethereum_transaction', field: 'chain_id', operator: 'in', value: ['1', '8453']}
```

Max ERC20 transfer amount (token contract + calldata):
```ts
import {erc20Abi, parseUnits} from 'viem';
const conditions = [
  {field_source: 'ethereum_transaction', field: 'to', operator: 'eq', value: TOKEN_ADDRESS},
  {field_source: 'ethereum_calldata', field: 'transfer.amount', abi: erc20Abi, operator: 'lte', value: parseUnits('1000', 6).toString()}
];
```
(The field must match the function and input names in the ABI you pass.)

Allow a specific function regardless of args:
```ts
{field_source: 'ethereum_calldata', field: 'function_name', abi: depositAbi, operator: 'eq', value: 'deposit'}
```

Denylist recipient: same `to` condition with `action: 'DENY'`.

Restrict `personal_sign` content:
```ts
{method: 'personal_sign', action: 'ALLOW', conditions: [{field_source: 'message', field: 'content', operator: 'eq', value: 'Hello world'}]}
```

Block key export, allow everything else:
```ts
rules: [
  {name: 'Block export', method: 'exportPrivateKey', conditions: [], action: 'DENY'},
  {name: 'Allow rest', method: '*', conditions: [], action: 'ALLOW'}
]
```

Time-bound signer (use as the signer's override policy):
```ts
{name: 'Allow all before date', method: '*', action: 'ALLOW',
 conditions: [{field_source: 'system', field: 'current_unix_timestamp', operator: 'lt', value: '1788840000'}]}
```

Anti-pattern: overlapping ALLOW rules (`value lte 1` and `value lte 5`) means the larger one wins.

More (typed data, EIP-7702, typed-data domain): https://docs.privy.io/controls/policies/example-policies/ethereum.md

## Condition sets (large/dynamic allow/deny lists)

- `POST /v1/condition_sets` `{name, owner_id}` (owner required) -> `id`.
- `POST /v1/condition_sets/<id>/condition_set_items` `[{value: '0x...'}, ...]`.
- Rule condition: `{field_source: 'ethereum_transaction', field: 'to', operator: 'in_condition_set', value: '<condition_set_id>'}`.
- Updating or deleting sets/items requires an authorization signature. Deleting a set makes its conditions `false`.
- EVM address matching via signing field sources is case-insensitive. `action_request_body` is exact.
- API: https://docs.privy.io/api-reference/condition-sets/create.md

## Stateful policies (aggregations)

- Rolling sums of a metric (e.g. `value`, or `transfer.amount` via calldata+ABI) over a window of 3600-259200 s (1h-72h), optional pre-filter `conditions` and `group_by`.
- Max **10 aggregations per app**. Only `eth_signTransaction` and `eth_signUserOperation`.
- Use in rule: `{field_source: 'reference', field: 'aggregation.<id>', operator: 'lte', value: '<cap>'}`. Evaluation is forward-looking (includes the current request).
- Totals update **after** signing, so concurrent requests can all pass. Docs frame this as disaster prevention: pair it with per-tx limits and app-side rate limiting.
- Deleting an aggregation -> conditions `false`.
- API: https://docs.privy.io/api-reference/aggregations/create.md

## Template variables

- `{{wallet.address}}` resolves to the signing wallet's address. Allowed with `eq`/`in` on address fields and in `message` content operators. Not allowed in `in_condition_set` or aggregation conditions.
- Example: ERC20 `transfer.recipient` `eq` `'{{wallet.address}}'` means "only transfer to self".
