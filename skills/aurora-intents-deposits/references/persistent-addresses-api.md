# Persistent Addresses API (full shapes)

Base URL `https://intents-api.aurora.dev`. Auth: API key from https://studio.aurora.dev in the path (`{apiKey}`). OpenAPI `security: []` (no header). Source: OpenAPI blocks on the pages listed at the bottom.

Chain short codes (`depositChain` / `destinationChain`): `eth, bera, base, gnosis, arb, bsc, avax, op, pol, monad, adi, plasma, scroll, xlayer, sui, aptos, xrp, btc, doge, tron, ton, near, sol, zec, ltc, cardano, stellar, aleo, bch, dash, starknet, coca`. `depositChain` also accepts `evm` (resolves to `base`; all EVM chains share one address).

## POST /api/persistent-deposit-address/{apiKey}

Body:

| Field | Type | Req | Notes |
|---|---|---|---|
| `recipient` | string | yes | Target address on destination chain. |
| `sender` | string | yes | Your user id (e.g. Privy DID). Attribution key. |
| `depositChain` | enum | yes | Chain the user deposits FROM. `stellar` returns a `memo`. |
| `destinationChain` | enum (no `evm`) | yes | Chain the user receives on. |
| `destinationAsset` | string | yes | Symbol (`"USDC"`) or asset id (`nep141:...`, `nep245:...`). Ambiguous symbol -> 400 listing ids. |
| `confidential` | boolean | no (false) | Confidential Intents rail. Part of address identity. |

Identity: same (API key, sender, recipient, depositChain, destinationChain/destinationAsset, confidential) -> same address. One underlying Intents account per (API key, sender, recipient, destinationAsset, confidential), shared across deposit chains.

200:
```ts
type CreatePdaResponse = {
  depositAddress: string;
  alreadyExists: boolean; // true = cache hit on a previously user-requested address
  memo?: string;          // Stellar only; deposits MUST include it
  correlationId?: string; // only when 1Click was quoted on this call
};
```

Errors (body `{ message: string; statusCode: number; error?: string; data?: object }`; 400 may instead be `{ message, correlationId, timestamp, path }`):
- 400: upstream quote error, invalid fee config, ambiguous symbol.
- 403: API key org not approved by Aurora for creation ("Addresses already issued are still returned").
- 404: app key not assigned, or no token matches `destinationAsset` on `destinationChain`.
- 429: rate limit, or concurrent request creating the same address. Retry.
- 500: upstream failure.

Fees: baseline app fees computed like `/api/quote` from the key's fee config; only rules not constrained by origin asset apply. Actual per-swap fees come from `/api/persistent-deposit-fees`, called by 1Click per swap.

## GET /api/persistent-deposit-status/{apiKey}

Query: `type` (required: `received` | `success` | `failed`), `address` (required, a PDA from this API), `limit`, `offset` (pagination for `received`).
- `received`: deposits that reached the Intents account.
- `success`: completed outbound withdrawals to recipient.
- `failed`: failed outbound withdrawals to recipient.

200:
```ts
type PdaDeposit = {
  tx_hash: string;
  fromChain?: string | null;        // origin alias, e.g. "arb"
  destinationChain?: string | null; // set for success/failed
  asset_id: string | null;
  decimals: number | null;
  amount: string;                   // smallest unit
  from?: string;
  created_at: string;
  intents_account: string;
  deposit_address: string;
  recipient: string;
};
type PdaStatusResponse = { deposits: PdaDeposit[] };
```
Errors: 400, 404 (key not assigned or unknown address), 429, 500.

## GET /api/persistent-deposit-addresses/{apiKey} (list)

Query (all optional): `recipient`, `sender`, `depositChain` (non-EVM codes or `evm`; no per-EVM-chain codes), `recipientChain` (any code incl. `monad`), `destinationAsset` (SYMBOL; matches all ids for it), `sort` (`created` default | `used`), `page` (default 1), `perPage` (default 50, max 1000).

200:
```ts
type PdaRecord = {
  depositAddress: string;
  recipient: string;
  sender: string;
  depositChain: string | null;      // EVM reported as "evm"
  destinationSymbol: string | null; // null for legacy rows
  recipientChain: string | null;
  memo?: string;
  createdAt: string;   // ISO
  lastTimeUsed: string; // ISO, last time requested
};
type PdaListResponse = {
  data: PdaRecord[];
  page: number; perPage: number; total: number; totalPages: number;
  nextPage: number | null; prevPage: number | null;
};
```

## GET /api/persistent-deposit-address-data/{apiKey} (single)

Query: `address` (required). Returns one `PdaRecord`. 404 if the address was not created with this key.

Source pages:
- https://docs.intents.aurora.dev/api-reference/persistent-addresses-api-reference/create-persistent-deposit-address.md
- https://docs.intents.aurora.dev/api-reference/persistent-addresses-api-reference/get-persistent-deposit-status.md
- https://docs.intents.aurora.dev/api-reference/persistent-addresses-api-reference/get-persistent-address-data.md
