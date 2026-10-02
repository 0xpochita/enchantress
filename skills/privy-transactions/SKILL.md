---
name: privy-transactions
description: Privy money movement for the enchantress Next.js app (excluding Earn). Covers high-level wallet action APIs (transfer, swap, quote, action status, useTransfer, useWalletActions, privy.wallets().transfer, privy.wallets().swaps()), low-level EVM signing and RPC (useSendTransaction, useSignMessage, useSignTypedData, useSignTransaction, privy.wallets().ethereum().sendTransaction/signMessage/signTypedData, POST /v1/wallets/{id}/rpc eth_sendTransaction), intents (propose transfer/rpc, authorize, status, expiry), transaction lookup (privy.transactions().get, reference_id), gas sponsorship (sponsor: true, app pays vs user pays, sponsor_options, dashboard Fee sponsorship, supported chains, credits, gas_spend, abuse protection), balances (GET /v1/wallets/{id}/balance, privy.wallets().balance.get) and webhooks (transaction.*, wallet.funds_deposited/withdrawn, wallet_action.*, intent.*, usage.*, svix signature verification with privy.webhooks().verify). Load when the task mentions: send transaction, transfer tokens, send USDC/ERC-20, swap, quote, sign message, EIP-712, typed data, gasless, sponsor gas, paymaster, gas credits, wallet action, intent, approval flow, transaction status, tx hash, reference id, wallet balance, deposit webhook, transaction webhook, verify webhook, Monad transactions.
---

# Privy transactions, gas sponsorship, balances and webhooks

Scope: moving value with Privy wallets on EVM (Monad focus). Earn (vaults) is out of scope, see the earn skill. Wallet creation, `PrivyProvider` / `PrivyClient` setup and chain config live in `skills/privy-wallets`.

## Four ways to act with a wallet

| Approach | What | Use for |
| - | - | - |
| Wallet action APIs | `transfer`, `swap`, `earn`, `payout/fiat` under `/v1/wallets/{wallet_id}/`. Async, Privy builds the txs. | Most cases (Privy recommends) |
| Wallet automations | Actions fired by events (deposit-triggered). | Event-driven flows |
| Low-level RPC | `eth_sendTransaction`, `personal_sign`, `eth_signTypedData_v4`, sign tx. You build calldata. | Custom contracts, chains not covered by actions (Monad transfers) |
| Intents | Propose now, collect authorization signatures later, Privy executes at threshold. | Async / multi-party approvals |

## Key concepts

- **Wallet action**: async resource with `id`, `type`, `status` (`pending`/`created` -> `succeeded` | `rejected` | `failed`), optional `steps` (`?include=steps`). `rejected` = nothing onchain, safe to retry. `failed` = something may have been broadcast, inspect steps.
- **RPC endpoint is synchronous**: success means broadcast, NOT confirmed. No auto retry. Track via `transaction.*` webhooks or `privy.transactions().get(transaction_id)`.
- **Authorization signatures**: wallets with an owner/signers need `privy-authorization-signature` on REST calls. Node SDK: pass `authorization_context: { authorization_private_keys: [...] }`. React hooks sign with the user's embedded wallet.
- **CAIP-2**: chain id string `eip155:<chainId>`. Monad mainnet `eip155:143`, testnet `eip155:10143` (from the swap supported-chains table).
- **Policies**: wallet action APIs are governed by their own policy method (e.g. `method: 'transfer'`), not by `eth_sendTransaction` rules.

## Client side (React, `@privy-io/react-auth`)

```tsx
'use client';
import {useSendTransaction, useSignMessage, useSignTypedData} from '@privy-io/react-auth';
import {encodeFunctionData, erc20Abi, parseUnits, type Address} from 'viem';

const MONAD_CHAIN_ID = 143; // testnet: 10143

export function useMonadPayments() {
  const {sendTransaction} = useSendTransaction();
  const {signMessage} = useSignMessage();
  const {signTypedData} = useSignTypedData();

  async function sendErc20(token: Address, to: Address, amount: string, decimals: number) {
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to, parseUnits(amount, decimals)],
    });
    // sponsor: true -> app pays gas (needs dashboard setup + TEE execution, see below)
    const {hash} = await sendTransaction(
      {to: token, data, chainId: MONAD_CHAIN_ID},
      {sponsor: true, uiOptions: {showWalletUIs: false}},
    );
    return hash; // broadcast hash
  }

  async function sign(message: string) {
    const {signature} = await signMessage({message});
    return signature;
  }

  return {sendErc20, sign, signTypedData};
}
```

- `sendTransaction(input, {sponsor?, uiOptions?, fundWalletConfig?, address?})` returns `{hash}`. `address` picks the wallet (recommended with external wallets); default is the first wallet.
- `useSignTransaction().signTransaction(input, options)` signs without broadcast, returns `{signature}`.
- `useSignTypedData().signTypedData(eip712Object, options)` returns `{signature}`.
- Hooks accept `{onSuccess, onError}` callbacks.
- Hide confirm modals with `uiOptions.showWalletUIs: false`.
- High level: `useTransfer().transfer(walletId, body)` and `useWalletActions().getAction(walletId, actionId)` / `listActions(walletId, {limit})`. No React swap hook is documented (swap is REST / Node / Python only).

## Server side (`@privy-io/node`)

```ts
// lib/privy-server.ts (server only)
import {PrivyClient} from '@privy-io/node';

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const privy = new PrivyClient({
  appId: env('PRIVY_APP_ID'),
  appSecret: env('PRIVY_APP_SECRET'),
  webhookSigningSecret: env('PRIVY_WEBHOOK_SIGNING_SECRET'),
});
```

```ts
import {env, privy} from '@/lib/privy-server';

// Low-level send on Monad (works on any EVM caip2; transfer API does not list Monad)
const {hash, caip2} = await privy.wallets().ethereum().sendTransaction(walletId, {
  caip2: 'eip155:143',
  params: {transaction: {to: tokenAddress, data: encodedData, chain_id: 143}},
  sponsor: true,
  reference_id: `order-${orderId}`, // optional, unique, <= 64 chars, echoed in tx webhooks
  authorization_context: {authorization_private_keys: [env('PRIVY_AUTHORIZATION_KEY')]},
});

const {signature} = await privy.wallets().ethereum().signMessage(walletId, {message: 'hello'});
const {signed_transaction} = await privy.wallets().ethereum().signTransaction(walletId, {
  params: {transaction: {to, value: '0x0', chain_id: 143}},
});
// signTypedData: params.typed_data {domain, types, primary_type, message}

// High-level transfer (supported chains only, Monad NOT listed)
const action = await privy.wallets().transfer(walletId, {
  source: {asset: 'usdc', amount: '10.0', chain: 'base'},
  destination: {address: '0xRecipient'},
  authorization_context: {authorization_private_keys: [env('PRIVY_AUTHORIZATION_KEY')]},
});

// Swap (Monad IS supported): amounts in base units
const quote = await privy.wallets().swaps().quote(walletId, {
  source: {caip2: 'eip155:143', asset_address: 'native'},
  destination: {asset_address: '0xTokenOnMonad'},
  base_amount: '1000000000000000000',
  amount_type: 'exact_input',
});
const swap = await privy.wallets().swaps().execute(walletId, {
  source: {caip2: 'eip155:143', asset_address: 'native'},
  destination: {asset_address: '0xTokenOnMonad'},
  base_amount: '1000000000000000000',
  amount_type: 'exact_input',
  slippage_bps: 50, // omit for auto slippage
  authorization_context: {authorization_private_keys: [env('PRIVY_AUTHORIZATION_KEY')]},
});

const tx = await privy.transactions().get(transactionId); // status, transaction_hash, caip2
const bal = await privy.wallets().balance.get(walletId, {asset: 'usdc', chain: 'base'});
```

REST equivalents: `POST /v1/wallets/{id}/rpc` (body `{method: 'eth_sendTransaction', caip2, params: {transaction}, sponsor?, sponsor_options?, reference_id?}`), `POST /v1/wallets/{id}/transfer`, `POST /v1/wallets/{id}/swap`, `GET /v1/wallets/{id}/actions/{action_id}?include=steps`, `GET /v1/transactions/{id}`, `GET /v1/transactions?reference_id=...`, `GET /v1/wallets/{id}/balance`, `GET /v1/wallets/{id}/transactions?chain=...&asset=...`. Auth: Basic `appId:appSecret` + `privy-app-id` header.

Sponsored `eth_sendTransaction` response: `hash` is `""` until the user operation confirms; use `user_operation_hash` / `transaction_id` and webhooks.

## Gas sponsorship (short)

- Modes: **App pays** (your credits/invoice, `sponsor: true`) and **User pays** (wallet's stablecoin pays gas, EVM only, server only via `sponsor_options: {asset: 'usdc'}`, limited chains, NOT Monad).
- Setup: Dashboard **Fee sponsorship** -> add credits (prepaid; mainnet needs a saved payment method) or Enterprise postpaid -> turn on **Sponsor gas fees** -> select **Supported chains** (requests must use a configured chain) -> send with `sponsor: true`.
- App **must use TEE execution** for native gas sponsorship.
- EVM mechanism: EIP-7702 upgrade + paymaster (Alchemy). No separate smart wallet address. Existing 4337 smart wallet users: keep smart wallets.
- `sponsor: true` exists in React SDK + server SDKs (REST, Node, Rust). Other client SDKs: relay through your server.
- Privy aggressively rate limits client-sent sponsored txs: route via backend and add your own per-user caps.
- Price: network gas + convenience fee. Usage: `GET /v1/apps/gas_spend` (<=100 wallet ids, <=30 days).
- Swaps REQUIRE gas sponsorship enabled. Wallet actions sponsor optimistically when enabled with credits.

Details, full chain list, billing, security: `references/gas-sponsorship.md` (read when configuring sponsorship or diagnosing sponsor errors).

## Webhook receiver (Next.js App Router)

```ts
// app/api/privy/webhook/route.ts
import {NextResponse, type NextRequest} from 'next/server';
import {privy} from '@/lib/privy-server';

function verify(payload: string, req: NextRequest) {
  try {
    return privy.webhooks().verify({
      payload, // raw string preferred for signature integrity
      headers: {
        'svix-id': req.headers.get('svix-id') ?? '',
        'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
        'svix-signature': req.headers.get('svix-signature') ?? '',
      },
    });
  } catch {
    return null; // InvalidWebhookError
  }
}

export async function POST(req: NextRequest) {
  const event = verify(await req.text(), req);
  if (!event) return NextResponse.json({error: 'invalid signature'}, {status: 401});

  switch (event.type) {
    case 'transaction.confirmed':
      // event.wallet_id, event.transaction_id, event.transaction_hash, event.caip2
      break;
    case 'wallet.funds_deposited':
      // event.wallet_id, event.amount, event.asset, event.sender, event.idempotency_key
      break;
    case 'wallet_action.transfer.succeeded':
      // event.wallet_action_id, event.steps
      break;
    default:
      break;
  }
  return NextResponse.json({ok: true}); // any 2xx = delivered
}
```

- Delivery via Svix, at least once: dedupe on `idempotency_key` (where present), `event_id` (usage events) or `svix-id` header.
- Retries: immediately, 5s, 5m, 30m, 2h, 5h, 10h, 10h. Endpoint disabled after 5 days of failures.
- Register in Dashboard **Configuration > Webhooks** (https URL), "Test webhook" sends `{type: 'privy.test'}`.
- **Webhooks are free in development; production requires the Enterprise plan.**

Event catalog, payload fields, balance/history API params: `references/webhooks-and-tracking.md` (read when wiring tracking, reconciliation or deposit detection).
Transfer/swap params, action status, intents: `references/wallet-actions-and-intents.md` (read when using transfer/swap/intents beyond the snippets above).

## Gotchas

- Transfer amounts are decimal strings in standard units (`"10.0"`); swap `base_amount` is base units (wei). Do not mix.
- Transfer API chains: Ethereum, Base, Arbitrum, Polygon, Tempo, Robinhood, Solana, Tron (+ testnets). Not Monad: use RPC.
- Swap token addresses are chain-specific; `"native"` only on chains with a native token. Privy swap fee up to 0.25%; failed swaps still cost gas.
- Intents expire after 72h by default; `failed`/`expired`/`rejected`/`dismissed` are terminal (re-propose). Updating a wallet dismisses its pending intents.
- Balance, tx-event, deposit webhook and tx-lookup pages are flagged "for wallets reconstituted server-side" (TEE). Verify behavior for client-only embedded wallets.
- REST RPC idempotency: on 4xx/5xx Privy caches the response for the same idempotency key; use a new key to retry after a server error.
- Never hard-code secrets: `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PRIVY_WEBHOOK_SIGNING_SECRET`, `PRIVY_AUTHORIZATION_KEY` from env.

## Monad notes

- **Gas sponsorship (App pays)**: docs list "Monad" under EVM mainnets and "Monad Testnet" under testnets (https://docs.privy.io/wallets/gas-and-asset-management/gas/overview.md). Still enable it per chain under **Supported chains** in the dashboard.
- **User pays gas**: Monad NOT in the supported table (Ethereum, Base, Tempo, Optimism, Arbitrum, Polygon + testnets).
- **Swap API**: Monad `eip155:143` (native MON) and Monad Testnet `eip155:10143` listed (https://docs.privy.io/wallets/actions/swap/overview.md). Cross-chain swap routes do NOT include Monad (same-chain only).
- **Transfer API**: Monad not listed. Docs: "To transfer on chains not listed above, use the low-level RPC API". Use `eth_sendTransaction` with `caip2: 'eip155:143'`.
- **Low-level RPC / signing**: EVM generic via caip2; no Monad-specific restriction found. Verify in dashboard that the chain works for your app.
- **Balance API** (`chain` enum) and **wallet tx history** (`chain` enum): Monad not listed. Monad balance support not confirmed in docs; read balances onchain with viem against a Monad RPC, or verify with Privy.
- **Deposit webhooks**: "available for select chains"; exact list only in Dashboard Webhooks page. Monad support not confirmed in docs; verify in dashboard.
- **Transaction webhooks** (`transaction.*`) for RPC sends: no chain list given; Monad not confirmed, verify.

## Source pages

- https://docs.privy.io/wallets/signatures-and-transactions.md
- https://docs.privy.io/wallets/actions/overview.md
- https://docs.privy.io/wallets/actions/status.md
- https://docs.privy.io/wallets/actions/webhooks.md
- https://docs.privy.io/wallets/actions/transfer/overview.md
- https://docs.privy.io/wallets/actions/transfer/usage.md
- https://docs.privy.io/wallets/actions/swap/overview.md
- https://docs.privy.io/wallets/actions/swap/setup.md
- https://docs.privy.io/wallets/actions/swap/get-quote.md
- https://docs.privy.io/wallets/actions/swap/execute.md
- https://docs.privy.io/wallets/using-wallets/rpc.md
- https://docs.privy.io/wallets/using-wallets/ethereum/send-a-transaction.md
- https://docs.privy.io/wallets/using-wallets/ethereum/sign-a-transaction.md
- https://docs.privy.io/wallets/using-wallets/ethereum/sign-a-message.md
- https://docs.privy.io/wallets/using-wallets/ethereum/sign-typed-data.md
- https://docs.privy.io/api-reference/wallets/ethereum/eth-send-transaction.md
- https://docs.privy.io/recipes/send-usdc.md
- https://docs.privy.io/transaction-management/intents/overview.md
- https://docs.privy.io/transaction-management/intents/create/execute-transfer.md
- https://docs.privy.io/transaction-management/intents/create/execute-rpc.md
- https://docs.privy.io/transaction-management/intents/sign-intents.md
- https://docs.privy.io/transaction-management/intents/lifecycle.md
- https://docs.privy.io/transaction-management/intents/fetch-intent.md
- https://docs.privy.io/transaction-management/intents/intent-webhooks.md
- https://docs.privy.io/transaction-management/transactions/reference-id.md
- https://docs.privy.io/wallets/gas-and-asset-management/gas/overview.md
- https://docs.privy.io/wallets/gas-and-asset-management/gas/setup.md
- https://docs.privy.io/wallets/gas-and-asset-management/gas/security.md
- https://docs.privy.io/wallets/gas-and-asset-management/gas/gas-spend.md
- https://docs.privy.io/wallets/gas-and-asset-management/gas/ethereum.md
- https://docs.privy.io/wallets/gas-and-asset-management/usage-billing/overview.md
- https://docs.privy.io/wallets/gas-and-asset-management/usage-billing/usage-webhooks.md
- https://docs.privy.io/recipes/gas-sponsorship-rate-limits.md
- https://docs.privy.io/wallets/gas-and-asset-management/assets/overview.md
- https://docs.privy.io/wallets/gas-and-asset-management/assets/fetch-balance.md
- https://docs.privy.io/wallets/gas-and-asset-management/assets/balance-event-webhooks.md
- https://docs.privy.io/wallets/gas-and-asset-management/assets/transaction-event-webhooks.md
- https://docs.privy.io/wallets/gas-and-asset-management/assets/fetch-a-transaction.md
- https://docs.privy.io/api-reference/wallets/get-transactions.md
- https://docs.privy.io/api-reference/webhooks/overview.md
- https://docs.privy.io/user-management/users/webhooks/handling-events.md
