# Aurora Swap API reference

Source: https://docs.intents.aurora.dev/api-reference/swap-api-reference.md (OpenAPI title `@aurora-is-near/intents-fee-service`).

- Base URL: `https://intents-api.aurora.dev`
- Auth: API key as **path parameter** `{apiKey}` (generated at https://studio.aurora.dev). OpenAPI `security: []`, no auth header.
- All amounts are strings in the asset's smallest unit unless the field ends in `Formatted` / `Usd`.
- Common error body: `{ message: string; statusCode: number; error?: string; data?: object }`. Upstream 1Click errors (400): `{ message, correlationId, timestamp, path }`.
- Error codes: 400 invalid params / fee config, 404 "Application key is not assigned", 429 rate limit exceeded (quote and status), 500 upstream failure.

## GET /api/tokens/{apiKey}
Tokens and 24h volume stats.
```ts
type TokensResponse = {
  tokens: {
    assetId: string;          // use as originAsset / destinationAsset
    decimals: number;
    blockchain: string;       // near, eth, base, arb, btc, sol, ton, dash, doge, xrp, zec, gnosis, bera, bsc, pol, tron, sui, op, avax, cardano, ltc, xlayer, monad, bch, adi, plasma, scroll, starknet, aleo
    symbol: string;
    price: number;            // USD
    priceUpdatedAt: string;
    contractAddress?: string;
  }[];
  asset_stats: { token_id: string; blockchain: string; symbol: string; volume_amount_usd: string }[];
};
```

## POST /api/quote/{apiKey}
Rate limited per API key.

Request body:
| Field | Req | Notes |
| --- | --- | --- |
| `dry` | yes | `true`: price only, response has no `depositAddress`, `timeWhenInactive`, `deadline` |
| `swapType` | yes | `EXACT_INPUT`, `EXACT_OUTPUT`, `FLEX_INPUT`, `ANY_INPUT` |
| `depositType` | yes | `ORIGIN_CHAIN` (address on origin chain), `INTENTS` (NEAR Intents account), `CONFIDENTIAL_INTENTS` (fund via signed transfer intent to `depositAddress`; direct token transfers not supported) |
| `amount` | yes | smallest unit; input or output depending on `swapType` |
| `originAsset`, `destinationAsset` | yes | asset IDs from `/api/tokens` |
| `slippageTolerance` | yes | bps (100 = 1%) |
| `refundTo` | yes | refund address |
| `refundType` | yes | `ORIGIN_CHAIN`, `INTENTS`, `CONFIDENTIAL_INTENTS` |
| `recipient` | yes | format must match `recipientType` |
| `recipientType` | yes | `DESTINATION_CHAIN`, `INTENTS`, `CONFIDENTIAL_INTENTS` |
| `deadline` | no | ISO; when refunds begin if not completed. Default applied if omitted |
| `depositMode` | no | `SIMPLE` (most chains) or `MEMO` (e.g. stellar requires memo) |
| `confidentiality` | no | `public` (default), `basic`, `advanced` |
| `quoteWaitingTimeMs` | no | `0` = fastest available quote |
| `sessionId` | no | client session id |
| `connectedWallets` | no | `string[]` |
| `virtualChainRecipient`, `virtualChainRefundRecipient` | no | EVM addresses on a virtual chain |

`swapType` semantics:
- `EXACT_INPUT`: deposit below `amountIn` is refunded by deadline; above is swapped and the excess refunded to `refundTo` after the swap.
- `EXACT_OUTPUT`: response has `minAmountIn`/`maxAmountIn`; above max is swapped and excess refunded; below min is refunded by deadline.
- `FLEX_INPUT`: slippage applies to both in and out; any amount above `minAmountIn` is accepted as long as `minAmountOut` is met (constraint "slippage + 1%"); below lower bound by deadline is refunded.
- `ANY_INPUT`: public `ANY_INPUT` quotes with `depositType: 'INTENTS'` return `chainDepositAddresses` (deposit from any listed chain; not on confidential rail).

Response 200:
```ts
type QuoteResponse = {
  timestamp: string;          // used to derive the deposit address
  signature: string;          // 1Click signature for this deposit address
  correlationId?: string | null;
  quoteRequest: QuoteRequest & {
    deadline: string;
    referral?: string | null;
    appFees?: { recipient: string; fee: number }[] | null;
    customRecipientMsg?: string | null;
  };
  quote: {
    timeEstimate: number;     // seconds
    deadline?: string;        // quote inactive, refunds may begin
    timeWhenInactive?: string;// deposit address inactive
    depositAddress?: string;  // absent when dry: true
    depositMemo?: string;     // memo chains: send with deposit
    chainDepositAddresses?: { blockchain: string; address: string; memo?: string }[];
    amountIn: string; amountInFormatted: string; amountInUsd: string;
    minAmountIn: string; maxAmountIn?: string;
    amountOut: string; amountOutFormatted: string; amountOutUsd: string;
    minAmountOut: string;
    refundFee?: string | null;   // origin units, charged on refund
    withdrawFee?: string | null; // destination units, already deducted from amountOut
    virtualChainRecipient?: string | null;
    virtualChainRefundRecipient?: string | null;
    customRecipientMsg?: string | null;
  };
};
```
`customRecipientMsg` (NEAR `ft_transfer_call` message) is HIGHLY EXPERIMENTAL: funds can be lost with non NEP-141 tokens, insufficient `storage_deposit`, or recipients without `ft_on_transfer`.

## POST /api/deposit/submit/{apiKey}
Optional. Notifies 1Click that the deposit was sent so it can verify preemptively (faster processing).
```ts
type DepositSubmitBody = {
  txHash: string;
  depositAddress: string;
  nearSenderAccount?: string; // NEAR only
  memo?: string;              // if the deposit used one
};
```
Response 200 is the same shape as the status response (`correlationId`, `quoteResponse`, `status`, `updatedAt`, `swapDetails`).

## GET /api/status/{apiKey}
Query: `depositAddress` (required), `depositMemo` (required if the quote returned one).
```ts
type SwapStatus =
  | 'KNOWN_DEPOSIT_TX'   // deposit tx known, not yet confirmed
  | 'PENDING_DEPOSIT'    // waiting for deposit
  | 'INCOMPLETE_DEPOSIT' // deposit below required amount
  | 'PROCESSING'
  | 'SUCCESS'
  | 'REFUNDED'
  | 'FAILED';

type TxRef = { hash: string; explorerUrl: string };

type StatusResponse =
  | {
      correlationId: string;
      quoteResponse: QuoteResponse;
      status: SwapStatus;
      updatedAt: string;
      swapDetails: {
        intentHashes: string[];
        nearTxHashes: string[];
        originChainTxHashes: TxRef[];
        destinationChainTxHashes: TxRef[];
        amountIn?: string | null; amountInFormatted?: string | null; amountInUsd?: string | null;
        amountOut?: string | null; amountOutFormatted?: string | null; amountOutUsd?: string | null;
        slippage?: number | null;
        refundedAmount?: string | null; refundedAmountFormatted?: string | null; refundedAmountUsd?: string | null;
        refundReason?: string | null;
        depositedAmount?: string | null; depositedAmountFormatted?: string | null; depositedAmountUsd?: string | null;
        referral?: string | null;
      };
    }
  | { status: SwapStatus }; // confidential swaps (confidentiality basic/advanced): details withheld
```

## GET /api/transactions/{apiKey}
Query (all optional):
- `walletAddress`
- Cursor pagination: `numberOfTransactions` (default 10, 1..1000), `lastDepositAddress`, `lastDepositMemo` (from the last item of the previous page), `direction` (`next` = older, default; `prev` = newer).
- Legacy pagination: `page` (default 1), `perPage` (default 50, max 1000). Supplying either switches the response shape.

Response: `Transaction[]` (cursor mode) or `{ data: Transaction[]; totalPages; page; perPage; total; nextPage: number | null; prevPage: number | null }` (page mode).
```ts
type Transaction = {
  originAsset: string; destinationAsset: string;
  depositAddress: string; depositMemo: string | null; depositAddressAndMemo: string;
  recipient: string; refundTo: string; senders: string[];
  status: 'FAILED' | 'INCOMPLETE_DEPOSIT' | 'PENDING_DEPOSIT' | 'PROCESSING' | 'REFUNDED' | 'SUCCESS';
  createdAt: string; createdAtTimestamp: number;
  intentHashes: string; referral: string;
  amountIn: string; amountInFormatted: string; amountInUsd: string;
  amountOut: string; amountOutFormatted: string; amountOutUsd: string;
  appFees: { fee: number; recipient: string }[];
  nearTxHashes: string[]; originChainTxHashes: string[]; destinationChainTxHashes: string[];
  refundReason: string | null; refundFee: string | null; refundFeeFormatted: string | null;
  recipientType: 'DESTINATION_CHAIN' | 'INTENTS' | 'CONFIDENTIAL_INTENTS';
  depositType: 'ORIGIN_CHAIN' | 'INTENTS' | 'CONFIDENTIAL_INTENTS';
  refundType: 'ORIGIN_CHAIN' | 'INTENTS' | 'CONFIDENTIAL_INTENTS';
};
```

## GET /api/incidents/{apiKey}
Active incidents scoped by chain and/or asset. Check before quoting to show a banner or disable a route.
```ts
type IncidentsResponse =
  | { status: 'operational' }
  | {
      status: 'incidents';
      incidents: { scopeType: string; scopeValue: string; direction?: string | null; publicDescription?: string | null }[];
    };
```
`scopeType` / `scopeValue` / `direction` value sets are not documented.

## End-to-end typed flow (server side, Next.js route handler / server action)
```ts
// lib/aurora-swap.ts  (server only; import 'server-only' if the app uses it)
const BASE = 'https://intents-api.aurora.dev';

function key(): string {
  const k = process.env.AURORA_INTENTS_API_KEY;
  if (!k) throw new Error('AURORA_INTENTS_API_KEY missing');
  return encodeURIComponent(k);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    // 429: back off and retry later; 404: API key not assigned
    throw new Error(`Aurora ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export type QuoteRequest = {
  dry: boolean;
  swapType: 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'FLEX_INPUT' | 'ANY_INPUT';
  depositType: 'ORIGIN_CHAIN' | 'INTENTS' | 'CONFIDENTIAL_INTENTS';
  amount: string;
  originAsset: string;
  destinationAsset: string;
  slippageTolerance: number;
  refundTo: string;
  refundType: 'ORIGIN_CHAIN' | 'INTENTS' | 'CONFIDENTIAL_INTENTS';
  recipient: string;
  recipientType: 'DESTINATION_CHAIN' | 'INTENTS' | 'CONFIDENTIAL_INTENTS';
  deadline?: string;
  depositMode?: 'SIMPLE' | 'MEMO';
  confidentiality?: 'public' | 'basic' | 'advanced';
  quoteWaitingTimeMs?: number;
  sessionId?: string;
  connectedWallets?: string[];
};

export const getTokens = () => call<TokensResponse>(`/api/tokens/${key()}`);

export const getQuote = (body: QuoteRequest) =>
  call<QuoteResponse>(`/api/quote/${key()}`, { method: 'POST', body: JSON.stringify(body) });

export const submitDeposit = (body: DepositSubmitBody) =>
  call<StatusResponse>(`/api/deposit/submit/${key()}`, { method: 'POST', body: JSON.stringify(body) });

export const getStatus = (depositAddress: string, depositMemo?: string) => {
  const q = new URLSearchParams({ depositAddress });
  if (depositMemo) q.set('depositMemo', depositMemo);
  return call<StatusResponse>(`/api/status/${key()}?${q}`);
};

export const getIncidents = () => call<IncidentsResponse>(`/api/incidents/${key()}`);

const TERMINAL: ReadonlySet<SwapStatus> = new Set(['SUCCESS', 'REFUNDED', 'FAILED']);
export const isTerminal = (s: SwapStatus) => TERMINAL.has(s);
```

Example: USDC on Monad -> USDC on Base, sent from a Privy embedded wallet.
```ts
const { tokens } = await getTokens();
const find = (chain: string, symbol: string) => {
  const t = tokens.find((x) => x.blockchain === chain && x.symbol === symbol);
  if (!t) throw new Error(`${symbol} on ${chain} not supported`);
  return t;
};
const from = find('monad', 'USDC');
const to = find('base', 'USDC');

const base = {
  swapType: 'EXACT_INPUT',
  depositType: 'ORIGIN_CHAIN',
  amount: (10n * 10n ** BigInt(from.decimals)).toString(), // 10 USDC
  originAsset: from.assetId,
  destinationAsset: to.assetId,
  slippageTolerance: 100,
  refundTo: userAddress,        // user's Privy EVM address on Monad
  refundType: 'ORIGIN_CHAIN',
  recipient: userAddress,       // same EVM address on Base
  recipientType: 'DESTINATION_CHAIN',
} as const satisfies Omit<QuoteRequest, 'dry'>;

const preview = await getQuote({ ...base, dry: true });       // show amountOutFormatted
const real = await getQuote({
  ...base,
  dry: false,
  deadline: new Date(Date.now() + 10 * 60_000).toISOString(),
});
const { depositAddress, amountIn } = real.quote;
if (!depositAddress) throw new Error('no deposit address');

// Client: ERC-20 transfer(depositAddress, amountIn) of from.contractAddress on Monad
// using Privy (see privy-transactions skill), get txHash, then:
await submitDeposit({ txHash, depositAddress });

// Poll (e.g. every 5s from the client via your own route) until terminal.
const s = await getStatus(depositAddress);
if (isTerminal(s.status)) { /* done */ }
```
Polling interval is not specified in docs; keep it modest because status is rate limited (429).
