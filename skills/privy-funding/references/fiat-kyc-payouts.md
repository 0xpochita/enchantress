# Fiat deposits, KYC, fiat payouts (detail)

All server-side. Provider: Bridge. Prereq: Bridge API key registered in Privy Dashboard (Onramps > Bridge > Configure) with "server-side flows" enabled for the environment (`sandbox` or `production`).

## Fiat deposit account

`POST https://api.privy.io/v1/wallets/{wallet_id}/deposit_accounts/fiat`

Body: `provider: 'bridge'` (required), `environment?: 'production' | 'sandbox'` (default production), `source: {currency}` (e.g. `usd`, `eur`), `destination: {asset, chain}` (chain must match wallet `chain_type`), optional `developer_fee_percent` (string, e.g. `"1.5"`, fee your app keeps per deposit; from API reference).

```ts
import {PrivyClient} from '@privy-io/node';

const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!
});

export async function createBankDepositAccount(walletId: string) {
  const {fiat_deposit_account: account} = await privy
    .wallets()
    .depositAccounts.fiat.create(walletId, {
      provider: 'bridge',
      environment: 'sandbox',
      source: {currency: 'usd'},
      destination: {asset: 'usdc', chain: 'base'}
    });
  // account.deposit_instructions is null while provisioning; show it to the user when present
  return account;
}
```

Use an `Idempotency-Key` header on REST retries (accounts are persistent, billed resources). Reading accounts: https://docs.privy.io/wallets/funding/fiat-deposits/get-deposit-accounts.md

Response `fiat_deposit_account`: `id`, `wallet_id`, `provider`, `environment`, `status: 'activated' | 'deactivated'`, `source {currency, payment_rails}`, `destination {asset, chain}`, `deposit_instructions` (US: `bank_name`, `bank_routing_number`, `bank_account_number`, `bank_beneficiary_name`; SEPA: `iban`, `bic`), `created_at`.

Entity requirement: wallet's entity must have passed KYC/KYB. User-created wallets are attributed automatically; wallets created server-side with app secret need an entity assigned (https://docs.privy.io/kyc-kyb/entities.md).

## Deposit lifecycle webhooks

| Event | Fires when |
| - | - |
| `wallet.deposit_account.deposit_started` | Deposit received, conversion initiated |
| `wallet.deposit_account.deposit_completed` | Crypto settled on-chain in the wallet |
| `wallet.deposit_account.deposit_failed` | Conversion failed, fiat refunded to sender |

Envelope: `type`, `provider_deposit_id` (stable per deposit, provider ID), `deposit_account_id`, `wallet_id`, `deposit_type: 'fiat'`, `provider: 'bridge'`, `environment`, `data` (`source {amount, currency, payment_rail, sender_name}`, `destination`, `created_at`). `wallet.funds_deposited` also fires when crypto lands. Production webhooks require Enterprise plan.

## KYC (hosted link)

```ts
const status = await privy.users().kyc.initiateLinks('did:privy:xxxxx', {
  provider: 'bridge',
  environment: 'sandbox',
  email: 'user@example.com', // falls back to user's linked email
  endorsements: ['base'], // unlocks rails/regions; default ['base']
  redirect_uri: 'https://your-app.com/kyc/complete'
});
// status.kyc.link -> send to frontend
```

REST: `POST /v1/users/{user_id}/kyc/links`. Collect Bridge ToS acceptance first (https://docs.privy.io/kyc-kyb/kyc-tos.md). Headless: https://docs.privy.io/kyc-kyb/kyc-headless.md. Status: https://docs.privy.io/kyc-kyb/kyc-status.md. KYB: https://docs.privy.io/kyc-kyb/kyb.md. Sandbox can simulate KYC approval (Bridge docs).

Jurisdiction limits beyond "endorsements unlock rails and regions" are defined by Bridge; verify in Bridge docs (https://apidocs.bridge.xyz/platform/customers/customers/endorsements).

## Fiat payouts (offramp)

1. Register external bank account: https://docs.privy.io/financial-flows/transfers/fiat-payouts/register-bank-account.md (returns `fiat_account_id`).
2. Execute:

```ts
const payout = await privy
  .wallets()
  .payout()
  .fiat()
  .create(walletId, {
    source: {asset: 'usdc', chain: 'base', amount: '100.00'},
    destination: {fiat_account_id: fiatAccountId}
  });
// payout.id = wallet action ID; status pending | succeeded | rejected | failed
```

REST: `POST /v1/wallets/{wallet_id}/payout/fiat`, `privy-idempotency-key` header, authorization signature if wallet has an owner.

Supported source chains/assets:

| Chain | `source.asset` |
| - | - |
| tempo | `ousd`, `usdc_e`, `usdt0` |
| ethereum | `ousd`, `usdc`, `usdt`, `usdb`, `eurc` |
| base | `ousd`, `usdc`, `usdb`, `eurc` |
| arbitrum | `usdc` |
| optimism | `usdc` |
| polygon | `usdc` (not `usdc_e`) |
| solana | `ousd`, `usdc`, `usdt`, `usdb`, `eurc` |

Gotcha: payouts are not a policy method; a wallet policy that only allows e.g. `transfer` blocks payouts. Tracking: https://docs.privy.io/financial-flows/transfers/fiat-payouts/track-payouts.md
