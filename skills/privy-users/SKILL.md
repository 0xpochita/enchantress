---
name: privy-users
description: Privy user management beyond login. Covers linking and unlinking login methods on one user (useLinkAccount, useUnlink*, updateEmail/updatePhone), custom metadata, server-side user management with @privy-io/node (verify access tokens and identity tokens in a Next.js route handler or server action, get/list/search/create/delete users, freeze, allowlist/denylist), user webhooks (Svix-signed, webhooks().verify), organization wallets (organizations, default key quorum, additional signers, intents, approvals) and KYC/KYB via Bridge. Load when the task mentions "link account", "unlink", "linkedAccounts", "custom metadata", "verifyAccessToken", "identity token", "privy-token cookie", "privy-id-token", "get user by wallet", "delete user", "freeze user", "allowlist", "denylist", "user webhook", "organization wallet", "key quorum", "intent approval", "KYC", "KYB", or "Bridge verification".
---

# Privy users (link, manage, organizations, KYC/KYB)

Login is out of scope (see the base `privy` skill). This skill is what happens to a user after login.

## Concepts

- **User**: one Privy DID (`did:privy:...`) with `linkedAccounts` (email, phone, wallets, OAuth, passkeys...), optional `customMetadata`, `createdAt`. React: `usePrivy().user` (camelCase). Node/REST: `User` with `linked_accounts`, `custom_metadata`, `created_at` (snake_case).
- **Access token**: ES256 JWT, ~1h, proves "this request is from authenticated user X". Verify on every protected backend call.
- **Identity token**: JWT carrying `linked_accounts` + `custom_metadata`. Use it when the server needs user data (which wallet/email belongs to the caller). Must be enabled in Dashboard: User management > Authentication > Advanced > "Return user data in an identity token".
- **Organization**: business object with `display_name` + `default_key_quorum_id`. Wallets get `entity: {type: 'organization', id}`; the default key quorum owns them. Actions go through **intents** approved asynchronously.
- **Entity vs owner**: entity = who the wallet is for (user/org, immutable). Owner = who can authorize (user, key, key quorum, mutable). KYC/KYB is checked against the entity.

## Setup: one shared server client

```ts
// apps/<app>/lib/privy-server.ts
import 'server-only';
import { PrivyClient } from '@privy-io/node';

const appId = process.env.PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;
if (!appId || !appSecret) throw new Error('PRIVY_APP_ID / PRIVY_APP_SECRET missing');

export const privy = new PrivyClient({
  appId,
  appSecret,
  // Optional: copy from Dashboard > Configuration > App settings to skip the key fetch.
  jwtVerificationKey: process.env.PRIVY_JWT_VERIFICATION_KEY,
  // Needed only for webhooks().verify
  webhookSigningSecret: process.env.PRIVY_WEBHOOK_SIGNING_SECRET,
});
```

Install: `pnpm add @privy-io/node@latest`.

## Verify the caller (Next.js App Router)

Client sends the token: `const token = await getAccessToken()` (from `usePrivy`), then `Authorization: Bearer ${token}`. If the app uses HTTP-only cookies, the token is already in the `privy-token` cookie (same domain) and the fetch only needs `credentials: 'include'`.

```ts
// apps/<app>/lib/auth.ts
import 'server-only';
import { cookies, headers } from 'next/headers';
import { privy } from './privy-server';

export async function requireUserId(): Promise<string> {
  const bearer = (await headers()).get('authorization')?.replace('Bearer ', '');
  const token = bearer ?? (await cookies()).get('privy-token')?.value;
  if (!token) throw new Error('unauthenticated');
  // Throws if invalid/expired/other app. Never treat a throw as authorized.
  const claims = await privy.utils().auth().verifyAccessToken(token);
  return claims.user_id; // Privy DID
}
```

```ts
// app/api/me/route.ts
import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await requireUserId();
    return NextResponse.json({ userId });
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
}
```

Gotcha (SDK vs docs): the docs page shows `verifyAccessToken({ access_token })` returning camelCase `userId`. The published `@privy-io/node@0.35.0` types take a plain string and return snake_case `{ app_id, user_id, session_id, issuer, issued_at, expiration }`. Check the installed version's `.d.ts` before copying either form.

Server actions: same `requireUserId()` works only when the token reaches the server as the `privy-token` cookie (HTTP-only cookie mode). Otherwise pass the token as an action argument and verify it.

Expired token: return 401, client calls `getAccessToken()` again (it refreshes). Frozen users keep valid tokens until expiry; verification alone does not enforce a freeze.

### Identity token (user data on the server)

Cookie `privy-id-token` is set automatically once enabled (set a base domain so it is HttpOnly). Without cookies: `useIdentityToken().identityToken` or `getIdentityToken()` and send header `privy-id-token`.

```ts
import { cookies } from 'next/headers';
import type { User } from '@privy-io/node';
import { privy } from '@/lib/privy-server';

export async function currentUser(): Promise<User | null> {
  const idToken = (await cookies()).get('privy-id-token')?.value;
  if (!idToken) return null;
  return privy.users().get({ id_token: idToken }); // verifies signature + parses
}
```

Refresh after changes: `useUser().refreshUser()` (React). A new identity token is also issued on login, link/unlink, page refresh, and access-token refresh.

## Link / unlink / update accounts (React)

```tsx
'use client';
import { useLinkAccount, useUnlinkWallet, usePrivy } from '@privy-io/react-auth';

export function LinkedAccounts() {
  const { user } = usePrivy();
  const { linkEmail, linkGoogle, linkWallet } = useLinkAccount({
    onSuccess: ({ linkedAccount }) => console.log('linked', linkedAccount),
    onError: (error) => console.error(error),
  });
  const { unlink: unlinkWallet } = useUnlinkWallet();

  const external = user?.linkedAccounts.filter(
    (a) => a.type === 'wallet' && a.walletClientType !== 'privy',
  );

  return (
    <>
      <button onClick={linkEmail}>Link email</button>
      <button onClick={linkGoogle}>Link Google</button>
      <button onClick={linkWallet}>Link wallet</button>
      {external?.map((w) =>
        w.type === 'wallet' ? (
          <button key={w.address} onClick={() => unlinkWallet({ address: w.address })}>
            Unlink {w.address}
          </button>
        ) : null,
      )}
    </>
  );
}
```

- Link methods on `useLinkAccount`: `linkEmail`, `linkPhone`, `linkWallet`, `linkGoogle`, `linkApple`, `linkTwitter`, `linkDiscord`, `linkGithub`, `linkLinkedIn`, `linkTiktok`, `linkSpotify`, `linkInstagram`, `linkTelegram`, `linkFarcaster`, `linkPasskey({ name? })`, `linkTwitch`, `linkLine`, `linkOAuth({ provider: 'custom:<name>' })`. Custom JWT: `useLinkJwtAccount().linkWithCustomJwt(jwt)`.
- Unlink hooks (each returns `unlink`): `useUnlinkEmail({address})`, `useUnlinkPhone`, `useUnlinkWallet({address})`, `useUnlinkOAuth({provider, subject})`, `useUnlinkFarcaster`, `useUnlinkTelegram`, `useUnlinkPasskey`.
- Update: `usePrivy().updateEmail()` / `updatePhone()` (modal); callbacks via `useUpdateAccount({ onSuccess, onError })`.
- Limits: one account per type, except wallets and passkeys (many). Unlink only if at least one other account remains.
- Security: account access is wallet access. Docs recommend MFA (passkey or authenticator app) when social accounts gate an embedded wallet.
- Server-side unlink: `privy.users().unlinkLinkedAccount(userId, { type, handle, provider? })` (in SDK types) or REST, see references/user-admin.md. No server-side "link" API is documented.

## Custom metadata

JSON object, max 1KB, values `string | number | boolean`. Written server-side only; visible in `user.customMetadata` (React) and the identity token `custom_metadata` claim.

```ts
await privy.users().setCustomMetadata(userId, { custom_metadata: { plan: 'pro', onboarded: true } });
```

SDK set = full replace. Partial merge only via REST `PATCH` (references/user-admin.md).

## Server user management (cheat sheet)

| Task | @privy-io/node |
| - | - |
| Current user from id token | `privy.users().get({ id_token })` |
| By DID | `privy.users()._get(userId)` |
| All users | `for await (const u of privy.users().list()) {}` |
| By email / phone / wallet | `getByEmailAddress({address})`, `getByPhoneNumber({number})`, `getByWalletAddress({address})` |
| Search | `privy.users().search({ searchTerm })` (REST `POST /v1/users/search`) |
| Create / import | `privy.users().create({ linked_accounts, wallets: [{ chain_type: 'ethereum' }], custom_metadata })` |
| Delete (irreversible) | `privy.users().delete(userId)` |
| Freeze / unfreeze | REST only: `POST` / `DELETE https://api.privy.io/v1/users/{id}/freeze` |
| Allowlist | `privy.apps().inviteToAllowlist({type, value})`, `removeFromAllowlist`, `getAllowlist()` |
| Denylist | REST only |

Prefer freeze over delete: delete gives a new DID and new embedded wallet address on next login; the old wallet is only soft-deleted. Details, REST bodies, more lookups: [references/user-admin.md](references/user-admin.md).

## User webhooks

Events: `user.created`, `user.authenticated`, `user.linked_account`, `user.unlinked_account`, `user.updated_account`, `user.transferred_account`, `user.wallet_created`, `mfa.enabled`, `mfa.disabled`, plus `user.kyc.updated`, `organization.kyb.updated`, `intent.*`. Register in Dashboard > Configuration > Webhooks (https only). **Production webhooks require the Enterprise plan**; free in development.

```ts
// app/api/privy/webhook/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { privy } from '@/lib/privy-server';

export async function POST(req: NextRequest) {
  const payload = await req.text(); // raw body: SDK types say raw string is safest for signature checks
  const id = req.headers.get('svix-id');
  const timestamp = req.headers.get('svix-timestamp');
  const signature = req.headers.get('svix-signature');
  if (!id || !timestamp || !signature) return NextResponse.json({ error: 'bad headers' }, { status: 400 });
  try {
    const event = privy.webhooks().verify({
      payload,
      headers: { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': signature },
    });
    // switch on event.type; dedupe with idempotency_key where present (at-least-once delivery)
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
}
```

Return 2xx fast; retries run up to ~1.5 days, endpoint auto-disabled after 5 days of failures. Dashboard "Test webhook" sends `{ type: 'privy.test' }`.

## Organizations and KYC/KYB

Organization wallets = shared wallets with quorum approvals and per-group policies. Flow: create Privy users for members, create a default key quorum (`authorization_threshold` > 1 recommended), `privy.organizations().create({ display_name, default_key_quorum_id })`, `privy.wallets().create({ chain_type: 'ethereum', entity: { id, type: 'organization' } })`, then propose actions with `privy.intents().rpc(walletId, {...})` and collect approvals. Up to 150 wallets per org; entity immutable.

KYC (users) / KYB (orgs) run through Bridge: register a Bridge API key in Dashboard, then `privy.users().kyc.initiateLinks(userId, {...})` / `privy.organizations().kyb.initiateLinks(orgId, {...})` and track via `.list()` or webhooks. Required before fiat onramps/offramps, cards, custodial wallets.

Read [references/organizations-kyc.md](references/organizations-kyc.md) when building org wallets, intents/approvals, or KYC/KYB.

## Monad notes

- No user, organization, or KYC page mentions Monad. User management and token verification are chain-agnostic.
- Chains page: Tier 3 (send transactions) lists "Ethereum: Includes EVM-compatible networks" (https://docs.privy.io/wallets/overview/chains.md). Monad is not named.
- Organization wallets use `chain_type: 'ethereum'`; intents take a CAIP-2 `caip2` (docs examples use `eip155:8453`). For Monad you would pass `eip155:143` (mainnet) or `eip155:10143` (testnet). Monad support not confirmed in docs; verify in dashboard or with Privy.
- Bridge KYC/KYB endorsements are about the person/business, not the chain. Whether fiat flows settle on Monad is a funding-skill question.

## Source pages

- https://docs.privy.io/user-management/users/overview.md
- https://docs.privy.io/user-management/users/the-user-object.md
- https://docs.privy.io/user-management/users/identity-tokens.md
- https://docs.privy.io/authentication/user-authentication/access-tokens.md
- https://docs.privy.io/user-management/users/linking-accounts.md
- https://docs.privy.io/user-management/users/unlinking-accounts.md
- https://docs.privy.io/user-management/users/updating-accounts.md
- https://docs.privy.io/user-management/users/custom-metadata.md
- https://docs.privy.io/user-management/users/managing-users/querying-users.md
- https://docs.privy.io/user-management/users/managing-users/deleting-users.md
- https://docs.privy.io/user-management/users/managing-users/freezing-users.md
- https://docs.privy.io/user-management/users/managing-users/allowlist.md
- https://docs.privy.io/user-management/users/managing-users/denylist.md
- https://docs.privy.io/user-management/migrating-users-to-privy/create-or-import-a-user.md
- https://docs.privy.io/user-management/users/webhooks/handling-events.md
- https://docs.privy.io/api-reference/webhooks/overview.md
- https://docs.privy.io/api-reference/users/search.md
- https://docs.privy.io/basics/nodeJS/installation.md
- https://docs.privy.io/wallets/overview/chains.md
- Organizations and KYC/KYB sources: see references/organizations-kyc.md
