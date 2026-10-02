# Confidential Swaps and Confidential Swaps API

Sources:
- https://docs.intents.aurora.dev/intents-swap/confidential-swaps.md
- https://docs.intents.aurora.dev/api-reference/confidential-swaps-api-reference.md
- https://docs.intents.aurora.dev/confidential-intents.md (scope of confidentiality)

## Confidential swap (no new API)
- Route swaps through a private shard of NEAR. Origin wallet and routing trail are hidden; destination tx settles publicly. Confidentiality covers only the origin of assets.
- Same API key as normal swaps. Call `POST /api/quote/{apiKey}` exactly as usual plus `confidentiality: 'advanced'` (enum: `public` default, `basic`, `advanced`; difference between basic and advanced not documented on these pages, see the Confidential Intents page).
- `quote.depositAddress` is the confidential deposit address. Send funds, then poll `GET /api/status/{apiKey}?depositAddress=...` until `SUCCESS` / `FAILED` / `REFUNDED`. Status for confidential quotes is only `{ status }`.
- Widget: `confidentialMode: 'public' | 'confidential' | 'user-choice'`.
- `depositType` / `refundType` / `recipientType` `CONFIDENTIAL_INTENTS`: account IDs inside Confidential Intents; 1Click settles via signed transfer intents, not direct token transfers.

Doc example body (`dry: false`, `confidentiality: 'advanced'`, `swapType: 'EXACT_INPUT'`, `amount: '1000000'`, `depositType: 'ORIGIN_CHAIN'`, `recipientType: 'DESTINATION_CHAIN'`, `refundType: 'ORIGIN_CHAIN'`, `slippageTolerance: 100`, `deadline` 10 min ahead).

## Confidential Swaps API (reading a Confidential Intents account)
Base URL `https://intents-api.aurora.dev`, API key in path. Session JWT in `Authorization: Bearer <accessToken>` for `/api/account/*`.

### POST /api/auth/authenticate/{apiKey}
Verifies a wallet signature and issues session tokens.
```ts
type SignedData =
  | {
      standard: 'nep413';
      public_key: string;   // 'ed25519:' + base58
      signature: string;    // 'ed25519:' + base58
      payload: {
        recipient: string;
        nonce: string;      // base64
        message: string;    // stringified JSON with deadline, signer_id, intents
        callbackUrl?: string | null;
      };
    }
  | {
      standard: 'erc191';
      signature: string;    // 'secp256k1:' + base58; signer recovered via ecrecover
      payload: string;      // stringified JSON with signer_id, verifying_contract, nonce, deadline, intents
    };

type AuthBody = { signedData: SignedData };
type AuthResponse = { accessToken: string; refreshToken: string; expiresIn: number; refreshExpiresIn: number }; // seconds
```
Errors: 400 invalid signed data structure/encoding, 401 signature verification failed, 500 auth service unreachable.

What exactly goes into the `erc191` payload for *authentication* (which `intents`, `verifying_contract`, nonce rules) is **not documented** on these pages. Verify in docs: https://docs.intents.aurora.dev/api-reference/confidential-swaps-api-reference/authenticate-user-with-signed-data.md (or ask Aurora).

Signature encoding for `erc191` (documented for Intents Connect, https://docs.intents.aurora.dev/intents-connect/developer-guides/submit-signing.md; assumed identical here since the field description matches):
- `personal_sign` the payload string **verbatim** (do not re-stringify, do not pre-hash).
- Result is 65 bytes `r||s||v`; normalize `v` 27/28 -> 0/1; encode `'secp256k1:' + bs58(bytes)`.
```ts
import bs58 from 'bs58';
import { hexToBytes, type Hex } from 'viem';

export function toSecp256k1Sig(sigHex: Hex): string {
  const bytes = hexToBytes(sigHex);
  if (bytes.length !== 65) throw new Error('expected 65-byte signature');
  const v = bytes[64] ?? 0;
  if (v >= 27) bytes[64] = v - 27;
  return `secp256k1:${bs58.encode(bytes)}`;
}
// With a Privy embedded EVM wallet: const { signature } = await signMessage({ message: payload }) (privy-transactions skill).
```

### POST /api/auth/refresh/{apiKey}
```ts
type RefreshBody = { refreshToken: string };
type RefreshResponse = { accessToken: string; expiresIn: number };
```

### GET /api/account/balances/{apiKey}
Bearer token required. Query `tokenIds` (comma-separated; empty = all non-zero balances).
```ts
type BalancesResponse = { balances: { tokenId: string; available: string; source: 'private' }[] }; // available in smallest unit
```

### GET /api/account/history/{apiKey}
Bearer token required. Initial request: no cursor. Then pass `prevCursor` (older) or `nextCursor` (newer), never both.

Query:
| Param | Req | Notes |
| --- | --- | --- |
| `status` | yes | array of `PENDING_DEPOSIT`, `INCOMPLETE_DEPOSIT`, `PROCESSING`, `SUCCESS`, `REFUNDED`, `FAILED` |
| `depositType` | yes | array of `ORIGIN_CHAIN`, `INTENTS`, `CONFIDENTIAL_INTENTS` |
| `recipientType` | yes | array of `DESTINATION_CHAIN`, `INTENTS`, `CONFIDENTIAL_INTENTS` |
| `refundType` | yes | array of `ORIGIN_CHAIN`, `INTENTS`, `CONFIDENTIAL_INTENTS` |
| `limit` | no | 1..100 |
| `depositAddress`, `depositMemo` | no | memo only applies with address |
| `search` | no | deposit address, recipient, sender, or tx hash |
| `prevCursor` / `nextCursor` | no | from previous response |

Array serialization (repeated keys vs comma) is not documented; repeated keys shown below is an assumption, verify.
```ts
type HistoryItem = {
  status: 'PENDING_DEPOSIT' | 'INCOMPLETE_DEPOSIT' | 'PROCESSING' | 'SUCCESS' | 'REFUNDED' | 'FAILED';
  depositType: 'ORIGIN_CHAIN' | 'INTENTS' | 'CONFIDENTIAL_INTENTS';
  recipientType: 'DESTINATION_CHAIN' | 'INTENTS' | 'CONFIDENTIAL_INTENTS';
  refundType: 'ORIGIN_CHAIN' | 'INTENTS' | 'CONFIDENTIAL_INTENTS';
  createdAt: string;
  depositAddress: string;
  depositMemo?: string | null;
  originAsset?: string; destinationAsset?: string;
  amountInFormatted?: string; amountInUsd?: string;
  amountOutFormatted?: string; amountOutUsd?: string;
  recipient?: string; refundTo?: string;
  quoteTransactions?: { sender?: string; txHash?: string }[];
  refundReason?: string | null;
  refundedAmountFormatted?: string; refundedAmountUsd?: string;
  refundFee?: string | null; refundFeeFormatted?: string;
};
type HistoryResponse = { items: HistoryItem[]; nextCursor?: string; prevCursor?: string };

export async function getConfidentialHistory(apiKey: string, accessToken: string, cursor?: { prevCursor?: string; nextCursor?: string }) {
  const q = new URLSearchParams();
  for (const s of ['PROCESSING', 'SUCCESS', 'REFUNDED', 'FAILED']) q.append('status', s);
  for (const t of ['ORIGIN_CHAIN', 'INTENTS', 'CONFIDENTIAL_INTENTS']) { q.append('depositType', t); q.append('refundType', t); }
  for (const t of ['DESTINATION_CHAIN', 'INTENTS', 'CONFIDENTIAL_INTENTS']) q.append('recipientType', t);
  if (cursor?.prevCursor) q.set('prevCursor', cursor.prevCursor);
  else if (cursor?.nextCursor) q.set('nextCursor', cursor.nextCursor);
  const res = await fetch(`https://intents-api.aurora.dev/api/account/history/${encodeURIComponent(apiKey)}?${q}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Aurora ${res.status}: ${await res.text()}`);
  return (await res.json()) as HistoryResponse;
}
```
