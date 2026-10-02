# Intents Connect developer guides (condensed)

## End-to-end REST flow (bridge-in, e.g. Solana wallet into Aave on Base)
1. `GET /api/v1/supported_tokens` to get `assetId`s.
2. `GET /api/v1/executions/{wallet}/intermediary` to get `result.evm` (needed for `onBehalfOf` etc.).
3. `POST /api/v1/executions/{wallet}` (x-api-key) with `quote` + `steps`, `dry:false`. Response: `id`, `details.payload`, `quote.depositAddress`, `steps` (+ appended fee transfer).
4. Sign `details.payload` with the origin wallet using `details.signingStandard`, `POST .../submit` -> `SIGNED_PENDING_DEPOSIT`.
5. Transfer to `quote.depositAddress`: `quote.amount` (EXACT_INPUT) or `result.quote.amountIn` (EXACT_OUTPUT). Stellar: attach `quote.depositMemo`.
6. `POST /api/v1/executions/deposit/submit { txHash, depositAddress, memo? }`.
7. Poll `GET /api/v1/executions/{wallet}?id={id}` -> `result[0].status` until `SUCCESS` / failure.

## EVM steps: Aave supply (bridge-in)
Addresses (Base): Pool `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`, USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, aBasUSDC `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB`. Other pools: `eth` `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`, `arb` `0x794a61358D6845594F94dc1DB02A252b5b4814aD`. Fee collector: per deployment, read it from the appended fee step.

Steps: `approve(Pool, X)` on USDC, then `supply(USDC, X, intermediary, 0)` on Pool (aTokens minted to intermediary).

**Single round (default):** X = `{MIN_AMOUNT_OUT}`; one `dry:false` create; service carves the fee.

**Three rounds (exact amount shown before signing):**
| Round | dry | steps | Learn |
| --- | --- | --- | --- |
| 1 | true | `[]` | gross `quote.minAmountOut` (no fee estimated) |
| 2 | true | built at round-1 amount | `details.networkFee`, post-fee `quote.minAmountOut` (already net, do not subtract again) |
| 3 | false | rebuilt at round-2 `minAmountOut` | `id`, `depositAddress`, `payload` |

Invariant: `supplied + fee = bridge guaranteed delivery`. If round 2 has no `networkFee`, estimation failed: retry. Before signing, `result.quote.minAmountOut` must equal the baked amount (lower = quote moved, delete and redo). Excess delivery stays in the intermediary.

EXACT_INPUT: `quote.amount` in origin token, deposit it verbatim. EXACT_OUTPUT: `quote.amount` is the destination amount to supply; service grosses up the quote by the fee; deposit round-3 `result.quote.amountIn`.

## EVM steps: Aave withdraw (out-operation)
`outOperation: true`, `type: 'evm'` (checked against `originAsset`'s chain). No user deposit; starts at `OPERATION_PENDING`; submit returns `SIGNING`; statuses `OPERATION_PENDING -> OPERATION_PROCESSING -> SUCCESS` (SUCCESS includes bridge settlement; API does not expose the sponsored batch tx hash).

Chain roles flip: `quote.originAsset` = token the steps produce (USDC on Base, the underlying, not the aToken); `quote.destinationAsset` = where proceeds go (e.g. `nep141:sol.omft.near`); fee is in the origin token. Read position size from `aToken.balanceOf(intermediary)` right before building.

Steps:
```jsonc
[
  { "to": "<Pool>", "functionSignature": "withdraw(address,uint256,address)", "parameters": ["<USDC>", "197373", "<intermediary>"], "value": "0" },
  { "to": "<USDC>", "functionSignature": "transfer(address,uint256)", "parameters": ["{DEPOSIT_ADDRESS}", "197373"], "value": "0" }
]
```
Round 1 `dry:true` gives `details.networkFee` and `quote.amountIn = amount - fee`. Round 2 `dry:false`: same body, only the producer transfer amount changes to round-1 `quote.amountIn`. The service also recomputes and overwrites the producer amount itself, so sending the full amount in both (single round) works too; read the returned `steps` (the exact signed batch). Invariant: `producer + fee = withdrawn`.

Do not: echo response `steps` (double fee), hard-code the deposit address (fresh per quote), replace `{AMOUNT_IN}` with a seen number, subtract the fee from `quote.amount`. Exactly one producer transfer is honoured (first match). EXACT_OUTPUT: put `{AMOUNT_IN}` in both withdraw and producer; service substitutes `amountIn + fee` then rewrites producer to `amountIn`; unused slippage refunds to the intermediary. Proceeds default to the user's own wallet on the destination; override with `quote.recipient` (out-op only). Refunds go to the intermediary.

## Asynchronous operations (two executions)
1. Trigger: `POST /executions/{wallet}/steps` (no key) with `destinationAsset` = eventual payout token and steps that enqueue the request (e.g. `approve` + `requestRedeem`). Append a zero-value `transfer(intermediary, 0)` on the payout token if no step touches it. The intermediary must already hold enough payout token to pay the fee.
2. After settlement, payout sits in the intermediary: `POST /executions/{wallet}` (key) with `outOperation: true`, `quote.originAsset` = settled token, `destinationAsset` = target.

## Destination token requirement (steps-only)
At least one step `to` must equal the ERC-20 `destinationAsset` contract (native exempt), because the appended fee transfer spends it. Workaround:
```json
{ "to": "<destination token>", "value": "0", "functionSignature": "transfer(address,uint256)", "parameters": ["<intermediaryAddress>", "0"] }
```
The guard passing does not fund the fee: the intermediary needs a real balance.

## Submit signing (POST /executions/{wallet}/submit)
Sign `result.details.payload` with the origin wallet. `publicKey` required for ed25519 standards, omitted for secp256k1.

| Standard | Sign | Op | Body | Encoding |
| --- | --- | --- | --- | --- |
| `erc191` (EVM) | `payload_json` string verbatim | `personal_sign` params `[message, address]` | `signature, executionId` | `secp256k1:` + bs58(r,s,v with v normalized 27/28 -> 0/1) |
| `nep413` (NEAR) | parse `payload_json` -> `{message, recipient, nonce}`; nonce base64 -> 32 bytes | wallet `signMessage` | `signature, publicKey, executionId` | `ed25519:` + bs58(64 bytes); wallets return base64, re-encode; add `ed25519:` to key if missing |
| `raw_ed25519` (Solana) | bytes from `payload_bytes_base64` (not the string) | `signMessage(Uint8Array)` | `signature, publicKey, executionId` | `ed25519:` + bs58; key `ed25519:` + `publicKey.toBase58()` |
| `sep53` (Stellar) | `payload_json` verbatim | Freighter `signMessage` | `signature, publicKey, executionId` | 64-byte sig bs58; key = bs58(`StrKey.decodeEd25519PublicKey(G...)`) |
| `ton_connect` | `payload_json` as text | `signData({ type: 'text', text })` | + `tonConnect { domain, timestamp, address }` | `ed25519:` + bs58; key from connect-time `account.publicKey` (hex) |
| `tip191` (Tron) | `payload_json` verbatim | `tronWeb.trx.signMessageV2` | `signature, executionId` | same as erc191 |

Never re-stringify `payload_json`, never pre-hash, never add envelopes (the wallet frames it).

Privy EVM embedded wallet: `useSignMessage().signMessage({ message: payload_json })` performs EIP-191 personal_sign and returns a 0x hex signature; normalize v and bs58-encode as above (helper in SKILL.md). Server wallet: `privy.wallets().ethereum().signMessage(walletId, { message })`.

## Delete execution
Message: ASCII `delete_execution:<executionId>` (build it client-side; no JSON, no hash, no envelope). `DELETE /api/v1/executions/{wallet}/{executionId}` with JSON body:

| Chain | Body |
| --- | --- |
| EVM `erc191` / Tron `tip191` | `{ signature }` (`secp256k1:` + bs58, v normalized) |
| Solana | `{ signature, publicKey }` (sign `TextEncoder` bytes) |
| NEAR | `{ signature, publicKey, nep413: { recipient: 'intents.near', nonce: <base64 of the 32 random bytes signed> } }` (missing nep413 -> 400) |
| TON | `{ signature, publicKey, tonConnect }` |

EVM with Privy:
```ts
const { signature } = await signMessage({ message: `delete_execution:${executionId}` });
await fetch(`${baseUrl}/api/v1/executions/${wallet}/${encodeURIComponent(executionId)}`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ signature: toSecp256k1Signature(signature) }),
});
```
Use it to release the in-flight lock (409) before retrying with different numbers. `SUCCESS` cannot be deleted.

## Solana as destination (brief)
- `type: 'solana'`; steps are instructions `{ programId, accounts[], args[], discriminator?, metadata? }`.
- Intermediary: `result.solana` from the intermediary endpoint (ed25519, deterministic, cannot be computed locally). Use `{INTERMEDIARY}` placeholder in steps; fetch the real address only to derive ATAs (no ATA placeholder).
- Service auto-creates a missing intermediary ATA when a step lists the mint and the writable ATA (`TransferChecked`, `MintTo`, `Burn`, most deposit/withdraw). Bare SPL `Transfer` (opcode 03) does not: use `TransferChecked` or add `CreateIdempotent`. Third-party recipient ATAs: create yourself with `{INTERMEDIARY}` as funder.
- Modes: steps-only (`/steps`, no quote), bridge-in (`/executions` + quote + key), out-operation. Relayer adds payer, durable nonce, compute budget; SPL path is gasless (fee in the token). 503 = no durable nonce free.
- Worked scenarios (transfer USDC, native SOL, Kamino stake/withdraw): https://docs.intents.aurora.dev/intents-connect/developer-guides/solana

## Sui as destination (brief)
- Destination only (Sui as source "coming soon"); can be the chain an out-operation starts on, never sui-to-sui. `type: 'sui'` must match the action chain (400 otherwise).
- Intermediary: `result.sui` (`0x` + 64 hex). Steps are programmable-transaction-block commands; use `{INTERMEDIARY}` and `{ACTION_COIN}` (the one coin the action spends, resolved by merging coin objects up to a deployment cap, default 64, and/or withdrawing a credited balance).
- End step arrays with `transferObjects` of `{ACTION_COIN}` to `{INTERMEDIARY}` to avoid an unconsumed coin abort. One live Sui execution per wallet total (stricter than EVM).
- Details: https://docs.intents.aurora.dev/intents-connect/developer-guides/sui/sui-as-destination (+ staking/unstaking SUI and USDC guides).

Sources: developer-guides/evm/evm-steps-aave-supply, evm-steps-aave-withdraw, asynchronous-operations, steps-destination-token-requirement, submit-signing, delete-execution, solana/using-solana-as-destination, solana/getting-your-solana-intermediary-address, sui/sui-as-destination, examples/deposit-into-aave-from-solana, examples/withdraw-from-aave-to-solana (all under https://docs.intents.aurora.dev/intents-connect/).
