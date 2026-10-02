# Intents Connect REST API reference

Server (OpenAPI): `https://intents-connect-api.aurora.dev`. SDK beta docs use `https://intents-connect-alpha-api.aurora.dev`.
Auth: `x-api-key` (from https://studio.aurora.dev) on `POST /api/v1/executions/{wallet}` only (required, 401 `missing or invalid api token`). Errors are `{ "error": string }`. No field in the OpenAPI is marked required; treat everything as optional when typing responses.

`{wallet}` = origin wallet: EVM `0x...`, NEAR named/implicit, Solana base58, Stellar `G...`, TON user-friendly (needs `publicKey`), Tron `T...`.

## Types (from the OpenAPI schemas)

```ts
type ExecutionStatus =
  | 'CREATED' | 'DEPOSIT_PENDING' | 'DEPOSIT_PROCESSING' | 'OPERATION_PENDING'
  | 'OPERATION_PROCESSING' | 'SUCCESS' | 'DEPOSIT_FAILED' | 'OPERATION_FAILED' | 'EXPIRED';
type SigningStandard = 'raw_ed25519' | 'nep413' | 'erc191' | 'tip191' | 'sep53' | 'ton_connect';
type StepParam = string | StepParam[];

interface EvmStep { to: string; functionSignature: string; parameters: StepParam[]; value: string; metadata?: Record<string, unknown> }
interface SolanaStep {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[]; // pubkey may be '{INTERMEDIARY}' / '{DEPOSIT_ADDRESS}'
  args: { name: string; type: 'u8'|'u16'|'u32'|'u64'|'u128'|'i8'|'i16'|'i32'|'i64'|'bool'|'pubkey'|'bytes'|'string'; value: unknown }[];
  discriminator?: string; // hex: 8-byte Anchor discriminator or 1-byte opcode
  metadata?: Record<string, unknown>;
}

interface CreateExecutionBody {
  version?: string;            // examples use "1.0"
  type?: 'evm' | 'solana';     // default evm (Sui guide also uses 'sui')
  dry?: boolean;
  outOperation?: boolean;
  quote: {
    originAsset: string; destinationAsset: string; amount: string;
    swapType?: 'EXACT_INPUT' | 'EXACT_OUTPUT';
    slippageTolerance?: number; // bps
    deadline?: string;          // ISO
    recipient?: string;         // out-operation only
  };
  steps: EvmStep[] | SolanaStep[];
  addressLookupTables?: string[]; // Solana only
  metadata?: Record<string, unknown>; // e.g. { title, intent }
  publicKey?: string;           // TON only: ed25519:<base58>
}

interface CreateStepsExecutionBody {
  version?: string; type?: 'evm' | 'solana'; dry?: boolean;
  destinationAsset: string;     // required by guides
  steps: EvmStep[] | SolanaStep[];
  addressLookupTables?: string[]; metadata?: Record<string, unknown>; publicKey?: string;
}

interface Execution {
  id: string; createdAt: string; status: ExecutionStatus; type: 'evm' | 'solana'; version: string;
  executionMode: 'quote_with_steps' | 'steps_only';
  metadata: Record<string, unknown>;
  details: {
    estimatedTime?: string; intermediaryAddress?: string; networkFee?: string;
    messageSigned?: boolean; messageToSign?: string; signingStandard?: SigningStandard;
    payload?: { payload_json: string; payload_bytes_base64: string; standard: SigningStandard };
  };
  quote: {
    amount?: string; amountIn?: string; amountInUsd?: string; amountOut?: string; amountOutUsd?: string;
    minAmountIn?: string; minAmountOut?: string; deadline?: string;
    depositAddress?: string; depositMemo?: string | null;
    originAsset?: string; destinationAsset?: string; recipient?: string;
    swapType?: 'EXACT_INPUT' | 'EXACT_OUTPUT';
  };
  steps: EvmStep[] | SolanaStep[]; // includes appended { metadata: { name: 'Fee Transfer' } } step
}
```
(Example responses also show `details.serviceFee`; not in the schema.)

## Endpoints

### GET /api/v1/supported_tokens
Query `flow?: 'inOperation' | 'outOperation'` ("use outOperation to swap supported input/output token lists for EVM-origin out-operation flows"). Response `{ result: { in: Token[], out: Token[] } }`, `Token = { assetId, blockchain, coingeckoId, contractAddress, decimals, price, priceUpdatedAt, symbol }`. 400, 502. No key. Asset id examples: SOL `nep141:sol.omft.near`, USDC Base `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near`, native ETH Base `nep141:base.omft.near`.

### GET /api/v1/executions/{wallet}/intermediary
Query `publicKey` (ed25519:<base58>, required for TON). Response `{ result: { originAccount, originType: 'evm'|'near'|'solana'|'stellar'|'ton'|'tron', evm, solana, sui } }`. `solana`/`sui` are `null` when disabled or derivation failed (still 200). Deterministic per origin wallet. 400, 502.

### POST /api/v1/executions/{wallet}  (x-api-key)
Create or dry-run a quote-backed execution. 200 = dry result, 201 = created with signing payload. Errors: 400 (bad body, step shape, limits), 401, 409 (execution in progress), 413 (> 256 KB), 500, 502, 503 (no Solana durable nonce, retry).
Validation: step objects accept only documented fields (other-shape key, different casing, duplicate key, unknown field = 400); nesting max 15 containers (metadata exempt); `functionSignature` max 6 nested tuple/array levels and 1024 bytes; max 30 EVM / 50 Solana steps. Bridge-in steps run on destination after 1Click deposit; out-op steps run on origin and transfer to the 1Click deposit address. Stellar origins: response has `quote.depositMemo`, deposit must carry it.

### POST /api/v1/executions/{wallet}/steps
Steps-only: no 1Click quote, intermediary must already hold the destination token. Non-dry returns signing payload in `result.details`. 200 dry, 201 created; 400, 409 ("already in progress"), 413, 500, 502, 503. Guides: no `x-api-key` needed; at least one step must call the destination token (error `steps must include at least one call to destination token 0x...`).

### POST /api/v1/executions/{wallet}/submit
Body `{ executionId, signature, publicKey?, tonConnect?: { address, domain, timestamp } }`. Verifies and stores the signed payload. Response `{ result: { status } }`: `SIGNED_PENDING_DEPOSIT` (bridge-in, waits for deposit) or `SIGNING` (already `OPERATION_PENDING`, e.g. out-op). 400, 404, 409, 500. No key. Encoding per chain: see dev-guides.md.

### POST /api/v1/executions/deposit/submit
Body `{ txHash, depositAddress, memo? }`. Records the origin deposit tx and notifies 1Click. `memo` required for MEMO-mode chains (Stellar): omitting it returns 404. Response `{ result: { status } }`. 400, 404, 409, 500.

### GET /api/v1/executions/{wallet}
Query `id` (UUID or comma-separated), `status` (one or comma-separated). Response `{ result: Execution[] }`; read `result[0]` even with one id. 400, 500. Status is polled; state is authoritative; transitions are eventual.

### DELETE /api/v1/executions/{wallet}/{executionId}
JSON body `{ signature, publicKey?, nep413?: { nonce, recipient }, tonConnect? }` signed over the literal `delete_execution:<executionId>`. Deletable: `CREATED`, `DEPOSIT_PENDING`, `OPERATION_PENDING`, `EXPIRED`, `DEPOSIT_FAILED`, `OPERATION_FAILED` (not `SUCCESS`). 200 `{ result: { status: 'DELETED' } }`, 400 bad signature/field, 404 not found, 409 non-deletable status. With `fetch`, send the body normally; with axios use the `data` option.

## Common error strings
| Error | Cause |
| --- | --- |
| `400 steps are required for non-dry executions` | `dry:false` with empty steps |
| `400 estimated gas fee exceeds minimum output amount` / `expected output amount` | bridged amount too small for the batch |
| `400 estimated gas fee exceeds input amount` | out-op EXACT_INPUT withdraw too small |
| `400 invalid steps JSON: ...` (`step <i>:` prefix) | bad param, out-of-range int, tuple arity, bad key |
| `400 outOperation requires a transfer(tokenAddress, {DEPOSIT_ADDRESS}, amount) step` | missing/stale producer transfer |
| `400 {AMOUNT_IN} placeholder requires outOperation=true and quote.swapType=EXACT_OUTPUT` | wrong placeholder |
| `400 {MIN_AMOUNT_OUT} placeholder is not supported with outOperation=true` | wrong placeholder |
| `400 quote.recipient is only valid when outOperation=true` | recipient on bridge-in |
| `400 blockchain <chain> is not supported as a destination` | unsupported destination |
| `409 an execution for this wallet is already in progress...` | live `dry:false` execution; wait or DELETE |
| `401 missing or invalid api token` | `x-api-key` |

Sources: https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference and its 8 sub-pages; error strings from the EVM Aave guides.
