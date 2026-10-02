---
name: privy-controls
description: Privy wallet controls and security - owners and signers (authorization keys, session signers, server-side signing for offline users), policies (rules, conditions, allowlists, max transfer value, chain restrictions, condition sets, stateful spend caps, time-bound signers), key quorums (m-of-n multi-party approval), manual approvals in the Privy Dashboard (intents), conditional per-signer policies, and wallet automations. Load when the task mentions useSigners, addSigners, removeSigners, session signers, delegated wallets, authorization key, authorization_context, privy-authorization-signature, owner_id, additional_signers, override_policy_ids, policy, rule, ALLOW/DENY, condition set, aggregation, key quorum, quorum approval, intents, manual approval, revoke app access, transact while user offline, agent/bot trading on behalf of user, limit orders, or wallet automations.
---

# Privy controls: owners, signers, policies, quorums

Packages: client `@privy-io/react-auth`, server `@privy-io/node`, REST base `https://api.privy.io/v1`.
Never ship `PRIVY_APP_SECRET` or authorization private keys to the browser.

## Mental model

- Resources (wallets, policies, condition sets, automations) are controlled by **owners**. Owner types: **user** (Privy user ID), **authorization key** (P-256 keypair), **key quorum** (m-of-n set of users/keys/nested quorums). Internally an owner is always a key quorum ID (`owner_id`).
- **Owner** of a wallet can: sign/transact, update policies, update owner, add/remove signers, export key, delete.
- **Signer** (additional signer) can only sign/transact, scoped by its own policy. Cannot update owner/signers/policies, cannot export.
- **Policy** = list of rules per RPC method; each rule = conditions + `ALLOW`/`DENY`. Enforced in the secure enclave before signing.
- Requests that touch an owned resource must carry `privy-authorization-signature` (SDKs do it for you via `authorization_context` on server, automatically on client for user-owned wallets).

Rule of thumb from docs: business acts for user -> user is owner, your server is signer. Third parties act for business -> business is owner, third parties are signers.

## When to use what

| Need | Use |
| - | - |
| Server/bot/agent transacts for user, incl. while offline (limit orders, rebalancing, Telegram bot) | User-owned wallet + app authorization key added as signer, scoped by policy |
| Cap what the app can do with user funds | Policy as signer override policy (`policyIds` / `override_policy_ids`) |
| Different limits per party on one wallet | Multiple signers, each with its own override policy (conditional policies) |
| Several parties must approve (large withdrawal) | Key quorum with `authorization_threshold` as owner or signer |
| Humans approve in a UI | Manual approvals (Dashboard, Enterprise) + intents |
| Auto-react to deposits (swap, earn deposit) | Wallet automations |

## Flow: app transacts on user's embedded wallet (session signer)

1. Create a P-256 authorization key (keep the private key server-side; Privy cannot recover it):
   ```sh
   openssl ecparam -name prime256v1 -genkey -noout -out private.pem && \
   openssl ec -in private.pem -pubout -out public.pem
   ```
   Or in Node: `const {privateKey, publicKey} = await generateP256KeyPair();` (from `@privy-io/node`, DER base64, no PEM headers). Or Dashboard: Wallet infrastructure > Authorization keys > New key.
2. Register it as a key quorum (Dashboard: New key > "Register key quorum instead", threshold 1). Save the quorum `id`: this is the `signerId`.
3. (Optional, recommended) create a policy and save its `id`.
4. Embedded wallets on login: `config.embeddedWallets.ethereum.createOnLogin: 'all-users'` in `PrivyProvider`.
5. Client: user consents by adding the signer.
6. Server: send transactions with `authorization_context`.

### Client: add / remove signers (React)

```tsx
'use client';
import {usePrivy, useSigners, type WalletWithMetadata} from '@privy-io/react-auth';

const SIGNER_ID = process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID!; // key quorum ID (public, not secret)
const POLICY_ID = process.env.NEXT_PUBLIC_PRIVY_SIGNER_POLICY_ID!;

export function DelegationToggle() {
  const {user} = usePrivy();
  const {addSigners, removeSigners} = useSigners();

  const embedded = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata => a.type === 'wallet' && a.walletClientType === 'privy'
  );
  if (!embedded) return null;

  // Wallets with signers have `delegated: true`
  return embedded.delegated ? (
    <button onClick={() => removeSigners({address: embedded.address})}>Revoke app access</button>
  ) : (
    <button
      onClick={() =>
        addSigners({
          address: embedded.address,
          signers: [{signerId: SIGNER_ID, policyIds: [POLICY_ID]}] // [] = no restrictions
        })
      }
    >
      Allow app to trade for me
    </button>
  );
}
```

- `addSigners({address, signers: {signerId, policyIds}[]}) => Promise<{user}>`. Docs: "each signer can only have one override policy" (pass at most one ID).
- `removeSigners({address}) => Promise<{user}>` removes **all** signers on that wallet.
- `walletClientType === 'privy'` filter is an assumption for "embedded wallet"; verify against your login/wallets skill.
- Starter example: https://github.com/privy-io/examples/blob/main/privy-next-starter/src/components/sections/session-signers.tsx

### Server: list delegated wallets and transact (Node)

```ts
// app/api/... route handler or server action only
import {PrivyClient, type AuthorizationContext} from '@privy-io/node';

const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!
});

const authorizationContext: AuthorizationContext = {
  authorization_private_keys: [process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY!]
};

export async function sendFromUserWallet(walletId: string, to: `0x${string}`, valueHex: `0x${string}`) {
  const res = await privy.wallets().ethereum().sendTransaction(walletId, {
    caip2: 'eip155:143', // Monad mainnet; see Monad notes
    params: {transaction: {to, value: valueHex, data: '0x'}},
    authorization_context: authorizationContext
  });
  return res.hash;
}
```

Finding delegated wallets (docs): `const user = await privy.users()._get('did:privy:...')`, then filter `user.linked_accounts` for `type === 'wallet' && 'id' in account && account.delegated`. The `id` is the wallet ID for server calls. REST: `GET https://auth.privy.io/api/v1/users/<did>` with basic auth + `privy-app-id`.

Sign message variant: `privy.wallets().ethereum().signMessage(walletId, {message, authorization_context})`.

### Server: add/remove signers or change owner (Node / REST)

Update the wallet; the **owner** must sign (for a user-owned wallet, pass the user's JWT: `authorization_context: {user_jwts: [jwt]}`).

```ts
await privy.wallets().update(walletId, {
  additional_signers: [{signer_id: SIGNER_ID, override_policy_ids: [POLICY_ID]}],
  authorization_context: {user_jwts: [userJwt]}
});
```

Passing `authorization_context` inside `update` is inferred from the other SDK methods. Check this in https://docs.privy.io/api-reference/wallets/update.md. REST `PATCH /v1/wallets/<wallet_id>` body fields: `policy_ids` (only 1 per wallet), `owner` (`{user_id}` | `{public_key}` | null) or `owner_id`, `additional_signers` (`{signer_id, override_policy_ids?}[]`), `display_name`. PATCH replaces `additional_signers` with the list you send, so you remove a signer by sending the list without it.

## Authorization context (server signing)

`AuthorizationContext` fields (`@privy-io/node`), combinable for quorums:
- `authorization_private_keys: string[]`: app-held P-256 keys.
- `user_jwts: string[]`: SDK fetches a user signing key from the JWT.
- `sign_functions: ((payload: Uint8Array) => Promise<string>)[]`: KMS. Must return a base64 ECDSA P-256 signature.
- `signatures: string[]`: precomputed signatures (e.g. produced client-side).

Lower level: `formatRequestForAuthorizationSignature(input)` and `generateAuthorizationSignature({input, authorizationPrivateKey})` from `@privy-io/node`; client `useAuthorizationSignature().generateAuthorizationSignature(payloadBytes | payload)` in React. Payload = `{version: 1, method, url (no trailing slash), body, headers: {'privy-app-id', optional 'privy-idempotency-key', 'privy-request-expiry'}}`. GET needs no signature. Quorum signatures go in the header comma-separated. Details: [references/signing.md](references/signing.md) (read when you sign outside the SDK, e.g. KMS or a client-signs/server-sends flow).

## Policies (summary)

```ts
const policy = await privy.policies().create({
  name: 'Bot: small MON sends on Monad only',
  version: '1.0',
  chain_type: 'ethereum',
  owner_id: process.env.PRIVY_ADMIN_QUORUM_ID, // recommended; without owner, app secret alone can edit
  rules: [
    {
      name: 'Monad, <= 0.01 native, allowlisted recipient',
      method: 'eth_sendTransaction',
      action: 'ALLOW',
      conditions: [
        {field_source: 'ethereum_transaction', field: 'chain_id', operator: 'eq', value: '143'},
        {field_source: 'ethereum_transaction', field: 'value', operator: 'lte', value: '0x2386F26FC10000'},
        {field_source: 'ethereum_transaction', field: 'to', operator: 'in', value: ['0xRecipient1', '0xRecipient2']}
      ]
    }
  ]
});
```

Evaluation: only rules for the requested method are evaluated; any `DENY` wins; else any `ALLOW` allows; else **default DENY**. No rule for a method means that method is denied. Use `method: '*'` for catch-all. Numbers are raw units (wei). Rule CRUD: `policies().createRule / updateRule / deleteRule / update`. Full reference (fields, operators, examples, condition sets, stateful aggregations, template vars): [references/policies.md](references/policies.md) (read whenever you write or debug a policy).

## Key quorums, manual approvals, automations

- Key quorum: `privy.keyQuorums().create({public_keys, user_ids, key_quorum_ids, authorization_threshold, display_name})`. REST `POST /v1/key_quorums`. Updating/deleting a quorum needs threshold signatures from the existing quorum.
- Manual approvals: **Enterprise feature**. Reviewer quorum of Dashboard team members (MFA required), assigned as owner/signer. You propose intents (`client.intents().rpc(walletId, rpcRequest)`), reviewers approve in the Dashboard, and the intent auto-executes when the threshold is reached. Intents expire after 72h.
- Wallet automations: deposit trigger -> `swap` or `earn_deposit` action, attached per wallet with owner signature; policies still apply.
Details: [references/quorums-approvals-automations.md](references/quorums-approvals-automations.md) (read when you implement multi-party approval, dashboard review, or automations).

## Gotchas

- `signerId` / `signer_id` is a **key quorum ID**, not a raw public key. Register the key as a quorum first.
- Authorization private keys are shown once. Privy never stores them. Treat them as production secrets (env/KMS).
- Wallet `policy_ids`: only one policy per wallet. Signer override: one policy per signer.
- A signer's request is evaluated against **that signer's** override policy only, with no fallback to other signers' policies.
- For send operations, simulation runs **before** policy evaluation. A reverting tx returns a simulation error, not a policy error.
- Rules can shadow each other: two `ALLOW` rules with `lte 1` and `lte 5` effectively allow 5.
- String comparisons are case-sensitive, but EVM address fields from signing sources (`ethereum_transaction.to`, calldata address args, etc.) compare case-insensitively. `action_request_body` (e.g. `transfer` destination) is exact, so normalize addresses.
- Deleting a condition set or aggregation makes conditions referencing it evaluate `false` (requests get denied).
- Docs remove-signers sample references undefined vars. Use the pattern above.
- Key quorums are flagged "advanced". Docs suggest contacting Privy.

## Monad notes

- Monad mainnet is confirmed only in the **wallet automations** deposit-detection table: "Monad | `eip155:143`" (https://docs.privy.io/wallets/automations/configuration.md).
- None of the policy, signer, or quorum pages mention Monad. Those are chain-agnostic for `chain_type: 'ethereum'`, and the policy `chain_id` condition takes a decimal string (docs examples: `'8453'`, `['1', '8453']`). For Monad, using `'143'` (mainnet) or `'10143'` (testnet) follows that pattern but the docs do not show it.
- Monad testnet `eip155:10143` is not mentioned on any page fetched. Check in the dashboard or with Privy.
- Monad support for server `sendTransaction` with `caip2: 'eip155:143'` is not confirmed on these pages. Check against the wallets/chains skill or docs.

## Source pages

- https://docs.privy.io/controls/overview.md
- https://docs.privy.io/controls/authorization-keys/owners/overview.md
- https://docs.privy.io/controls/authorization-keys/owners/types.md
- https://docs.privy.io/controls/authorization-keys/owners/configuration/user/offline.md
- https://docs.privy.io/controls/common-use-cases/delegation.md
- https://docs.privy.io/controls/common-use-cases/quorum-approval.md
- https://docs.privy.io/controls/authorization-keys/keys/create/key.md
- https://docs.privy.io/wallets/using-wallets/signers/overview.md
- https://docs.privy.io/wallets/using-wallets/signers/quickstart.md
- https://docs.privy.io/wallets/using-wallets/signers/configure-signers.md
- https://docs.privy.io/wallets/using-wallets/signers/add-signers.md
- https://docs.privy.io/wallets/using-wallets/signers/remove-signers.md
- https://docs.privy.io/wallets/using-wallets/signers/use-signers.md
- https://docs.privy.io/wallets/wallets/update-a-wallet.md
- https://docs.privy.io/controls/authorization-keys/using-owners/sign/overview.md
- https://docs.privy.io/controls/authorization-keys/using-owners/sign/signing-on-the-client.md
- https://docs.privy.io/controls/authorization-keys/using-owners/sign/signing-on-the-server.md
- https://docs.privy.io/controls/authorization-keys/using-owners/sign/utility-functions.md
- https://docs.privy.io/api-reference/authorization-signatures.md
- https://docs.privy.io/controls/policies/overview.md
- https://docs.privy.io/controls/policies/create-a-policy.md
- https://docs.privy.io/controls/policies/update-a-policy.md
- https://docs.privy.io/controls/policies/condition-sets.md
- https://docs.privy.io/controls/policies/stateful-policies.md
- https://docs.privy.io/controls/policies/template-variables.md
- https://docs.privy.io/controls/policies/example-policies/ethereum.md
- https://docs.privy.io/controls/policies/example-policies/timebound.md
- https://docs.privy.io/recipes/wallets/conditional-signer-policies.md
- https://docs.privy.io/organizations/setup/signers.md
- https://docs.privy.io/controls/key-quorum/overview.md
- https://docs.privy.io/controls/key-quorum/create.md
- https://docs.privy.io/controls/key-quorum/sign.md
- https://docs.privy.io/controls/dashboard/overview.md
- https://docs.privy.io/controls/dashboard/key-quorum.md
- https://docs.privy.io/controls/dashboard/approvals.md
- https://docs.privy.io/transaction-management/intents/create/execute-rpc.md
- https://docs.privy.io/wallets/automations/overview.md
- https://docs.privy.io/wallets/automations/configuration.md
- https://docs.privy.io/wallets/automations/create-and-attach.md
