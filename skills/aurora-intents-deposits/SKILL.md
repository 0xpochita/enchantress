---
name: aurora-intents-deposits
description: Aurora Intents Deposits (built on NEAR Intents / 1Click) for enchantress. Covers giving a user a deposit address that accepts tokens from any supported chain (EVM, Solana, Bitcoin, Tron, TON, NEAR, ...) and delivers a chosen asset to a recipient on a destination chain, including Monad. Covers the Deposit Widget (Intents Widget Studio, iframe or React snippet), the API flow (tokens -> quote -> send to depositAddress -> status), Persistent Deposit Addresses (POST /api/persistent-deposit-address, persistent-deposit-status, persistent-deposit-addresses list, persistent-deposit-address-data), supported chains, fees, and Custom Actions (coming soon). Load when the task mentions Aurora deposit, Intents Deposits, deposit widget, deposit address, persistent deposit address, PDA, universal deposit, top-up from any chain, fund Monad wallet from another chain, cross-chain deposit, intents-api.aurora.dev deposit, depositChain, destinationAsset, or comparing Aurora deposits with Privy crypto deposit addresses.
---

# Aurora Intents Deposits

Generate a deposit address for a user. The user does a plain token transfer to it; Aurora/NEAR Intents detects it, routes it, swaps if needed and credits the recipient on the destination chain. No further input from user or app.

Two address flavours:
- **Quote deposit address** (Swap API `/api/quote`): one-off, tied to a quote with amount, deadline, refund address.
- **Persistent Deposit Address (PDA)**: deterministic, no TTL, unlimited reuse, per user. Creation requires Aurora approval (403 otherwise).

Full PDA request/response types: read `references/persistent-addresses-api.md` when writing code against the PDA endpoints.

## Basics

- Base URL: `https://intents-api.aurora.dev`. API key goes in the PATH (`/api/<endpoint>/{apiKey}`), no auth header.
- Create keys in Intents Studio: https://studio.aurora.dev. Docs: "The API key is not confidential, allowing its use in public-facing services such as websites." Still keep it in env (`NEXT_PUBLIC_AURORA_API_KEY` for client, `AURORA_API_KEY` for server) so it is rotatable.
- Overview page says "Permissionless... API keys are issued immediately". Exception: PDA creation is "limited to organisations approved by Aurora; any other API key receives a 403". No documented approval process: ask Aurora (contact@aurora.dev / Telegram mentor).
- Fees per key (Studio > API keys > Edit fees): split 60% integrator / 40% Aurora; Aurora fee = max(2 bps, 40% of integrator fee); max fee 100 bps.
- Webhooks: "coming soon". Poll status endpoints.
- Confidentiality (optional): deposits separated from withdrawals via confidential intents (`confidential: true` on PDA).

## Option A: Deposit Widget (no backend)

1. Log in at https://studio.aurora.dev (email, top right).
2. Choose **Deposit Widget** mode, set **Destination asset** and **Receiver address** (must be compatible). Optionally limit networks/tokens and wallet connection handling.
3. Style it, then **Embed in your app**: iframe ("Generate a new link to embed") or React ("Use React code snippet").
4. React embed supports advanced settings (own wallet connection, widget hooks): see the aurora-intents-swap skill / https://docs.intents.aurora.dev/intents-swap/widget-configuration.md. Copy the snippet from Studio; do not hand-write package names or props.

Demo config (USDC on Base): https://studio.aurora.dev/?configId=8cb195f4-f1ae-45cb-9726-43830954d029

For enchantress: Receiver address = the user's Privy embedded EVM wallet address (same 0x address on Monad). A static widget config has one fixed receiver; a per-user receiver needs the React snippet or the API.

## Option B: API (quote-based deposit address)

Steps from the API integration quickstart. Swap request/response details live in aurora-intents-swap.

```ts
const AURORA = 'https://intents-api.aurora.dev';
const apiKey = process.env.AURORA_API_KEY ?? '';

type AuroraToken = {
  assetId: string; // "nep141:..." or "nep245:..."
  decimals: number;
  blockchain: string; // e.g. "eth", "base", "monad"
  symbol: string;
  price: number;
  priceUpdatedAt: string;
  contractAddress: string | null;
};

// 1. Supported tokens -> assetId values
const tokens: AuroraToken[] = await (await fetch(`${AURORA}/api/tokens/${apiKey}`)).json();

// 2. Quote (dry: false so a depositAddress is issued)
const res = await fetch(`${AURORA}/api/quote/${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dry: false, // true = validate + price only, no execution
    swapType: 'EXACT_INPUT', // or 'EXACT_OUTPUT'
    slippageTolerance: 100, // bps, 100 = 1%
    originAsset: 'nep141:eth.omft.near', // ETH on Ethereum
    depositType: 'ORIGIN_CHAIN', // or 'INTENTS'
    destinationAsset: 'nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx', // USDC on Monad
    amount: '10000000000000000', // smallest unit of originAsset
    recipient: '0xUserPrivyWallet', // address on destination chain
    recipientType: 'DESTINATION_CHAIN', // or 'INTENTS'
    refundTo: '0xUserAddressOnOriginChain',
    refundType: 'ORIGIN_CHAIN', // or 'INTENTS'
    deadline: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
  }),
});
type QuoteResponse = {
  timestamp: string;
  signature: string;
  correlationId?: string | null;
  quote: { depositAddress?: string; depositMemo?: string; amountIn: string; amountOut: string; minAmountOut: string; timeEstimate: number };
};
const { quote }: QuoteResponse = await res.json();
// 3. User transfers originAsset to quote.depositAddress. Save depositAddress + tx hash.
```

4. Optional speed-up: `POST /api/deposit/submit/{apiKey}` body `{ txHash, depositAddress, nearSenderAccount?, memo? }` (required: `txHash`, `depositAddress`).
5. Status: `GET /api/status/{apiKey}?depositAddress=...&depositMemo=...` (memo only if the quote returned one), or history `GET /api/transactions/{apiKey}?walletAddress=...`.

Statuses: `PENDING_DEPOSIT`, `KNOWN_DEPOSIT_TX`, `PROCESSING`, `SUCCESS`, `INCOMPLETE_DEPOSIT` (below required amount), `REFUNDED` (funds to refundTo), `FAILED`.

Gotcha: the docs' JavaScript quote example POSTs to `/api/tokens/${appKey}`; that is a doc bug. The cURL tab and API reference use `POST /api/quote/{apiKey}`.

Sending from a Privy wallet (if the source is the user's own Privy wallet): build an ERC-20 `transfer(depositAddress, amount)` or native send and submit with Privy `useSendTransaction` (see privy-transactions skill). Most deposit use cases are the reverse: user sends from an external wallet/CEX and the Privy wallet is the `recipient`.

## Option C: Persistent Deposit Address (PDA)

Deterministic per (API key, sender, recipient, depositChain, destinationChain/destinationAsset, confidential). Repeat calls return the same address, so it is safe to store. "The PDA is unique per chain and supports multiple asset deposits." If the deposited asset differs from `destinationAsset`, the swap runs in the same flow.

**EVM chains share one address**: call once with any EVM chain (or `depositChain: 'evm'`, which resolves to Base); the address works for deposits on every supported EVM chain. Non-EVM chains (sol, btc, tron, ...) each need their own call. Stellar returns a `memo` that MUST be included.

Server route (Next.js App Router) creating a per-user Monad USDC top-up address:

```ts
// app/api/deposit-address/route.ts
import { NextResponse } from 'next/server';

type CreatePdaResponse = { depositAddress: string; alreadyExists: boolean; memo?: string; correlationId?: string };
type AuroraError = { message: string; statusCode?: number };

export async function POST(req: Request) {
  // Derive userId and recipient from a verified Privy session, never from the raw body.
  const { userId, recipient, depositChain } = (await req.json()) as {
    userId: string; recipient: string; depositChain: 'evm' | 'sol' | 'btc' | 'tron';
  };
  const res = await fetch(
    `https://intents-api.aurora.dev/api/persistent-deposit-address/${process.env.AURORA_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient,                   // user's Privy EVM wallet
        sender: userId,              // your user id, for attribution
        depositChain,
        destinationChain: 'monad',
        destinationAsset: 'USDC',    // or 'nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx'
      }),
    },
  );
  if (!res.ok) {
    const err = (await res.json()) as AuroraError; // 403 = org not approved; 429 = retry
    return NextResponse.json({ error: err.message }, { status: res.status });
  }
  return NextResponse.json((await res.json()) as CreatePdaResponse);
}
```

Tracking:
- `GET /api/persistent-deposit-status/{apiKey}?type=received|success|failed&address=<pda>[&limit&offset]` -> `{ deposits: [...] }`. `received` = reached the Intents account; `success`/`failed` = outbound withdrawal to recipient.
- `GET /api/persistent-deposit-addresses/{apiKey}?sender=...&recipientChain=monad&page=1&perPage=50` -> paginated list.
- `GET /api/persistent-deposit-address-data/{apiKey}?address=<pda>` -> single record (404 if not this key's).

Docs also mention a "Destination action" (credit balance, contract call, fund position) "encoded at generation time", but the create endpoint has no field for it; treat as part of Custom Actions (not available).

## Custom Actions (coming soon)

"Coming soon. It allows the chain of actions on the target chain." Widget Studio will let you define custom actions for the deposit widget. API page is a draft (example: send ETH on Ethereum -> open a USDC position on Morpho; mentions a `/deposits` endpoint with a localhost URL). Do not build against it. Widget page is empty. For chaining an action after a cross-chain move today, see aurora-intents-connect.

## Aurora vs Privy crypto deposit addresses

Both give a persistent address that converts incoming crypto into one target asset (Privy: `useHeadlessCryptoDeposit`, `POST /v1/wallets/{wallet_id}/deposit_accounts/crypto`; see privy-funding skill).

| | Aurora PDA | Privy crypto deposits |
|---|---|---|
| Monad as destination | Yes (`destinationChain: 'monad'`) | Not documented: Privy cross-chain routes are only Ethereum, Base, Tempo, Robinhood Chain, Arbitrum, Polygon, Solana |
| Source chains | ~34 incl. BTC, Tron, TON, NEAR, Solana, all listed EVM | Privy cross-chain set above |
| Prereqs | Aurora-approved org for PDA creation; API key | Swaps + App-pays gas sponsorship per source chain |
| Fees | Integrator fee 0-100 bps + Aurora min 2 bps | Privy pricing |
| Recipient | Any address (e.g. Privy wallet) | Bound to a Privy wallet |

Recommendation for enchantress: for "deposit from any chain, land as USDC/MON on Monad in the user's Privy wallet", Aurora PDA (or the Deposit Widget / quote flow if PDA approval is pending) is the documented route. Use Privy deposits only for routes Privy lists.

## Monad notes

- Supported Chains table (https://docs.intents.aurora.dev/intents-deposits/supported-chains.md): "Monad | ✅ Supported | ✅ Supported" under SOURCE and DESTINATION. Monad is valid both ways.
- PDA create enums: `depositChain` and `destinationChain` both include `"monad"`. List filter `depositChain` reports EVM as `"evm"`; use `recipientChain=monad` to filter Monad-destination addresses.
- Monad asset ids (https://docs.intents.aurora.dev/intents-swap/supported-assets.md):
  - MON: `nep245:v2_1.omni.hot.tg:143_11111111111111111111`
  - USDC (`0x754704bc059f8c67012fed69bc8a327a5aafb603`): `nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx`
  - USDT0 (`0xe7cd86e13ac4309349f30b3435a9d337750fc82d`): `nep245:v2_1.omni.hot.tg:143_4EJiJxSALvGoTZbnc8K7Ft9533et`
  The `143` in the ids matches Monad mainnet chain id (CAIP-2 `eip155:143`). Testnet (10143) not mentioned in deposit docs: assume mainnet only; verify with Aurora.
- A Monad user's PDA from `depositChain: 'evm'` also accepts deposits sent on Monad itself (EVM chains share one address); a Monad-source, Monad-destination same-asset deposit is not described, verify before relying on it.
- Live token list is authoritative: `GET /api/tokens/{apiKey}` and filter `blockchain === 'monad'` (value assumed from chain codes; verify).

## Source pages

- https://docs.intents.aurora.dev/intents-deposits/what-are-intents-deposits.md
- https://docs.intents.aurora.dev/intents-deposits/quickstart/widget-integration.md
- https://docs.intents.aurora.dev/intents-deposits/quickstart/api-integration.md
- https://docs.intents.aurora.dev/intents-deposits/supported-chains.md
- https://docs.intents.aurora.dev/intents-deposits/persistent-addresses.md
- https://docs.intents.aurora.dev/intents-deposits/custom-actions.md
- https://docs.intents.aurora.dev/intents-deposits/custom-actions/custom-actions-api.md
- https://docs.intents.aurora.dev/api-reference/persistent-addresses-api-reference/create-persistent-deposit-address.md
- https://docs.intents.aurora.dev/api-reference/persistent-addresses-api-reference/get-persistent-deposit-status.md
- https://docs.intents.aurora.dev/api-reference/persistent-addresses-api-reference/get-persistent-address-data.md
- https://docs.intents.aurora.dev/api-reference/swap-api-reference/submit-a-deposit.md
- https://docs.intents.aurora.dev/api-reference/swap-api-reference/get-swap-status.md
- https://docs.intents.aurora.dev/api-reference/swap-api-reference/request-a-quote.md
- https://docs.intents.aurora.dev/intents-swap/supported-assets.md
- https://docs.intents.aurora.dev/getting-started/api-keys-and-fees.md
