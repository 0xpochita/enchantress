# Gas sponsorship

Engine powered by Alchemy. Two modes.

## App pays

- EVM: EIP-7702 upgrade of the user wallet + paymaster. No separate contract account (unlike 4337 smart wallets). If users already hold funds in smart wallets, keep using smart wallets (paymaster URL in dashboard, see https://docs.privy.io/wallets/gas-and-asset-management/gas/ethereum.md).
- Cost: actual network gas + convenience fee.
- Requires TEE execution (migration: https://docs.privy.io/recipes/tee-wallet-migration-guide).
- ERC-1271 signing (Permit2, TransferWithAuthorization) supported for 7702-upgraded wallets: https://docs.privy.io/recipes/evm/erc-1271-signatures.md

Supported EVM mainnets: ApeChain, Arbitrum, Base, Berachain, BNB Smart Chain, Edge, Ethereum, Flow, Fluent, Gnosis, Ink, Linea, MegaETH, **Monad**, Optimism, Plasma, Polygon, Robinhood Chain, Ronin, Shape, Soneium, Stable, Story, Unichain, Warden, World Chain, X Layer.
Testnets: Arbitrum Sepolia, Base Sepolia, BNB Smart Chain Testnet, Edge Testnet, Fluent Testnet, Ink Sepolia, MegaETH Testnet (Deprecated), **Monad Testnet**, OP Sepolia, Polygon Amoy, Robinhood Testnet, Ronin Saigon, Seismic Testnet, Sepolia, Shape Sepolia, Soneium Minato, Stable Testnet, Unichain Sepolia.
Also Tempo (native fee-payer signature) and Solana (Privy fee payer wallet).

### Setup steps

1. Billing: prepaid credits at **Billing > Fee sponsorship** (Add credits, automated refill; mainnet needs a saved payment method) or postpaid (Enterprise, contact sales).
2. App **Fee sponsorship** page: turn on **Sponsor gas fees**.
3. **Supported chains**: select networks. Sponsored requests must use a configured chain.
4. Send with `sponsor: true`:
   - React: `useSendTransaction().sendTransaction(tx, {sponsor: true})`.
   - Node: `privy.wallets().ethereum().sendTransaction(walletId, {caip2, params: {transaction}, sponsor: true})`.
   - REST: `POST /v1/wallets/{id}/rpc` body `{"method": "eth_sendTransaction", "caip2": "...", "sponsor": true, "params": {...}}`.
   - Other client SDKs (RN, Swift, Android, Flutter, Unity): build in client, relay through your server.
   - Solana-only toggle "Allow transactions from the client" exists; otherwise sponsor from server.

Sponsored EVM response: `hash: ""` until the user operation confirms, plus `user_operation_hash` and `transaction_id`. `user_operation.completed` webhook fires when the UserOperation lands.

Wallet action APIs (transfer, swap) sponsor optimistically when sponsorship is enabled with credits; else the wallet pays native gas. Swaps require sponsorship.

## User pays (token gas)

Wallet pays gas in a stablecoin; app credits not charged. EVM only, server only.

| Chain | USDC | USDT | EURC | USDG | USDC.e |
| - | - | - | - | - | - |
| Ethereum | y | y | y | y | - |
| Base | y | y | y | - | - |
| Tempo | y* | y* | - | - | y |
| Optimism | y | y | - | - | - |
| Arbitrum | y | y | - | - | - |
| Polygon | y | y | - | - | y |
| Sepolia / Base Sepolia / OP Sepolia / Arbitrum Sepolia / Polygon Amoy / Tempo Moderato | partial, see docs | | | | |

(*) Tempo naming differs; Tempo is transfer API only. Monad is NOT supported for user pays.

Setup: Fee sponsorship page -> turn OFF **Sponsor gas fees** -> **Custom gas payment tokens** -> add chain/token pairs -> Save.
Use: transfer API (automatic, gas token = transferred token) or `eth_sendTransaction` / `wallet_sendCalls` with `sponsor: true` + `sponsor_options: {asset: 'usdc'}`.
Errors (400): insufficient balance, unsupported chain/token, asset not configured, `sponsor_options` required (user-pays app sent `sponsor: true` alone), unsupported method. No contract deployment (`to` required). Not counted in `gas_spend`.

## Usage, billing, monitoring

- `GET /v1/apps/gas_spend?wallet_ids=a&wallet_ids=b&start_timestamp=ms&end_timestamp=ms` -> `{value: "12.345678", currency: "usd"}`. 1..100 wallets, range <= 30 days. 404 if a wallet is not in the app.
- Prepaid credits are shared for gas and swap provider fee sponsorship. Insufficient credits: add credits then retry.
- Usage webhooks: `usage.gas_sponsorship.recorded` (currently postpaid accounts only, prepaid coming soon) and `usage.swap_provider_fee.recorded`. Payload `{type, event_id, source_id (wallet action id), source_type ('wallet-action-transfer' | 'wallet-action-swap'), amount_usd ("0.004213"), recorded_at}`. Dedupe by `event_id`.

## Abuse protection (from security best practices)

- Privy aggressively rate limits client-sent transactions; relay from your server for granular control.
- Add per-wallet, per-user and per-app daily caps; fall back to `sponsor: false` when a cap is hit (recipe: https://docs.privy.io/recipes/gas-sponsorship-rate-limits.md).
- Monitor spikes, repeated failures; simulate before sponsoring; circuit breakers; gradual limits for new accounts.
- Solana-specific: strip `CloseAccount` instructions (ATA rent refund exploit).
