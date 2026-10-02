# Server-side user administration (detail)

All REST calls use Basic auth `PRIVY_APP_ID:PRIVY_APP_SECRET` plus header `privy-app-id: PRIVY_APP_ID`. Never call these from the browser.

## Lookups (@privy-io/node, `privy.users()`)

| Method | Param |
| - | - |
| `get({ id_token })` | identity token (recommended for the current user) |
| `_get(userId)` | Privy DID |
| `list({ cursor?, limit? })` | auto-paginate with `for await`, or `page.hasNextPage()` / `page.getNextPage()` |
| `getByEmailAddress` | `{ address }` |
| `getByPhoneNumber` | `{ number }` |
| `getByWalletAddress` | `{ address }` |
| `getBySmartWalletAddress` | `{ address }` |
| `getByCustomAuthID` | `{ custom_user_id }` |
| `getByFarcasterID` | `{ fid }` |
| `getByTwitterSubject` / `getByTwitterUsername` | `{ subject }` / `{ username }` |
| `getByDiscordUsername` / `getByGitHubUsername` / `getByTelegramUsername` | `{ username }` |
| `getByTelegramUserID` | `{ telegram_user_id }` |
| `search` | `{ searchTerm }` or `{ emails, phoneNumbers, walletAddresses }` (all three arrays required in that variant) |

All throw on not found / error; wrap in try/catch.

Search via REST: `POST https://api.privy.io/v1/users/search` with the same body.

## Create / import

```ts
const user = await privy.users().create({
  linked_accounts: [{ type: 'email', address: 'member@example.com' }],
  wallets: [{ chain_type: 'ethereum' }], // optional pregenerated embedded wallet
  custom_metadata: { source: 'import' },
});
```

REST: `POST https://api.privy.io/v1/users`. For an external auth system use `linked_accounts: [{ type: 'custom_auth', custom_user_id }]`. Batch import: verify in docs: https://docs.privy.io/user-management/migrating-users-to-privy/create-or-import-a-batch-of-users.md

## Custom metadata via REST

- Replace: `POST https://auth.privy.io/api/v1/users/<did>/custom_metadata` body `{ "custom_metadata": {...} }`
- Partial merge (top-level keys only, others preserved): `PATCH` same URL. Not available in the SDK (SDK `setCustomMetadata` replaces).
- 1KB max; values string, number, boolean.

## Unlink via REST

`POST https://auth.privy.io/api/v1/apps/<app-id>/users/unlink`

```json
{ "user_id": "did:privy:...", "type": "wallet", "handle": "0x..." }
```

`type`: `email`, `phone`, `wallet`, `smart_wallet`, `farcaster`, `telegram`, `cross_app` (also needs `provider: "privy:<id>"`), or `<provider>_oauth` (google, discord, twitter, github, linkedin, apple, spotify, instagram, tiktok) with `handle` = subject. Not supported: `passkey`, `custom_auth`, `guest`. 400 if no matching account.

SDK equivalent present in `@privy-io/node@0.35.0` types: `privy.users().unlinkLinkedAccount(userId, { type, handle, provider? })` (not shown on the docs page; confirm against installed version).

## Delete

`await privy.users().delete(userId)`. Irreversible in practice: next login gets a new DID, new embedded wallet address, accounts must be relinked; old wallet is archived (soft delete) and recovery is not guaranteed. Use freeze for reversible suspension.

## Freeze / unfreeze (REST only)

- Freeze: `POST https://api.privy.io/v1/users/<did>/freeze` body `{}` -> `{ "success": true }`
- Unfreeze: `DELETE` same URL with body `{}`
- Effect: blocks login, revokes sessions, blocks token refresh. Existing access tokens stay valid until expiry, so backend verification alone does not enforce a freeze (check `frozen_at` if needed).
- `frozen_at` (unix seconds or null) is only returned by `GET https://api.privy.io/v1/users/<did>`.
- Idempotent; 404 for unknown user; retry 5xx.

| Control | Keyed by | Reversible | Revokes sessions |
| - | - | - | - |
| Freeze | Privy user ID | yes | yes |
| Denylist | email / phone / wallet | yes | no |
| Delete | Privy user ID | no | yes |

## Allowlist

Enable in Dashboard: Users > Access Control. Existing users keep access; new users must be on the list. Applies to email, SMS, wallet, OAuth with verified email (not Telegram/Farcaster).

```ts
await privy.apps().inviteToAllowlist({ type: 'email', value: 'early@example.com' }); // type: 'email' | 'phone' | 'wallet'
await privy.apps().removeFromAllowlist({ type: 'email', value: 'early@example.com' });
const entries = await privy.apps().getAllowlist();
```

Removing an entry does not revoke a user who already logged in: delete (or freeze) the user instead.

## Denylist (REST only)

Enable in Dashboard first (requests fail otherwise).

`POST https://auth.privy.io/api/v1/apps/<app-id>/denylist` body `{ "type": "email" | "emailDomain" | "phoneNumber" | "ethereumAddress" | "solanaAddress", "value": "..." }`. Removal and listing: verify in docs: https://docs.privy.io/user-management/users/managing-users/denylist.md

## Webhook delivery facts

- Svix, at-least-once, dedupe with `idempotency_key` where present.
- Retries: immediately, 5s, 5m, 30m, 2h, 5h, 10h, 10h. Endpoint disabled after 5 consecutive days of failures.
- Source IPs: 44.228.126.217, 50.112.21.217, 52.24.126.164, 54.148.139.208, 2600:1f24:64:8000::/56.
- Any non-2xx (including 3xx) counts as failure.
- Payload schemas per event: https://docs.privy.io/api-reference/webhooks/user/created.md (and sibling pages).
