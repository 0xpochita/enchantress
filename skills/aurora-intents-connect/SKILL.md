---
name: aurora-intents-connect
description: Aurora Intents Connect for enchantress - cross-chain contract execution where a user signs once from their own wallet (EVM, Solana, NEAR, Stellar, TON, Tron) and an intermediary account they control runs arbitrary steps (approve, supply, swap, mint) on the destination chain, with funds bridged via NEAR Intents / 1Click and destination gas paid by the service. Covers the concepts (execution, intermediary account, deposit address, bridge-in / out-operation / steps-only, async two-execution flows, lifecycle statuses, fees), the TypeScript SDK @aurora-is-near/intents-connect (createIntentsConnectApi, createExecutionRunner, Recipe, SolanaRecipe, fee strategies placeholder / threeRound, preview/run/runSteps/resume/cancel, GuardError codes, React IntentsConnectProvider + useExecution), @aurora-is-near/intents-connect-wallet (AppKit, transfer plugins, prepareSolanaSteps), the REST API (supported_tokens, executions, steps, intermediary, submit, deposit/submit, delete, x-api-key), per-chain signing (erc191 personal_sign, raw_ed25519, nep413, sep53, ton_connect, tip191), Aave supply/withdraw worked examples, and signing with a Privy EVM embedded wallet. Load when the task mentions Intents Connect, intermediary account, cross-chain execution, execute on another chain, deposit into Aave from Solana, bridge-in, outOperation, steps-only, {MIN_AMOUNT_OUT}, {DEPOSIT_ADDRESS}, {AMOUNT_IN}, {INTERMEDIARY}, delete_execution, intents-connect-api.aurora.dev, useExecution, IntentsConnectProvider, Recipe/buildSteps, Hydrex/Polymarket/Jupiter demos, or Monad as source/destination of a cross-chain action.
---

# Aurora Intents Connect

## What it is
- A user with a wallet on chain A performs contract calls on chain B without bridging manually, switching wallets or holding B's gas token. The user signs one structured intent (chains, asset, amount, steps, max fee, deadline, nonce) from the origin wallet.
- An **intermediary account** on the destination chain, deterministically derived from the origin wallet and controlled by it via NEAR Chain Signatures (MPC), executes the steps. Aurora does not own it and cannot move funds outside a signed intent. Residual funds stay there under the user's control.
- Funds are moved by NEAR Intents / 1Click into the intermediary. The service simulates, pays destination gas, and appends a fee-transfer step charged in the destination token.
- Three integration paths: **Widget** (embeddable UI, early access only: contact the team, no API documented), **TypeScript SDK** (beta, recommended for a React app), **REST API** (backends, agents, custom UIs).

## When to use
- "Let users on any chain do X on chain Y" (deposit into a lending pool, mint an LP, fund an account, buy a token) in one signature.
- Withdraw a position on chain Y back to the user's chain (out-operation).
- Act on funds already sitting in the intermediary (steps-only: sell, withdraw, trigger async redeem).
- Plain swaps without contract calls belong to the Swap product, not Connect (see aurora-intents router skill).

## Key concepts
| Term | Meaning |
| --- | --- |
| Execution | One signed intent being processed. Has `id`, `status`, `quote`, `steps`, `details.payload` (to sign) |
| Bridge-in | `POST /executions/{wallet}` with `quote`: user deposits on origin, 1Click delivers to intermediary, steps run on destination |
| Out-operation | Same endpoint + `outOperation: true`: steps run on the chain where the intermediary holds funds, last step transfers to `{DEPOSIT_ADDRESS}`, 1Click bridges out to the user. No user deposit |
| Steps-only | `POST /executions/{wallet}/steps`: no quote, no bridge, intermediary already holds `destinationAsset` |
| Async operation | Request-style ops (queued withdraw, epoch unstake) = 2 executions: `/steps` to trigger, later an out-operation to move the settled payout |
| Steps | EVM: exactly `{ to, functionSignature, parameters, value, metadata? }` (any other key = 400). Max 30 EVM / 50 Solana steps, body max 256 KB |
| Placeholders | `{INTERMEDIARY}`, `{MIN_AMOUNT_OUT}` (bridge-in only), `{AMOUNT_IN}` (out-op + EXACT_OUTPUT only), `{DEPOSIT_ADDRESS}` (out-op producer transfer) |
| Signing standard | Origin wallet's: `erc191` (EVM), `raw_ed25519` (Solana), `nep413` (NEAR), `sep53` (Stellar), `ton_connect`, `tip191` (Tron). SDK does not support TON/Tron yet |

Statuses: `CREATED -> DEPOSIT_PENDING -> DEPOSIT_PROCESSING -> OPERATION_PENDING -> OPERATION_PROCESSING -> SUCCESS`. Failures `EXPIRED`, `DEPOSIT_FAILED`, `OPERATION_FAILED` are terminal on the server (deposit failures/expiry are refunded; `OPERATION_FAILED` leaves funds in the intermediary, recovery = new execution). Out-operations start at `OPERATION_PENDING`. The SDK treats `expired` as revivable (a late deposit revives it).

## Base URLs and auth
- REST reference server: `https://intents-connect-api.aurora.dev`. SDK docs (beta) use `https://intents-connect-alpha-api.aurora.dev`. Pick one per environment and keep it in env (`INTENTS_CONNECT_BASE_URL`).
- `x-api-key` (generate at https://studio.aurora.dev) is required on `POST /api/v1/executions/{wallet}` (every round, dry or not). Guides state `/steps`, `/submit`, `/deposit/submit`, GET and DELETE do not need it (the SDK still routes both create calls through the key/proxy). Keep the key server-side (`INTENTS_CONNECT_API_KEY`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/supported_tokens?flow=inOperation\|outOperation` | `{ result: { in: Token[], out: Token[] } }` with `assetId`, `blockchain`, `contractAddress`, `decimals`, `symbol`, `price` |
| GET | `/api/v1/executions/{wallet}/intermediary` | `{ result: { originAccount, originType, evm, solana, sui? } }` |
| POST | `/api/v1/executions/{wallet}` | Create or dry-run quote-backed execution (bridge-in / out-op). 200 dry, 201 created |
| POST | `/api/v1/executions/{wallet}/steps` | Create or dry-run steps-only execution |
| POST | `/api/v1/executions/{wallet}/submit` | `{ executionId, signature, publicKey?, tonConnect? }` |
| POST | `/api/v1/executions/deposit/submit` | `{ txHash, depositAddress, memo? }` after the origin transfer |
| GET | `/api/v1/executions/{wallet}?id=&status=` | `{ result: Execution[] }` (array even for one id) |
| DELETE | `/api/v1/executions/{wallet}/{executionId}` | JSON body with signature over `delete_execution:{executionId}` |

Full shapes: [references/rest-api.md](references/rest-api.md).

## Pattern A: SDK in the Next.js app (client)
```tsx
'use client';
import { createIntentsConnectApi, type Recipe } from '@aurora-is-near/intents-connect';
import { IntentsConnectProvider, useExecution } from '@aurora-is-near/intents-connect/react';
import { AppKitProvider, useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import type { ReactNode } from 'react';

const api = createIntentsConnectApi({
  baseUrl: process.env.NEXT_PUBLIC_INTENTS_CONNECT_BASE_URL ?? 'https://intents-connect-alpha-api.aurora.dev',
  apiKeyProxyUrl: '/api/intents-connect', // your route adds x-api-key; never pass apiKey in the browser
});

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
const AAVE_POOL = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5'; // Aave V3 Pool, Base

const aaveSupply: Recipe<{ pool: string }> = {
  id: 'aave-supply', intent: 'aave_supply', title: 'Supply to Aave',
  flow: 'bridge-in', type: 'evm',
  destination: { chain: 'base', assetId: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near', tokenAddress: USDC },
  // amount is '{MIN_AMOUNT_OUT}' under the default EVM fee strategy: template it, never do math on it
  buildSteps: ({ intermediary, amount }, { pool }) => [
    { to: USDC, functionSignature: 'approve(address,uint256)', parameters: [pool, amount], value: '0' },
    { to: pool, functionSignature: 'supply(address,uint256,address,uint16)', parameters: [USDC, amount, intermediary, '0'], value: '0' },
  ],
};

function SupplyButton(props: { originAsset: string; originChain: string; originTokenAddress: string; decimals: number; amountAtomic: string }) {
  const exec = useExecution({ onEvent: (e) => console.debug(e) });
  const run = () =>
    exec.run({
      recipe: aaveSupply,
      params: { pool: AAVE_POOL },
      quote: { originAsset: props.originAsset, destinationAsset: aaveSupply.destination.assetId, amount: props.amountAtomic, swapType: 'EXACT_INPUT', slippageTolerance: 100 },
      originChain: props.originChain,
      originToken: { contractAddress: props.originTokenAddress, decimals: props.decimals },
      depositViaWallet: true, // false = show exec.depositAddress as QR
    });
  return <button disabled={exec.isBusy} onClick={() => void run()}>{exec.phase === 'idle' ? 'Supply' : exec.phase}</button>;
}

function Inner({ children }: { children: ReactNode }) {
  const { wallet } = useIntentsConnectWallet(); // EVM or Solana WalletConnector, transfer wired in
  return <IntentsConnectProvider api={api} wallet={wallet}>{children}</IntentsConnectProvider>;
}

export function IntentsConnectRoot({ children }: { children: ReactNode }) {
  return <AppKitProvider appName="enchantress" themeMode="dark" projectId={process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? ''}><Inner>{children}</Inner></AppKitProvider>;
}
```
SDK details (runner methods, events, errors, recovery, fee strategies, wallet plugins, proxy caveat, Privy adapter sketch): [references/sdk.md](references/sdk.md).

## Pattern B: REST + Privy EVM embedded wallet (documented end to end)
Server creates the execution (holds `x-api-key`), client signs `details.payload.payload_json` with Privy `useSignMessage` (EIP-191 `personal_sign`), then submits.
```ts
// server action / route handler (server only)
export async function createExecution(wallet: `0x${string}`, body: CreateExecutionBody): Promise<Execution> {
  const res = await fetch(`${process.env.INTENTS_CONNECT_BASE_URL}/api/v1/executions/${wallet}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.INTENTS_CONNECT_API_KEY ?? '' },
    body: JSON.stringify(body),
  });
  const json: { result?: Execution; error?: string } = await res.json();
  if (!res.ok || !json.result) throw new Error(json.error ?? `create failed ${res.status}`);
  return json.result;
}
```
```ts
// client: erc191 signature encoding required by the backend
import bs58 from 'bs58';
import { hexToBytes, isHex } from 'viem';
import { useSignMessage } from '@privy-io/react-auth';

export function toSecp256k1Signature(sigHex: string): string {
  if (!isHex(sigHex)) throw new Error('expected 0x hex signature');
  const bytes = hexToBytes(sigHex); // no Buffer needed in the browser
  if (bytes.length !== 65) throw new Error('expected 65-byte signature');
  if (bytes[64] >= 27) bytes[64] -= 27; // normalize v to 0/1, touch nothing else
  return 'secp256k1:' + bs58.encode(bytes);
}

export function useSubmitIntent(baseUrl: string) {
  const { signMessage } = useSignMessage();
  return async (wallet: string, executionId: string, payloadJson: string) => {
    const { signature } = await signMessage({ message: payloadJson }); // sign verbatim, no re-stringify, no pre-hash
    const res = await fetch(`${baseUrl}/api/v1/executions/${wallet}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executionId, signature: toSecp256k1Signature(signature) }), // no publicKey for EVM
    });
    if (!res.ok) throw new Error(`submit failed ${res.status}`);
  };
}
```
Then transfer `quote.amount` (EXACT_INPUT) or `quote.amountIn` (EXACT_OUTPUT) to `quote.depositAddress` (Privy `useSendTransaction` works for an EVM origin), call `POST /executions/deposit/submit { txHash, depositAddress }`, poll `GET /executions/{wallet}?id=` and read `result[0].status`. Types `CreateExecutionBody`/`Execution` and the 3-round Aave flow: [references/rest-api.md](references/rest-api.md), [references/dev-guides.md](references/dev-guides.md). Server wallets can sign the same string with `privy.wallets().ethereum().signMessage(walletId, { message })` (see privy-transactions skill).

## Gotchas
- **Sign before deposit.** The service holds the pre-signed batch and fires it when the bridge settles. Never show a deposit address before `/submit` (SDK enforces it).
- **One live execution per wallet per chain** (`dry:false` takes a lock; 409 / `EXECUTION_IN_FLIGHT`). Sui: one per wallet at all. Free it with DELETE (signed) or wait for terminal. Dry runs take no lock.
- **Destination token rule:** at least one step must call `destination.tokenAddress` (fee is taken in it). Native destinations exempt. Workaround: append `transfer(intermediary, 0)` on the token. For steps-only the intermediary must already hold enough of it to pay the fee.
- **Do not add the fee step** and do not echo a response `steps` array back (it already contains `Fee Transfer`; it would charge twice).
- **`quote.recipient`** only on out-operations (400 on bridge-in). On bridge-in put the final recipient inside a step's parameters (Polymarket pattern) or mint to `userAddress` (Hydrex pattern); otherwise output stays in the intermediary.
- `{MIN_AMOUNT_OUT}` is rejected on out-ops; `{AMOUNT_IN}` only on out-op + EXACT_OUTPUT. Keep `{DEPOSIT_ADDRESS}` literal; exactly one producer transfer is honoured.
- `dry:false` needs non-empty `steps`. If a dry response lacks `details.networkFee`, gas estimation failed: retry, do not reuse its amount.
- Before signing, check `result.quote.minAmountOut` equals the amount baked into steps (3-round flow). SDK throws `QUOTE_MOVED`.
- Stellar origins: `quote.depositMemo` is mandatory on the transfer and on `/deposit/submit` or funds are lost.
- 503 on create = no Solana durable-nonce account free: retry shortly. SDK polling budget about 12 min then `ExecutionPollTimeoutError` (use `resume`). Steps-only preview TTL 30 s.
- Demos set slippage minimums to 0; set real minimums in production. Register your own Reown `projectId` for production.
- Pricing: per-key service fees are "priced server-side" (example responses show `serviceFee: "0"`); network fee reimburses destination gas. Exact pricing tiers / rate limits for Connect: verify in docs: https://docs.intents.aurora.dev/intents-connect/integration-best-practices/fees-collection

## Monad notes
- Supported Chains page lists **"Monad | ✅ Supported | ✅ Supported"** (source and destination): https://docs.intents.aurora.dev/intents-connect/supported-chains
- Wallet integrations page: "EVM networks: Ethereum, Arbitrum, Base, BSC, Polygon, Optimism, Avalanche, Gnosis, Berachain, Monad, Plasma, Scroll, X Layer, ADI, Aurora, plus Solana." (AppKit connector): https://docs.intents.aurora.dev/intents-connect/intents-connect-sdk/wallet-integrations
- Live `GET https://intents-connect-api.aurora.dev/api/v1/supported_tokens` (checked 2026-10-02, not a doc page, re-check) returns `blockchain: "monad"` tokens in both `in` and `out`: MON `nep245:v2_1.omni.hot.tg:143_11111111111111111111`, USDC `nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx` (`0x754704bc059f8c67012fed69bc8a327a5aafb603`), USDT0 `nep245:v2_1.omni.hot.tg:143_4EJiJxSALvGoTZbnc8K7Ft9533et` (`0xe7cd86e13ac4309349f30b3435a9d337750fc82d`). The `143` in the asset id matches Monad mainnet chain id (CAIP-2 `eip155:143`). No testnet (`eip155:10143`) mentioned anywhere.
- Using Monad as a destination: `destination.chain` / `originChain` should be the `blockchain` value from supported_tokens (`monad`), by analogy with `base`/`pol`/`sol` in the examples. No Monad worked example or protocol addresses (Aave pools listed only for base/eth/arb). Verify destination-specific behavior with Aurora (Telegram mentor).
- Privy embedded EVM wallet as origin on Monad: signing is chain-agnostic `erc191`; the deposit transfer is an ordinary Monad tx (Privy `useSendTransaction` with `chainId: 143`).

## References
- [references/sdk.md](references/sdk.md): read when using `@aurora-is-near/intents-connect` / `-wallet`, React hooks, fee strategies, errors, examples (Hydrex, Polymarket, Jupiter), Privy adapter.
- [references/rest-api.md](references/rest-api.md): read when calling HTTP endpoints directly (request/response schemas, error codes).
- [references/dev-guides.md](references/dev-guides.md): read for Aave supply (3 rounds) / withdraw (out-op), async ops, per-chain signing and delete encodings, Solana and Sui destinations.

## Source pages
- https://docs.intents.aurora.dev/intents-connect/readme-1
- https://docs.intents.aurora.dev/intents-connect/supported-chains
- https://docs.intents.aurora.dev/intents-connect/deep-dive/how-it-works
- https://docs.intents.aurora.dev/intents-connect/deep-dive/security-and-trust-model
- https://docs.intents.aurora.dev/intents-connect/deep-dive/api-usage
- https://docs.intents.aurora.dev/intents-connect/deep-dive/execution-lifecycle
- https://docs.intents.aurora.dev/intents-connect/deep-dive/intermediary-accounts
- https://docs.intents.aurora.dev/intents-connect/intents-connect-widget/introduction
- https://docs.intents.aurora.dev/intents-connect/intents-connect-sdk (+ /typescript-sdk, /typescript-sdk/recipes-and-fees, /typescript-sdk/lifecycle-and-errors, /typescript-sdk/react, /wallet-integrations, /examples, /examples/hydrex, /examples/polymarket, /examples/solana-jupiter)
- https://docs.intents.aurora.dev/intents-connect/examples/deposit-into-aave-from-solana
- https://docs.intents.aurora.dev/intents-connect/examples/withdraw-from-aave-to-solana
- https://docs.intents.aurora.dev/intents-connect/developer-guides/evm/evm-steps-aave-supply
- https://docs.intents.aurora.dev/intents-connect/developer-guides/evm/evm-steps-aave-withdraw
- https://docs.intents.aurora.dev/intents-connect/developer-guides/evm/asynchronous-operations
- https://docs.intents.aurora.dev/intents-connect/developer-guides/evm/steps-destination-token-requirement
- https://docs.intents.aurora.dev/intents-connect/developer-guides/solana/using-solana-as-destination
- https://docs.intents.aurora.dev/intents-connect/developer-guides/solana/getting-your-solana-intermediary-address
- https://docs.intents.aurora.dev/intents-connect/developer-guides/sui/sui-as-destination
- https://docs.intents.aurora.dev/intents-connect/developer-guides/submit-signing
- https://docs.intents.aurora.dev/intents-connect/developer-guides/delete-execution
- https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference (list-supported-tokens, fetch-executions, request-an-execution, request-steps-execution, fetch-intermediary-accounts, delete-an-execution, submit-digest, submit-deposit-hash)
- Package READMEs: https://github.com/aurora-is-near/intents-swap-widget/tree/main/packages/intents-connect and .../packages/intents-connect-wallet
