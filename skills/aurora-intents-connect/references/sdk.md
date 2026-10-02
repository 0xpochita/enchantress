# Intents Connect SDK reference

Packages (beta, ESM only; "APIs may change between minor versions"; TON `ton_connect` and Tron `tip191` wallets not supported yet):

| Package | What |
| --- | --- |
| `@aurora-is-near/intents-connect` | Headless client + execution runner. Entry points: root (core), `/react` (hooks). Runtime deps `valtio`, `@scure/base`. Peer `react >=18.2` only for `/react` |
| `@aurora-is-near/intents-connect-wallet` | Wallet connection + deposit transfers, one subpath per chain, chain SDKs are optional peers |

```bash
pnpm add @aurora-is-near/intents-connect @aurora-is-near/intents-connect-wallet
# EVM-only with the AppKit modal (per wallet README): viem react @headlessui/react @reown/appkit @reown/appkit-adapter-ethers
```

## Core API

```ts
import { createIntentsConnectApi, createExecutionRunner, type Recipe } from '@aurora-is-near/intents-connect';

const runner = createExecutionRunner({
  api: createIntentsConnectApi({ baseUrl, apiKeyProxyUrl: '/api/intents-connect' }), // server-side: { baseUrl, apiKey }
  wallet: connector,               // WalletConnector
  onEvent: (event) => console.log(event),
  // optional: plugins, pluginOptions, makeTransfer, pollIntervalMs, maxPollAttempts, logger, autoCancelOnSignatureRejection
});

const execution = await runner.run({
  recipe, params,
  quote: { originAsset, destinationAsset, amount, swapType: 'EXACT_INPUT', slippageTolerance: 100 }, // atomic units, bps
  originChain: 'base',
  originToken: { contractAddress: USDC, decimals: 6 },
  depositViaWallet: true,          // false = show deposit address / QR
  // feeStrategy: { kind: 'placeholder' } (EVM default) | { kind: 'threeRound', amountReserveBps?: number }
});
```

**apiKeyProxyUrl:** in browsers pass `apiKeyProxyUrl`, not `apiKey`. "The two create calls go to your proxy, which adds the `x-api-key` header. All other calls go straight to `baseUrl`." The exact path/body the SDK sends to the proxy is not documented on the doc pages: verify in https://github.com/aurora-is-near/intents-swap-widget/tree/main/packages/intents-connect (source) before writing the Next.js route (`app/api/intents-connect/[...path]/route.ts` forwarding to `INTENTS_CONNECT_BASE_URL` with `x-api-key: process.env.INTENTS_CONNECT_API_KEY` is the likely shape; confirm the path mapping).

### What you provide
| Item | Where |
| --- | --- |
| API access | `createIntentsConnectApi({ baseUrl, apiKey })` (server) or `{ baseUrl, apiKeyProxyUrl }` (browser) |
| `WalletConnector` | address, signing standard, providers (from `-wallet` or hand-built) |
| Deposit transfer | only if `depositViaWallet: true`: runner `makeTransfer` option > `wallet.makeTransfer` > `plugins[family]`, else `NO_TRANSFER_IMPLEMENTATION` |
| Recipe | steps + destination asset |
| Quote | origin/destination assets, amount, slippage |

### Runner methods
| Method | Use |
| --- | --- |
| `preview(plan)` | Dry-run bridge-in: fee, spendable, frozen steps. No side effects, no events |
| `run(plan)` | Bridge-in end to end; resolves on terminal status |
| `previewSteps(plan)` / `runSteps(plan)` | Same for steps-only |
| `resume(executionId, options?)` | After reload/timeout/lost tab. Non-EVM origin across sessions: pass `{ originToken }` |
| `retryDeposit()` | Retry wallet transfer after rejection |
| `cancel(executionId?)` | Signs `delete_execution:{id}` and deletes |
| `getPhase()` / `getStore()` | Current phase / full valtio store |
| `dispose()` | Stop polling |

One flow per runner at a time.

### SDK to HTTP mapping
| `api.` method | Endpoint |
| --- | --- |
| `getIntermediary(wallet)` | `GET /api/v1/executions/{wallet}/intermediary` |
| `createExecution(wallet, body)` (key) | `POST /api/v1/executions/{wallet}` |
| `createStepsExecution(wallet, body)` (key) | `POST /api/v1/executions/{wallet}/steps` |
| `submitSignature(wallet, body)` | `POST /api/v1/executions/{wallet}/submit` |
| `recordDeposit(body)` | `POST /api/v1/executions/deposit/submit` |
| `listExecutions(wallet, query)` | `GET /api/v1/executions/{wallet}` |
| `deleteExecution(wallet, id, sig)` | `DELETE /api/v1/executions/{wallet}/{id}` |
| `listSupportedTokens(flow?)` | `GET /api/v1/supported_tokens` |

## Recipes

| Field | Meaning |
| --- | --- |
| `id`, `intent`, `title` | Identify integration; `intent`/`title` echoed into execution metadata |
| `flow` | `'bridge-in'` (preview/run) or `'steps-only'` (previewSteps/runSteps) |
| `type` | `'evm'` (`Recipe`) or `'solana'` (`SolanaRecipe`) |
| `destination` | `{ chain, assetId, tokenAddress? }`; omit `tokenAddress` for native |
| `buildSteps(ctx, params)` | `ctx = { intermediary, userAddress, amount }`; EVM returns `Step[]`, Solana returns `PreparedSteps` (may be async) |

EVM step: exactly `{ to, functionSignature, parameters, value, metadata? }` (`ILLEGAL_STEP_SHAPE` otherwise). Tuples are nested arrays. `ctx.amount` is opaque: under the placeholder strategy it is the literal `{MIN_AMOUNT_OUT}`.

Rules: one step must call `destination.tokenAddress` (`DESTINATION_TOKEN_UNTOUCHED`; native exempt); no `quote.recipient` on bridge-in (`RECIPIENT_NOT_ALLOWED`); max 30 EVM / 50 Solana steps; Solana: max 16 lookup tables, 256 KiB, no ComputeBudget, only the intermediary may sign (use `prepareSolanaSteps`).

### Fee strategies (bridge-in)
| | `{ kind: 'placeholder' }` | `{ kind: 'threeRound', amountReserveBps? }` |
| --- | --- | --- |
| Default for | EVM | Solana (only option) |
| `ctx.amount` | `{MIN_AMOUNT_OUT}` | literal atomic amount |
| Create calls | 1 | 3: dry, dry, real |
| Exact spendable before signing | no | yes (`quoted` event) |

threeRound: dry create with no steps gives gross `minAmountOut`; build steps at gross, dry create measures `networkFee`; `spendable = (minAmountOut - networkFee) * (1 - reserve)`, rebuild, real create. `run(preview.plan)` throws `QUOTE_MOVED` before signing if the quote worsened.

### Steps-only fees
| | Fee from what steps produce (swap ORCA to USDC) | Fee from what steps spend (transfer USDC out) |
| --- | --- | --- |
| Plan | `feeFromAmount` unset | `feeFromAmount: true` or `{ amountReserveBps }` |
| Rounds | 1 dry to measure, then real | dry at `amount`, rebuild at `amount - fee - reserve`, real |
| Cap | `maxNetworkFee` if given | automatic |

Preview valid 30 s (`previewTtlMs`). Fee over cap: `FEE_EXCEEDS_AMOUNT`.

## Lifecycle, events, errors

Phases: `idle -> resolving-identity -> planning -> creating -> awaiting-signature -> submitting -> awaiting-deposit (bridge-in) | settling (steps-only) -> success | failed | expired`. Any in-flight phase can go to `cancelled`. `success`/`failed`/`cancelled` terminal; `expired` is not (late deposit revives). `resume()` can enter at `awaiting-signature`, `awaiting-deposit`, or `settling`.

Events (`onEvent`): `phase`, `status`, `created { executionId }` (persist it for resume), `quoted { networkFee, spendable }`, `deposit-address { address, memo, deadline? }`, `deposit-sent { txHash }`, `error { error }`.

| Error | Action |
| --- | --- |
| `GuardError` (`code`) | precondition failed, usually before signing |
| `DepositTransferError` | `retryDeposit()` (runner stays in `awaiting-deposit`) |
| `ExecutionPollTimeoutError` | about 12 min polling budget used; `resume(executionId)` |
| `ExecutionCancelledError` | `cancel()` was called, not a failure |
| `RunnerDisposedError` | `resume(id)` from a new runner |
| `IntentsConnectApiError` (`status`, `body`) | non-2xx; 409 becomes `EXECUTION_IN_FLIGHT` |

Guard codes: `EXECUTION_IN_FLIGHT` (`meta.executionId`), `QUOTE_MOVED`, `NETWORK_MISMATCH` (EVM wallet on another chain than `originChainId`), `DESTINATION_TOKEN_UNTOUCHED`, `RECIPIENT_NOT_ALLOWED`, `MEMO_REQUIRED`, `NO_TRANSFER_IMPLEMENTATION`, `UNSUPPORTED_SIGNING_STANDARD`, `FEE_EXCEEDS_AMOUNT`; README also lists `FEE_NOT_ESTIMATED`, `DEPOSIT_BEFORE_SIGNATURE`.

```ts
import { deriveExecutionRecovery } from '@aurora-is-near/intents-connect';

const recovery = deriveExecutionRecovery(error);
if (recovery?.kind === 'resume-or-cancel') await runner.resume(recovery.executionId); // or runner.cancel(recovery.executionId)
if (recovery?.kind === 'retry-transfer') await runner.retryDeposit();
```
Signature rejected: runner auto-cancels by default (`autoCancelOnSignatureRejection`). Stellar origin cannot be cancelled client-side (clears on expiry).

## React (`@aurora-is-near/intents-connect/react`)

`<IntentsConnectProvider api wallet plugins? pluginOptions? makeTransfer? pollIntervalMs? maxPollAttempts? logger? autoCancelOnSignatureRejection?>`; `wallet` is `WalletConnector | null` (null while disconnected).

`useExecution({ onEvent? })` state: `phase`, `status`, `isBusy`, `executionId`, `execution`, `networkFee`, `spendable`, `depositAddress`, `depositMemo`, `deadline`, `depositTxHash`, `hasSubmittedSignature`, `isCancelling`, `error`, `recovery` (`resume-or-cancel` | `retry-transfer`). Methods (async, reject with `WALLET_NOT_CONNECTED` when no wallet): `preview`, `run`, `previewSteps`, `runSteps`, `resume`, `retryDeposit`, `cancel`.

Notes: one runner per `useExecution()` call; runner rebuilt when wallet address or signing standard changes (resume mid-run executions from the new runner); StrictMode-safe. `depositAddress` is only set after the signature is submitted. Mark the components `'use client'` in Next.js.

## Wallet package (`@aurora-is-near/intents-connect-wallet`)

| Subpath | Gives | Peers |
| --- | --- | --- |
| `/evm` | `evm` transfer plugin (switches/adds chain via 4902, native or ERC-20 `transfer`, `withdrawToNear` on Aurora) | `viem` |
| `/solana` | `sol` plugin (SOL or SPL `transferChecked`, creates recipient ATA; pass `rpcUrl`/`connection` in prod), `prepareSolanaSteps`, `createSolanaRecipientAta` | `@solana/web3.js @solana/spl-token` |
| `/stellar` | `stellar` plugin (mainnet only, memo required), `decodePublicKey` | `@stellar/stellar-sdk` |
| `/near` | `near` plugin (`ft_transfer`, `storage_deposit` when needed) | none |
| `/connect` | `WalletSelectorModal`, `useWalletSelector`, `EVM_SOLANA_WALLET_OPTION`, `NEAR_WALLET_OPTION`, `ALL_WALLET_OPTIONS` | `react @headlessui/react` |
| `/connect/appkit` | `AppKitProvider`, `useIntentsConnectWallet` (transfer pre-wired), `useAppKitConnector` | Reown AppKit set |
| `/connect/near` | `useNearConnector` | `@hot-labs/near-connect` |
| `/connect/stellar` | `useStellarConnector` | `@creit.tech/stellar-wallets-kit @stellar/stellar-sdk` |

`AppKitProvider` props: `appName`, `projectId` (defaults to Aurora's shared Reown id: register your own), `themeMode`, `rpcOverrides` (publicnode by default). AppKit EVM networks include Monad.

Plugins when connecting wallets yourself:
```ts
import { evm } from '@aurora-is-near/intents-connect-wallet/evm';
createExecutionRunner({ api, wallet, plugins: { evm }, pluginOptions: { provider: window.ethereum } });
// several families: plugins={{ evm, sol }} pluginOptions={{ evm: { provider }, sol: { provider } }}
```

### WalletConnector shape (from the wallet README adapter)
The README's `toWalletConnector(selector)` returns: `id`, `name`, `chains`, `signingStandard`, `connect()`, `disconnect()`, `getAddress()`, `getPublicKey`, `getChainId`, `decodePublicKey`, `getProviders()`; optionally `makeTransfer`. Import the `WalletConnector` type from `@aurora-is-near/intents-connect` and let `tsc` show exact member signatures.

### Privy EVM embedded wallet (not documented by Aurora)
Docs describe no Privy adapter. Two options:
1. **Recommended, fully documented:** skip the SDK runner and use REST (SKILL.md Pattern B): Privy `useSignMessage` signs `payload_json` (`erc191`), Privy `useSendTransaction` sends the deposit.
2. **SDK runner with Privy:** hand-build a `WalletConnector` with `signingStandard: 'erc191'`, `getAddress: () => privyWallet.address`, providers from Privy's EIP-1193 provider (`await privyWallet.getEthereumProvider()`, see privy-wallets skill), and the `evm` plugin with `pluginOptions: { provider }`. How the runner signs (which provider method, `getChainId` semantics for `NETWORK_MISMATCH`) is not on the doc pages: verify in package source before relying on it.

## Examples (demo app: apps/intents-connect-demo)

All share: `createIntentsConnectApi({ baseUrl, apiKeyProxyUrl })`, `useIntentsConnectWallet()`, one `useExecution()` per tab, `exec.run(plan)`.

| Example | Destination / asset | Pattern |
| --- | --- | --- |
| Hydrex | Base, native ETH `nep141:base.omft.near` | EVM recipe, native destination (token rule exempt), placeholder fee. Steps: `WETH.deposit()` with `value: amount`, `WETH.approve(NPM, amount)`, `NPM.mint((...))` with `recipient = userAddress` so the NFT lands in the user's wallet. dApp reads pool tick first to pick a range below price (WETH-only) |
| Polymarket | Polygon (`chain: 'pol'`), native USDC `nep245:v2_1.omni.hot.tg:137_...` | Token destination, `approve` satisfies token rule; `exactInputSingle` with `recipient = account` passed in `params` (never `quote.recipient`). Paying the recipient inside the swap avoids needing a known output amount |
| Solana (Jupiter) | Solana USDC | `SolanaRecipe`, `threeRound` with 25 bps reserve, `exec.preview()` then `exec.run(preview.plan)`; Jupiter swap built server-proxied for the intermediary (`taker`), validated (v6, only intermediary signs), `prepareSolanaSteps`. Sell/withdraw are steps-only (`previewSteps`/`runSteps`, withdraw uses `feeFromAmount: { amountReserveBps: 0 }`). 503 = no durable nonce free, retry |

Hydrex recipe core:
```ts
const hydrexMintRecipe: Recipe<{ tickLower: string; tickUpper: string }> = {
  id: 'hydrex-manual-mint', intent: 'hydrex_manual_mint', title: 'Hydrex cbETH/WETH position',
  flow: 'bridge-in', type: 'evm',
  destination: { chain: 'base', assetId: 'nep141:base.omft.near' }, // native ETH
  buildSteps: ({ userAddress, amount }, { tickLower, tickUpper }) => [
    { to: WETH, functionSignature: 'deposit()', parameters: [], value: amount },
    { to: WETH, functionSignature: 'approve(address,uint256)', parameters: [NPM, amount], value: '0' },
    { to: NPM, functionSignature: 'mint((address,address,address,int24,int24,uint256,uint256,uint256,uint256,address,uint256))',
      parameters: [[CBETH, WETH, ZERO, tickLower, tickUpper, '0', amount, '0', '0', userAddress, deadline]], value: '0' },
  ],
};
```

Solana withdraw (steps-only):
```ts
const preview = await exec.previewSteps({ recipe: withdrawRecipe, params: { recipient }, amount: usdcBalance, feeFromAmount: { amountReserveBps: 0 } });
await exec.runSteps(preview.plan);
```

Sources: https://docs.intents.aurora.dev/intents-connect/intents-connect-sdk/typescript-sdk , .../recipes-and-fees , .../lifecycle-and-errors , .../react , .../wallet-integrations , .../examples/hydrex , .../examples/polymarket , .../examples/solana-jupiter , package READMEs on GitHub.
