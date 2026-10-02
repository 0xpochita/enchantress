# Server wallets: @privy-io/node and REST detail

All REST calls: base `https://api.privy.io`, headers `Authorization: Basic base64(appId:appSecret)` + `privy-app-id`. Node SDK methods mirror the REST endpoints.

## Endpoints (wallet create/get)

| Action | Node | REST |
| - | - | - |
| Create | `privy.wallets().create({...})` | `POST /v1/wallets` |
| Create batch | verify in docs | `POST` see https://docs.privy.io/api-reference/wallets/batch-create.md |
| Get by ID | `privy.wallets().get(walletId)` | `GET /v1/wallets/{wallet_id}` |
| List (paginated) | `for await (const w of privy.wallets().list({...}))` | `GET /v1/wallets?cursor=&limit=` |
| Get by address | verify in docs | `POST /v1/wallets/address` body `{address, include_archived?}` |
| Import (private key) | `privy.wallets().import({wallet: {...}})` | `POST /v1/wallets/import/init` then `POST /v1/wallets/import/submit` |
| Create user + wallet in one call | `privy.users().create({linked_accounts, ...})` | `POST /v1/users` with `wallets: [{chain_type}]` |

## POST /v1/wallets body

| Field | Type | Notes |
| - | - | - |
| `chain_type` (required) | see enum in SKILL.md | `'ethereum'` for all EVM chains incl. Monad |
| `owner` | `{user_id} \| {public_key} \| null` | do not combine with `owner_id` |
| `owner_id` | `string \| null` | key quorum ID |
| `entity` | `{id, type: 'user' \| 'organization'}` | attribution only, permanent; org entity without owner -> org default key quorum becomes owner |
| `policy_ids` | `string[]` | currently max one policy per wallet |
| `additional_signers` | `{signer_id}[]` | key quorum IDs |
| `idempotency_key` | `string` | safe retries |
| `external_id` | `string` | unique per app, `[A-Za-z0-9_-]`, max 64, write-once |
| `display_name` | `string` | max 100, editable |

Response: `{id, address, chain_type, policy_ids, owner_id, entity, additional_signers, created_at (ms), external_id, display_name}`. When `owner` is a user ID or public key, `owner_id` in the response is a newly created key quorum containing it.

## List query params

`cursor`, `limit` (max 100), `chain_type`, `address`, `user_id`, `entity_id`, `authorization_key` (P-256 base64 DER, not with `user_id`), `external_id`. Response `{data: Wallet[], next_cursor}`.

## Node examples

```ts
import {privy} from '@/lib/privy-server';

// Create user + their wallet from backend (e.g. pregenerate before first login)
const user = await privy.users().create({
  linked_accounts: [{type: 'email', address: 'user@example.com'}]
});
const {id, address, chain_type} = await privy.wallets().create({
  chain_type: 'ethereum',
  owner: {user_id: user.id}
});

// Wallets attributed to a user/org
for await (const wallet of privy.wallets().list({entity_id: 'cm7zx4k9a0000l308abcd1234'})) {
  console.log(wallet.id, wallet.address);
}

// Import an existing EVM key (hex with or without 0x, or Uint8Array). SDK encrypts it for the TEE.
const imported = await privy.wallets().import({
  wallet: {
    entropy_type: 'private-key',
    chain_type: 'ethereum',
    address: '0x...',
    private_key: process.env.IMPORT_PRIVATE_KEY ?? ''
  }
});
```

## Send a transaction (shown for chain selection only; full tx docs belong to the transactions skill)

```ts
const res = await privy.wallets().ethereum().sendTransaction(walletId, {
  caip2: 'eip155:11155111', // chain chosen here, per request
  params: {
    transaction: {
      to: recipientAddress,
      value: '0x1',
      chain_id: 11_155_111
    }
  }
});
console.log(res.hash);
```

REST equivalent: `POST /v1/wallets/{wallet_id}/rpc` with `{method: 'eth_sendTransaction', caip2, chain_type: 'ethereum', params: {transaction: {...}}}`. Response `data: {hash, caip2, transaction_id}`.

If the wallet has an authorization-key owner, requests must include `privy-authorization-signature` (see https://docs.privy.io/api-reference/authorization-signatures.md). Covered by the signers/policies skill.

## Sources

- https://docs.privy.io/wallets/wallets/create/create-a-wallet.md
- https://docs.privy.io/api-reference/wallets/create.md
- https://docs.privy.io/api-reference/wallets/get.md
- https://docs.privy.io/api-reference/wallets/get-all.md
- https://docs.privy.io/api-reference/wallets/get-by-address.md
- https://docs.privy.io/wallets/wallets/get-a-wallet/get-all-wallets.md
- https://docs.privy.io/wallets/wallets/import-a-wallet/private-key.md
- https://docs.privy.io/basics/nodeJS/quickstart.md
- https://docs.privy.io/basics/rest-api/quickstart.md
