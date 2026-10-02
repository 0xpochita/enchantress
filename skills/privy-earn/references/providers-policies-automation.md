# Earn: providers, policies, automation, recipes

## Providers (same API for all, pass `vault_id`)

### Morpho
- ERC-4626 vaults via a Privy-deployed **fee wrapper**; curators like Gauntlet, Steakhouse, Sentora.
- Self-serve in Dashboard. Morpho v2 vaults not listed: sales@privy.io.
- Fee up to 50% of yield, accrues as shares in the admin wallet. Collect by calling `withdraw` with the admin wallet. `fees/collect` is Aave-only.
- Fee wrapper roles are all assigned to the admin wallet; changing the config goes through sales@privy.io.
- Vault details include `total_rewards_apr` (bps). Token incentives (e.g. MORPHO) are claimed with the incentive claim endpoint, per chain, across all vaults on that chain.

### Aave
- Supplies one token to an Aave v3 market. Self-serve: **Aave USDC on Base** (Dashboard: select it, set fee, Create vault; Privy creates an admin wallet unless you pick one under Advanced settings).
- Chains: "Privy deploys Aave vaults on Ethereum, Base, Optimism, Polygon, and Arbitrum." Other tokens/chains: sales@privy.io.
- Fee 0-100%. Fees accumulate in the vault: read `available_fees` from vault details, then `POST /v1/wallets/{admin_wallet_id}/earn/ethereum/fees/collect` `{ "vault_id": "..." }`. Collects all; partial not supported. Unmodified auto-created admin wallet: app secret alone authorizes; admin wallets with `owner_id` need an authorization signature. Response `amount` / `raw_amount` are `null` until confirmed.

### Veda
- BoringVault (not ERC-4626, no fee wrapper). Teller contract for deposit/withdraw, Accountant for pricing; Privy handles it.
- Enabled via sales@privy.io. Create a Privy wallet first and share its address with Veda: it becomes the fee recipient baked into the vault at deployment.
- Chains: "Ethereum, Base, Tempo, Arbitrum, Optimism, and Linea" (contact sales for current list).
- Instant deposit/withdraw, rewards auto-compound: **do not call incentive claim**.
- **Share lock**: shares locked for a vault-configured period after each deposit; a new deposit resets the lock on the whole position. Withdraw during lock -> `rejected` with unlock time. Gate the withdraw UI.
- `user_apy`, `app_apy`, `tvl_usd` may be `null` for ~7-10 days after enablement; `available_liquidity_usd` always `null`.
- `total_deposited` / `total_withdrawn` only count Privy-initiated actions; `assets_in_vault` / `shares_in_vault` are read live.

### Kamino, TMMFs
- Listed in overview as sales-enabled ("Veda, Aave, Morpho, and Kamino vaults from any curator, on any chain"; TMMFs via sales). No provider page; verify in docs: https://docs.privy.io/wallets/actions/earn/overview.md. A separate DIY Solana recipe exists: https://docs.privy.io/recipes/yield/kamino-guide.md

## Policies

- Rule methods: `earn_deposit`, `earn_withdraw`. Policy `chain_type: 'ethereum'`.
- A policy allowing only `eth_sendTransaction` still **denies** earn requests; add explicit earn rules.
- Conditions: only `action_request_body` (fields `vault_id`: `eq` | `in` | `in_condition_set`; `amount` / `raw_amount`: `eq` | `gt` | `gte` | `lt` | `lte`) and `system` (e.g. `current_unix_timestamp`).
- A rule on `amount` does not match a request sending `raw_amount` (and vice versa). Match what your app sends.

```ts
const policy = await privy.policies().create({
  name: 'Approved earn vault policy',
  version: '1.0',
  chain_type: 'ethereum',
  rules: [
    {
      name: 'Allow deposits up to 1000 into approved vault',
      method: 'earn_deposit',
      action: 'ALLOW',
      conditions: [
        { field_source: 'action_request_body', field: 'vault_id', operator: 'eq', value: process.env.PRIVY_EARN_VAULT_ID! },
        { field_source: 'action_request_body', field: 'amount', operator: 'lte', value: '1000.0' },
      ],
    },
    {
      name: 'Allow withdrawals from approved vault',
      method: 'earn_withdraw',
      action: 'ALLOW',
      conditions: [
        { field_source: 'action_request_body', field: 'vault_id', operator: 'eq', value: process.env.PRIVY_EARN_VAULT_ID! },
      ],
    },
  ],
});
await privy.wallets().update(walletId, { policy_ids: [policy.id] }); // owner must authorize if wallet has owner_id
```

## Automate deposits (wallet automations)

Deposit a wallet's **full balance** of the vault asset whenever a matching deposit arrives. Server-only.

```ts
const automation = await privy.walletAutomations().create({
  name: 'Deposit Tempo PathUSD into Earn',
  owner_id: null,
  config: {
    trigger: { type: 'deposit', assets: { mode: 'include', values: [{ asset: 'pathusd', chain: 'tempo' }] } },
    action: { type: 'earn_deposit', vault_id: process.env.PRIVY_EARN_VAULT_ID! },
  },
});

await privy.wallets().attachAutomations(walletId, {
  automation_ids: [automation.id],
  // omit for ownerless wallets
  authorization_context: { signatures: [process.env.PRIVY_AUTHORIZATION_SIGNATURE!] },
});
```

- Trigger: `include` mode, exactly one asset; asset + chain must match the vault. No per-wallet `params`.
- Existing balance is not processed on attach; send a new deposit or reindex the asset.
- Imported or previously exported wallets cannot get attachments.
- Withdrawals from the vault are recognized and not re-deposited.
- Track via `wallet_automation.submitted` webhook, then `wallet_action.earn_deposit.*`.
- Cross-chain/other-asset funding: pair a crypto deposit account (swaps into the vault asset) with this automation.

## DIY yield recipes (not the Earn API, no Privy revenue share)

Overview: https://docs.privy.io/recipes/yield/overview.md. Aave, Ethena (sUSDe), Sky Savings (sUSDS), Kamino (Solana), Pods, Jupiter Earn, Yield.xyz AgentKit, Dolomite, Morpho borrow. These build raw transactions with embedded wallets; use if a Monad vault is needed and Privy Earn does not support Monad.

## Source pages

- https://docs.privy.io/wallets/actions/earn/providers/morpho.md
- https://docs.privy.io/wallets/actions/earn/providers/aave.md
- https://docs.privy.io/wallets/actions/earn/providers/veda.md
- https://docs.privy.io/wallets/actions/earn/collect-fees.md
- https://docs.privy.io/wallets/actions/earn/policies.md
- https://docs.privy.io/wallets/automations/earn-deposits.md
- https://docs.privy.io/recipes/yield/overview.md
