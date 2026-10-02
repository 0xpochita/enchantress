# Wallet actions (transfer, swap) and intents

## Transfer: `POST /v1/wallets/{wallet_id}/transfer`

React `useTransfer().transfer(walletId, body)` (signs with the user's embedded wallet), Node `privy.wallets().transfer(walletId, {...body, authorization_context})`.

Body:
- `source` (required): `asset` (named) OR `asset_address` (custom token, configure in Dashboard **Asset watchlist**), `amount` (decimal string in standard units, e.g. `"10.0"`), `chain` (API value).
- `destination` (required): `address`; `asset` (cross-asset); `chain` (cross-chain).
- `amount` (overrides `source.amount`), `amount_type`: `exact_input` (default) | `exact_output` (only cross-chain/cross-asset with EVM source).
- `slippage_bps` 0..10000 (cross-chain/asset only, omit = auto).
- `fee_configuration: {type: 'total_fee_bps', value}` (cross-chain developer fee cap).

Named assets: `ousd usdc usdc_e usdt usdt0 usdb usdg pathusd eurc eth sol pol trx`.

Chains (API value): `ethereum`, `base`, `arbitrum`, `polygon`, `tempo`, `robinhood`, `solana`, `tron`; testnets `ethereum_sepolia`, `base_sepolia`, `arbitrum_sepolia`, `polygon_amoy`, `tempo_testnet`, `robinhood_testnet`, `solana_devnet`, `tron_nile`. Monad is not listed: "To transfer on chains not listed above, use the low-level RPC API".

Bridging and same-peg stablecoin conversion among Ethereum, Base, Tempo, Robinhood, Arbitrum, Polygon, Solana (fees, slippage, liquidity apply). Tron same-chain only.

Response: pending action `{id, status: 'pending', wallet_id, created_at, type: 'transfer', source_asset, source_amount, source_chain, destination_address, destination_amount?, fees?, failure_reason?}`.

User-pays gas on transfer: automatic when app is in user-pays mode and the source token is configured for that chain; gas is paid in the transferred token; requires `source.asset` (not `asset_address`).

## Swap: `POST /v1/wallets/{wallet_id}/swap` and `/swap/quote`

Node: `privy.wallets().swaps().quote(walletId, body)` and `.execute(walletId, {...body, authorization_context, idempotency_key?})`. No React hook documented.

Setup: Dashboard **Wallet Infrastructure > Wallets > Advanced** -> **Enable token swaps** (off by default). Gas sponsorship is REQUIRED. Optional **Sponsor swap provider fees**. Routing: EVM via Uniswap (All Uniswap default, or pools only); strategy **Fastest** (default) or **Best price**.

Body:
- `source: {caip2, asset_address}` (`"native"` allowed where chain has a native token).
- `destination: {asset_address, caip2?, destination_address?}` (`caip2` only for cross-chain; `destination_address` needed EVM <-> Solana).
- `base_amount` (base units, e.g. wei), `amount_type` `exact_input` | `exact_output`, `slippage_bps?` (omit = auto), `fee_configuration?` (cross-chain only).

Quote response: `input_amount`, `est_output_amount`, `minimum_output_amount`, `gas_estimate`, `expires_at`, cross-chain `estimated_fees`, `estimated_gas`.
Execute response: pending action `{id, status, wallet_id, caip2, input_token, output_token, input_amount, output_amount}` (amounts populated after confirmation).

Chains: Ethereum 1, Optimism 10, BNB 56, Unichain 130, Polygon 137, **Monad 143 (MON)**, World Chain 480, Tempo 4217 (no native token), Robinhood 4663, Base 8453, Arbitrum 42161, Solana; testnets Unichain Sepolia 1301, **Monad Testnet 10143**, Robinhood Testnet 46630, Sepolia, Base Sepolia. Cross-chain routes: Ethereum, Base, Tempo, Robinhood, Arbitrum, Polygon, Solana only.

Fees: Privy swap fee up to 0.25% (in rate), DEX protocol fee, gas (sponsored from your credits, includes approvals), cross-chain relayer and developer fees. Failed swaps (slippage) still incur network fees.

## Action status

- `GET /v1/wallets/{wallet_id}/actions/{action_id}` (`?include=steps` for per-step chain, hash, status).
- `GET /v1/wallets/{wallet_id}/actions?limit=&cursor=` -> `{data, next_cursor}`.
- React `useWalletActions()` -> `getAction(walletId, actionId)`, `listActions(walletId, {limit})`. React `getAction` does not support `include=steps`.
- Poll infrequently, stop at `succeeded` | `rejected` | `failed`. Prefer `wallet_action.*` webhooks.
- Lifecycle details: https://docs.privy.io/wallets/actions/lifecycle.md

## Intents (async authorization)

Flow: propose -> collect authorization signatures (one per call) -> Privy executes when threshold met.

Propose:
- Transfer: `POST /v1/intents/wallets/{wallet_id}/transfer` (same body as transfer). Node `privy.intents().transfer(walletId, params)` (type `IntentTransferParams`).
- RPC: `POST /v1/intents/wallets/{wallet_id}/rpc`. Node `privy.intents().rpc(walletId, rpcRequest)` (e.g. type `EthereumSendTransactionRpcInput` with `method`, `caip2`, `sponsor`, `params.transaction`).
- Also: update wallet, update policy, update policy rules, update key quorum.
- Response includes `intent_id`, `status`, `authorization_details`.

Authorize: `POST /v1/intents/{intent_id}/authorize` with body `{signature, timestamp}` (app secret or wallet owner's user token). Signature payload = `{version: 1, method, url, body}` copied from the intent's `request_details`, plus `timestamp` (ms, within 5 min of server time) and `intent_id`, plus `headers: {'privy-app-id'}` (and `privy-request-expiry` only if `custom_expiry`). RFC 8785 canonicalize, ECDSA P-256, base64. SDKs build this automatically (Java SDK shows `client.intents().authorize(id, authorizationContext)`; Node authorize helper not shown in docs, verify in docs: https://docs.privy.io/transaction-management/intents/sign-intents.md).

Fetch: `GET /v1/intents/{intent_id}`, Node `privy.intents().get(intentId)`; list: `GET /v1/intents`. After execution `action_result.response_body` holds e.g. the tx hash.

Statuses: `pending`, `granted` (this signer signed, threshold not met), `processing`, `executed`, `failed`, `rejected`, `expired` (default 72h), `dismissed` (resource changed or deleted). Terminal states require a new intent.

Webhooks: `intent.created` (authorizers, `expires_at`), `intent.authorized`, `intent.rejected`, `intent.executed` (`action_result`), `intent.failed`.

Dashboard-native version: Manual approvals (Approvals page).
