# Organization wallets and KYC/KYB (detail)

## Organization wallets

Shared wallets for a business: members are Privy users, admin power sits in a **default key quorum**, lower-privilege groups are **additional signers** limited by policies, and sensitive actions run as **intents** that members approve asynchronously. Custodial and non-custodial setups are both supported. Do these steps per end-customer organization.

### 1. Create users for members

`privy.users().create({ linked_accounts: [...] })`. With your own auth: `linked_accounts: [{ type: 'custom_auth', custom_user_id }]` after configuring JWT auth in the Dashboard. With Privy auth: list the email/SMS/social accounts they will log in with.

### 2. Default key quorum + organization

```ts
import { privy } from '@/lib/privy-server';

const adminQuorum = await privy.keyQuorums().create({
  user_ids: [ownerUserId, cfoUserId, ctoUserId],
  authorization_threshold: 2, // keep > 1: no single point of control
  display_name: 'Acme admins',
});

const org = await privy.organizations().create({
  display_name: 'Acme Corporation',
  default_key_quorum_id: adminQuorum.id,
});
// later: privy.organizations().get(org.id)
```

The default key quorum administers every org wallet: signing, policy changes, provisioning access, key export. Keep it narrow.

### 3. Create the wallet

```ts
const wallet = await privy.wallets().create({
  chain_type: 'ethereum',
  entity: { id: org.id, type: 'organization' },
  // owner defaults to org.default_key_quorum_id; pass owner/owner_id to override
  // policy_ids: [policyId],
  // additional_signers: [{ signer_id: opsQuorumId, override_policy_ids: [opsPolicyId] }],
});

for await (const w of privy.wallets().list({ entity_id: org.id })) {
  console.log(w.id, w.address);
}

// Existing wallet without an entity:
await privy.wallets().assignEntity(walletId, { id: org.id, type: 'organization' });
```

Rules:
- Entity is set once (`wallet_entity_already_set` on reassign). To move, create a new wallet and transfer funds.
- Max 150 wallets per organization.
- Changing `default_key_quorum_id` only affects wallets created afterwards. `assignEntity` does not change owner.

### 4. Granular access (conditional policies)

1. Create extra key quorums per permission set (e.g. "send < 1000 USDC").
2. Create a policy per quorum (allowlisted addresses, amount limits, chains). See the `privy-controls` skill.
3. Attach as `additional_signers: [{ signer_id, override_policy_ids: [policyId] }]` on create or update. Additional signers can sign within policy but cannot change wallet config.

Provision a new member: add to the default key quorum (admin; requires an `updateKeyQuorum` intent approved by the current quorum) or add to a lower-privilege quorum used as additional signer.

### 5. Take actions with intents

Create from the backend with only the app secret; nothing executes until the threshold of signatures is met. Intents expire after 72h by default.

```ts
const intent = await privy.intents().rpc(wallet.id, {
  method: 'eth_sendTransaction',
  caip2: 'eip155:10143', // Monad testnet; Monad support not confirmed in docs (docs example: eip155:8453)
  sponsor: true,
  params: { transaction: { to: '0xRecipient', value: '0x2386F26FC10000' } },
});
// persist intent.intent_id
```

Other intent creators in `@privy-io/node@0.35.0`: `updateWallet`, `updatePolicy`, `updatePolicyRule`, `createPolicyRule`, `deletePolicyRule`, `updateKeyQuorum`, and `transfer` (resource). Shapes: https://docs.privy.io/transaction-management/intents/create/execute-transfer.md

### 6. Approve

Each approver: authenticate, get their access token, fetch a user signing key with it, sign the intent payload, submit. Privy's client SDKs sign automatically for user-owned flows; server SDKs use an authorization context `{ user_jwts: [jwt] }` or `{ authorization_private_keys: [...] }`.

REST authorize (one signature per call; each signer calls separately):

`POST https://api.privy.io/v1/intents/{intent_id}/authorize` body `{ "signature": "<base64>", "timestamp": <ms> }`, callable with app secret or the owner's user token.

Signature payload (RFC 8785 canonicalized, ECDSA P-256, base64):

```json
{
  "version": 1,
  "method": "<intent.request_details.method>",
  "url": "<intent.request_details.url>",
  "body": "<intent.request_details.body>",
  "timestamp": 1741834854578,
  "intent_id": "<intent id>",
  "headers": { "privy-app-id": "<app id>" }
}
```

Add `"privy-request-expiry": String(intent.expires_at)` in `headers` only when `intent.custom_expiry` is true. Timestamp must be within 5 minutes of Privy time. Full worked example: https://docs.privy.io/transaction-management/intents/sign-intents.md

No `intents().authorize` method exists in `@privy-io/node@0.35.0` types (Java SDK has one). Use REST or verify newer SDK versions.

Reject: `privy.intents().reject(intentId)`.

### 7. Pending list and results

- `for await (const i of privy.intents().list({...})) {}` or REST list; filter `status: 'pending'` to surface approvals. Fields: id, creator, authorization details (threshold, approvers), status, original request.
- `privy.intents().get(intentId)` / `GET /v1/intents/:id`: status, approvers, `action_result` (tx hash for transactions) or failure reason.
- Webhooks: `intent.created`, `intent.authorized`, `intent.executed`, `intent.failed`, `intent.rejected`.
- Statuses: pending, processing (async actions), executed, failed, rejected, expired, dismissed. Re-submitting the same signer is idempotent.

## KYC / KYB (Bridge)

Needed before fiat onramps/offramps, issued cards, custodial wallets, fiat deposits/payouts. Verification attaches to the wallet **entity** (user or organization).

Setup:
1. Bridge account + API key (sandbox and production keys are separate).
2. Dashboard: Onramps > Bridge > Configure. Enable "server-side flows (REST API)" for backend KYC/KYB.
3. Every request has `environment: 'sandbox' | 'production'` (default production). Sandbox moves no real money but wallets/assets are still mainnet.

Terms of service must be accepted first (hosted ToS or ToS reliance if Bridge approved your app): https://docs.privy.io/kyc-kyb/kyc-tos.md, https://docs.privy.io/kyc-kyb/kyb-tos.md

### KYC (user)

```ts
const res = await privy.users().kyc.initiateLinks(userId, {
  provider: 'bridge',
  environment: 'sandbox',
  email: 'user@example.com',
  endorsements: ['base'],
  redirect_uri: 'https://your-app.com/kyc/complete',
});
// res.kyc.link -> send to frontend. Idempotent: same link on repeat calls.

const { kyc_statuses } = await privy.users().kyc.list(userId);
for (const s of kyc_statuses) console.log(s.provider, s.kyc.status, s.endorsements);
```

Headless (your own form): `POST /v1/users/{user_id}/kyc/submit`, re-entrant for partial submissions. See https://docs.privy.io/kyc-kyb/kyc-headless.md

Webhook `user.kyc.updated`: `{ user_id, provider, environment, data: { status, tos, kyc, endorsements[{ name, status, missing }], capabilities }, changes: { 'path': [prev, curr] } }`. `missing` / `requirements_due` list what Bridge still needs; resolve with a new hosted link or another headless submit.

### KYB (organization)

```ts
const res = await privy.organizations().kyb.initiateLinks(orgId, {
  provider: 'bridge',
  environment: 'sandbox',
  email: 'finance@example.com',
  business_name: 'Acme, Inc.',
  endorsements: ['base'],
  redirect_uri: 'https://your-app.com/kyb/complete',
});
// res.kyb.link

const { kyb_statuses } = await privy.organizations().kyb.list(orgId);
```

KYB is reviewed manually by Bridge (slower); associated persons may need their own KYC. Webhook: `organization.kyb.updated`. Headless: https://docs.privy.io/kyc-kyb/kyb-headless.md

## Sources

- https://docs.privy.io/organizations/overview.md
- https://docs.privy.io/organizations/setup/overview.md
- https://docs.privy.io/organizations/setup/users.md
- https://docs.privy.io/organizations/setup/organizations.md
- https://docs.privy.io/organizations/setup/wallet.md
- https://docs.privy.io/organizations/setup/example-wallet.md
- https://docs.privy.io/organizations/setup/signers.md
- https://docs.privy.io/organizations/actions/overview.md
- https://docs.privy.io/organizations/actions/intents.md
- https://docs.privy.io/organizations/actions/provision-access.md
- https://docs.privy.io/organizations/actions/approvals.md
- https://docs.privy.io/organizations/actions/list-intents.md
- https://docs.privy.io/organizations/actions/intent-execution.md
- https://docs.privy.io/recipes/wallets/organization-wallets.md
- https://docs.privy.io/controls/key-quorum/create.md
- https://docs.privy.io/transaction-management/intents/create/execute-rpc.md
- https://docs.privy.io/transaction-management/intents/sign-intents.md
- https://docs.privy.io/controls/authorization-keys/using-owners/sign/signing-on-the-server.md
- https://docs.privy.io/kyc-kyb/overview.md
- https://docs.privy.io/kyc-kyb/setup.md
- https://docs.privy.io/kyc-kyb/entities.md
- https://docs.privy.io/kyc-kyb/kyc.md
- https://docs.privy.io/kyc-kyb/kyc-status.md
- https://docs.privy.io/kyc-kyb/kyb.md
- https://docs.privy.io/kyc-kyb/kyb-status.md
