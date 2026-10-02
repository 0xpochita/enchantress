# Webhooks, balances and transaction tracking

Most pages here carry the warning: "functionality exists for wallets reconstituted server-side" (TEE architecture). Webhooks: free in development, production requires Enterprise plan.

## Webhook setup

1. Backend POST endpoint (https). Verify every payload.
2. Dashboard **Configuration > Webhooks**: add URL, select events. For deposit/withdraw events also configure tracked assets (native token + CAIP-2, ERC20 contract + CAIP-2, SPL mint + CAIP-2).
3. **Test webhook** sends `{"type": "privy.test", "message": "Hello, World!"}`.

Verification (Node): `new PrivyClient({appId, appSecret, webhookSigningSecret})` then `privy.webhooks().verify({payload, headers})`. `payload` = raw body string (preferred) or parsed object; `headers` must contain `svix-id`, `svix-timestamp`, `svix-signature`. Returns typed `WebhookPayload` (discriminated by `type`), throws `InvalidWebhookError`. Manual: Svix verification guides.

Delivery: Svix, at least once, 2xx = success (3xx counts as failure). Retry schedule: immediately, 5s, 5m, 30m, 2h, 5h, 10h, 10h; then manual retry from dashboard; endpoint disabled after 5 consecutive days of failures. Source IPs: 44.228.126.217, 50.112.21.217, 52.24.126.164, 54.148.139.208, 2600:1f24:64:8000::/56.

## Events

Transaction (sent by Privy wallets, includes `reference_id` when set):
- `transaction.broadcasted`, `transaction.confirmed`, `transaction.execution_reverted`, `transaction.still_pending` (trigger speed-up), `transaction.replaced` (EVM, same nonce), `transaction.failed` (pending too long, only chains with a pending limit e.g. Base, Solana, Flow), `transaction.provider_error` (custodial).
- `transaction.confirmed` fields: `type`, `wallet_id`, `transaction_id`, `caip2`, `transaction_hash`.

Wallet:
- `wallet.funds_deposited` / `wallet.funds_withdrawn` for registered assets. Deposited fields: `type`, `wallet_id`, `idempotency_key`, `caip2`, `asset`, `amount`, `transaction_hash`, `sender`, `recipient`, `block {number, timestamp}`. Deposit webhooks only on select chains (list in Dashboard Webhooks page).
- Also `wallet.archived`, `wallet.restored`, `wallet.private_key_export`, `wallet.seed_phrase_export`, `wallet.recovery_setup`, `wallet.recovered`.

Wallet actions (`created`, `succeeded`, `rejected`, `failed` each):
- `wallet_action.transfer.*`, `wallet_action.swap.*`, `wallet_action.payout.*` (succeeded = fiat settled).
- Earn (documented, out of scope here): `wallet_action.earn_deposit.*`, `wallet_action.earn_withdraw.*`, `wallet_action.earn_incentive_claim.*`, `wallet_action.earn_fee_collect.*`. See https://docs.privy.io/wallets/actions/earn/webhooks.
- `wallet_action.transfer.succeeded` fields include `wallet_action_id`, `wallet_id`, `action_type`, `status`, `steps`, `source_chain`, `destination_address`, `created_at`, `completed_at`.

Other: `intent.created|authorized|rejected|executed|failed`, `usage.gas_sponsorship.recorded`, `usage.swap_provider_fee.recorded`, `user_operation.completed` (ERC-4337 UserOperation landed), `wallet_automation.submitted`, user events (`user.created`, `user.authenticated`, `user.linked_account`, `user.unlinked_account`, `user.updated_account`, `user.transferred_account`, `user.wallet_created`), `mfa.enabled`, `mfa.disabled`.

Dedupe: `idempotency_key` where present, `event_id` on usage events, `svix-id` header for redeliveries.

## Transaction lookup

- `GET /v1/transactions/{transaction_id}` / Node `privy.transactions().get(id)` -> `{id, wallet_id, status, transaction_hash, caip2}`. Status: `broadcasted | confirmed | execution_reverted | failed | replaced | pending | provider_error` (history API also lists `finalized`). IDs are UUIDv4 since Aug 2025 (legacy CUID2 still accepted).
- `GET /v1/transactions?reference_id=...`: lookup by your `reference_id` (set on `eth_sendTransaction`, unique, <= 64 chars).
- Wallet history: `GET /v1/wallets/{wallet_id}/transactions?chain=...&asset=...` (or `token=`, exactly one of asset/token; `limit` <= 100, `cursor`, `tx_hash`, `include_archived`). `chain` enum: ethereum, arbitrum, avalanche, base, base_sepolia, bsc, tempo, linea, optimism, polygon, solana, sepolia, arc (Monad not listed). Items: `caip2`, `transaction_hash`, `user_operation_hash`, `status`, `created_at`, `sponsored`, `details`.

## Balance API

`GET /v1/wallets/{wallet_id}/balance`, Node `privy.wallets().balance.get(walletId, params)`.
- `asset` + `chain` (named): assets `usdc usdc_e eth avax pol bnb usdt eurc usdb ousd pathusd sol trx`; mainnet chains `ethereum arbitrum avalanche base bsc hypercore hyperevm ink linea megaeth optimism polygon robinhood solana soneium tempo tron unichain worldchain zksync_era`; testnets `arbitrum_sepolia avalanche_fuji base_sepolia bsc_testnet hoodi ink_sepolia linea_testnet optimism_sepolia polygon_amoy robinhood_testnet sepolia solana_devnet solana_testnet tempo_testnet tron_nile`.
- `token`: `chain:address` (up to 10), cannot combine with asset/chain or `include_currency`.
- `include_currency`: `usd` | `eur`.
- Response: `{balances: [{chain, asset, raw_value, raw_value_decimals, display_values}]}`.
- Monad is not in the chain list: read Monad balances onchain (viem `getBalance` / ERC-20 `balanceOf` against a Monad RPC) unless Privy confirms support.

Account-level aggregated USD balance across wallets: https://docs.privy.io/wallets/accounts/balance.md (digital asset accounts, not covered here).
