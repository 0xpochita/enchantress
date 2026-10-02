# Key quorums, manual approvals, conditional policies, automations

## Key quorums (m-of-n)

Source: https://docs.privy.io/controls/key-quorum/overview.md, /create.md, /sign.md

- A set of P-256 public keys and/or user IDs and/or nested key quorums (one level deep) with `authorization_threshold` (default: all). A nested quorum counts as one approval once its own threshold is met. Thresholds are enforced in the TEE.
- Use as `owner_id` (full control) or as `additional_signers[].signer_id` (transact only, scoped by policy).
- Docs flag this as advanced and suggest contacting Privy.

Create:
```ts
const keyQuorum = await privy.keyQuorums().create({
  public_keys: [process.env.TREASURY_KEY_A_PUB!, process.env.TREASURY_KEY_B_PUB!], // base64 DER P-256
  user_ids: ['did:privy:...'],
  // key_quorum_ids: ['<nested-quorum-id>'],
  authorization_threshold: 2,
  display_name: 'Large withdrawals 2-of-3'
});
// keyQuorum.id -> owner_id / signer_id
```
REST `POST /v1/key_quorums` with the same snake_case fields. Dashboard: Authorization keys > New key > Register key quorum. Quorums mixing users and keys must be created via REST/SDK, not the Dashboard.

Sign with a quorum (Node): put enough members in one context.
```ts
await privy.wallets().ethereum().sendTransaction(walletId, {
  caip2,
  params: {transaction: {to, value, data: '0x'}},
  authorization_context: {
    authorization_private_keys: [keyA],
    user_jwts: [userJwt]
  }
});
```
REST: `privy-authorization-signature: <sig1>,<sig2>`. Privy checks count, validity over the payload, and membership.

Pattern for large withdrawals (composed from the docs, not a single docs recipe): wallet owner = high-threshold quorum (e.g. 2-of-3 admins). Day-to-day app key = additional signer with an override policy capping `value` / `transfer.amount`. Anything above the cap fails for the app key and must go through the quorum (directly, or through manual approvals below).

## Conditional policies per signer

Source: https://docs.privy.io/recipes/wallets/conditional-signer-policies.md, https://docs.privy.io/organizations/setup/signers.md

- One wallet, many signers, each with `override_policy_ids`. Privy evaluates only the policy of the signer that signed. A denied request does not fall back to another signer.
- Server chooses which private key to put in `authorization_context` based on context (bot key = restricted, admin key = permissive).
- Org wallets: default key quorum as owner, lower-privilege quorums added as `additional_signers` with their own policies.

## Manual approvals (Dashboard) - Enterprise only

Source: https://docs.privy.io/controls/dashboard/overview.md, /key-quorum.md, /approvals.md

1. Invite team members (Developer or Admin role). Each one must enroll biometric or TOTP MFA.
2. Dashboard Authorization page > New key > Register key quorum. Select team members and set the threshold.
3. Set that quorum as `owner_id` of the wallet/policy (or as a signer for tx-only approval).
4. Propose an intent:
   ```ts
   import {type EthereumSendTransactionRpcInput} from '@privy-io/node';
   const rpcRequest: EthereumSendTransactionRpcInput = {
     method: 'eth_sendTransaction',
     caip2: 'eip155:143',
     params: {transaction: {to, value}}
   };
   const intent = await privy.intents().rpc(walletId, rpcRequest); // POST /v1/intents/wallets/<id>/rpc
   // intent.intent_id, intent.status, intent.authorization_details
   ```
   No authorization signature is needed to propose. Other intent types: update wallet, update policy, policy rule CRUD, and update key quorum (see the `/v1/intents/...` endpoints in the API reference).
5. Reviewers approve on Dashboard > Approvals (MFA). The intent executes automatically when the threshold is met. Approvals cannot be revoked. Intents expire after 72h by default. Pending intents can be canceled from the Approvals page.
6. Track it with `GET /v1/intents/<id>` or intent webhooks: https://docs.privy.io/transaction-management/intents/intent-webhooks.md

The Dashboard can propose transfers and wallet/policy/quorum updates, but RPC transactions only via the API.

## Wallet automations

Source: https://docs.privy.io/wallets/automations/overview.md, /configuration.md, /create-and-attach.md

- Automation (app-scoped): trigger `deposit` (asset filter) -> action `swap` or `earn_deposit`. Attachment (per wallet): enables it with params. Each match creates an execution, which creates a wallet action.
- `owner_id` on the automation: `null` = app-managed, or a key quorum that must authorize updates/deletes.
- Attach/detach needs the **wallet owner's** signature. Executions then run without new signatures. The wallet's policies still evaluate every generated action. An attachment does not grant general-purpose signing.
- Only the oldest enabled matching attachment runs per deposit. Existing balance is not processed on attach (needs a new deposit or reindex). Imported or previously exported wallets cannot be attached.

```ts
const automation = await privy.walletAutomations().create({
  name: 'Normalize deposits',
  owner_id: null,
  config: {
    trigger: {type: 'deposit', assets: {mode: 'include', values: [{asset: 'usdc'}]}},
    action: {type: 'swap', destination_chain_asset: {asset: 'pathusd', chain: 'tempo'}}
  }
});
await privy.wallets().attachAutomations(walletId, {
  automation_ids: [automation.id],
  params: {destination_address: process.env.DESTINATION_WALLET_ADDRESS!},
  authorization_context: {signatures: [ownerSignature]}
});
```
Webhook `wallet_automation.submitted`; list executions with `privy.walletAutomations().listExecutions({wallet_id})` (async iterable).

Monad: the deposit-detection table lists "Monad | `eip155:143`". Docs add: "Detection support does not guarantee that every action route is available." Check swap routes with the quote endpoint first.

For signers that act autonomously on arbitrary logic (agents, limit orders), use session signers + policies (see SKILL.md), not automations.
