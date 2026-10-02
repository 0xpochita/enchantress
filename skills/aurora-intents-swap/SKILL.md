---
name: aurora-intents-swap
description: Aurora Intents Swap for enchantress - the cross-chain Intents Swap Widget (React package @aurora-is-near/intents-swap-widget / -standalone, iframe embed, WidgetConfigProvider, Widget/WidgetSwap/WidgetDeposit/WidgetWithdraw, theming, localisation, wallet connection incl. Privy, makeTransfer, onMsg, appFees, troubleshooting), the Swap REST API on https://intents-api.aurora.dev (GET /api/tokens, POST /api/quote dry vs real, depositAddress, refundTo, slippageTolerance bps, POST /api/deposit/submit, GET /api/status status values, GET /api/transactions, GET /api/incidents), supported chains/assets (Monad MON/USDC/USDT0), and Confidential Swaps (confidentiality basic/advanced, CONFIDENTIAL_INTENTS, /api/auth/authenticate erc191/nep413, JWT refresh, /api/account/balances, /api/account/history). Load when the task mentions swap widget, intents swap, cross-chain swap, 1Click quote, deposit address swap, swap status, Intents Studio API key, studio.aurora.dev, confidential swap, private swap, or swapping to/from Monad via Aurora.
---

# Aurora Intents Swap (widget + Swap API + Confidential Swaps)

Powered by NEAR Intents / 1Click. Two integration paths:
- **Swap Widget**: drop-in React component (or iframe) with token/chain pickers, quotes, wallet signing.
- **Swap API**: REST proxy over 1Click at `https://intents-api.aurora.dev`. You get a quote with a `depositAddress`, the user sends the origin asset there, you poll status.
- **Confidential Swaps**: same API, add `confidentiality: "advanced"` (or `"basic"`) to the quote. Hides the origin wallet and routing; destination settles publicly.

Both need an **API key** from Intents Studio (https://studio.aurora.dev). The key also carries widget config and integrator fees (configured per key). See the `aurora-intents` skill for keys/fees/rate limits.

## Reference files (read when)
- `references/swap-api.md` - full request/response shapes for every Swap API endpoint, error codes, typed TS client + end-to-end flow. Read when writing any server code against `intents-api.aurora.dev`.
- `references/confidential-swaps-api.md` - authenticate with signed data (erc191 / nep413), refresh token, private balances, confidential history. Read when touching Confidential Intents balances or auth.
- `references/widget-config.md` - every `WidgetConfig` option, theme props, CSS vars, localisation, `makeTransfer`, `onMsg`, troubleshooting. Read when customising the widget beyond the minimal example.

## Swap Widget

### Packages
| Package | Wallet mode |
| --- | --- |
| `@aurora-is-near/intents-swap-widget` | External (default): you pass `connectedWallets`, `providers`, `plugins` |
| `@aurora-is-near/intents-swap-widget-standalone` | Built-in: own connect modal via Reown AppKit (EVM: Ethereum, Arbitrum, Polygon, BSC, Optimism, Avalanche, Base; Solana; Stellar; NEAR). No TON. `connectedWallets` ignored |
| `@aurora-is-near/intents-swap-widget-evm` / `-solana` / `-stellar` | Network plugins (`evm`, `sol`, `stellar`) for external mode. NEAR is built in |

```bash
pnpm add @aurora-is-near/intents-swap-widget @aurora-is-near/intents-swap-widget-evm
```
(Docs name the packages but show no install command; pnpm is this repo's manager.)

Studio flow: log in at studio.aurora.dev, pick **Swap** mode, configure networks/tokens/wallet/design, then **Embed in your app** -> iframe link or React snippet. Advanced settings (own wallet, hooks) require the React component.

### Minimal Next.js client component (external wallet, EVM)
```tsx
'use client';
// Widget wiring uses browser wallet providers: keep it in a client component.
import {
  type WidgetConfig,
  WidgetConfigProvider,
  Widget,
} from '@aurora-is-near/intents-swap-widget';
import { evm } from '@aurora-is-near/intents-swap-widget-evm';
import '@aurora-is-near/intents-swap-widget/styles.css';

type Props = {
  address: string | undefined;
  providers: WidgetConfig['providers']; // e.g. { evm: privyProvider }, see Privy section
  connect: () => void;
  disconnect: () => void;
};

export function SwapWidget({ address, providers, connect, disconnect }: Props) {
  const config: WidgetConfig = {
    apiKey: process.env.NEXT_PUBLIC_AURORA_INTENTS_API_KEY,
    connectedWallets: { default: address },
    providers,
    plugins: { evm },
    onWalletSignin: connect,
    onWalletSignout: disconnect,
    slippageTolerance: 100, // bps, 1%
    allowedChainsList: ['monad', 'eth', 'base'],
    theme: { colorScheme: 'dark', accentColor: '#0098EA', stylePreset: 'clean' },
  };
  return (
    <WidgetConfigProvider config={config}>
      <Widget />
    </WidgetConfigProvider>
  );
}
```
Exact TS types of `connectedWallets` values and `providers.evm` are not documented; check the package's exported `WidgetConfig` / `Providers` types after install. Docs example: `providers: { evm: window.ethereum }` (an injected EIP-1193 provider).

### Plugging a Privy embedded EVM wallet
Docs show a Privy adapter **only for Solana** (Privy's `signMessage`/`signTransaction` shape differs, so they wrap it into `Providers['sol']`: `{ publicKey, signMessage, signTransaction }`). For EVM the docs only show `window.ethereum`; they do not specify the `providers.evm` interface or mention EIP-1193 explicitly. Likely approach (unverified, test it): pass Privy's EIP-1193 provider.
```tsx
'use client';
import { useEffect, useState } from 'react';
import { type ConnectedWallet, useWallets, usePrivy } from '@privy-io/react-auth';

type PrivyEvmProvider = Awaited<ReturnType<ConnectedWallet['getEthereumProvider']>>;

export function useAuroraEvmProvider() {
  const { wallets } = useWallets();
  const { login, logout } = usePrivy();
  const wallet = wallets.find((w) => w.walletClientType === 'privy');
  const [provider, setProvider] = useState<PrivyEvmProvider>();
  useEffect(() => {
    void wallet?.getEthereumProvider().then(setProvider);
  }, [wallet]);
  return { address: wallet?.address, provider, connect: login, disconnect: logout };
}
// then: providers: { evm: provider }
```
Verify in docs / with Aurora: https://docs.intents.aurora.dev/intents-swap/widget-configuration/wallet-connection.md . Solana Privy adapter code is in `references/widget-config.md`. If a custom signing path is needed, `<Widget makeTransfer={...} />` lets you send the deposit tx yourself (e.g. Privy `useSendTransaction`) and return `{ hash, transactionLink }`.

### Key config options (full list in references/widget-config.md)
- `apiKey`, `referral`, `appFees: [{ recipient: 'acct.near', fee: 25 }]` (bps of amountIn, recipient is an Intents account ID).
- `connectedWallets` (map by chain, falls back to `default`), `providers` (`evm`/`sol`/`stellar`/`near`), `plugins`, `onWalletSignin`, `onWalletSignout`, `showProfileButton`, `walletSupportedChains`.
- Tokens/chains: `allowedTokensList`, `allowedSourceTokensList`, `allowedTargetTokensList`, `filterTokens`, `defaultSourceToken`, `defaultTargetToken`, `allowedChainsList`, `allowedSourceChainsList`, `allowedTargetChainsList`, `chainsOrder`, `topChainShortcuts` (exactly 4), `priorityAssets`, `chainsFilter`.
- Quote: `slippageTolerance` (bps), `refetchQuoteInterval` (ms), `fetchQuote` (proxy quotes through your backend), `extraQuoteParameters`, `attachWalletAddressToQuote`.
- `sendAddress` / `hideSendAddress`, `lockSwapDirection`, `showTransactionHistory`, `confidentialMode: 'public' | 'confidential' | 'user-choice'`, `allowSwapWithExternalWallet` (QR deposit), `enableAccountAbstraction`.
- `alchemyApiKey` (recommended in prod; public RPCs are rate-limited), `tonCenterApiKey`.
- `theme` (`colorScheme`, `accentColor`, `backgroundColor`, `successColor`, `warningColor`, `errorColor`, `stylePreset: 'clean'|'bold'`, `borderRadius: 'none'|'sm'|'md'|'lg'`, `showContainer`). `localisation` (string overrides) is a separate prop on `WidgetConfigProvider`, not a config key.
- Components: `Widget` (default, `defaultMode` prop), `WidgetSwap`, `WidgetDeposit`, `WidgetWithdraw`. Events via `onMsg` (e.g. `on_transfer_success` with `msg.hash`).

### Widget gotchas
- Missing styles -> import `@aurora-is-near/intents-swap-widget/styles.css`. A global CSS reset breaks styles: wrap it in `@layer base { ... }`.
- `No EVM transfer configured` -> missing `plugins: { evm }`.
- Balances loading forever -> set `alchemyApiKey` (TON needs `tonCenterApiKey`).
- Dependency conflicts (valtio, @reown/appkit*, @noble/*, @solana/*) -> pin via pnpm `resolutions`/`overrides` (versions in references/widget-config.md).
- `onWalletSignin` omitted -> main button shows "Connect wallet" and is not clickable.

## Swap API (summary; details in references/swap-api.md)
Base URL `https://intents-api.aurora.dev`. **Auth = API key in the path** (`/{apiKey}`), no header. Quote requests are rate limited per key (429). Call from the server (route handler / server action) and keep the key in `AURORA_INTENTS_API_KEY`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/tokens/{apiKey}` | `{ tokens: [{ assetId, decimals, blockchain, symbol, price, priceUpdatedAt, contractAddress? }], asset_stats }` |
| POST | `/api/quote/{apiKey}` | Quote; `dry: true` = price only (no `depositAddress`, `deadline`, `timeWhenInactive`) |
| POST | `/api/deposit/submit/{apiKey}` | Optional: `{ txHash, depositAddress, memo?, nearSenderAccount? }` to speed processing |
| GET | `/api/status/{apiKey}?depositAddress=...&depositMemo=...` | Swap status |
| GET | `/api/transactions/{apiKey}` | History (`walletAddress`, cursor or page pagination) |
| GET | `/api/incidents/{apiKey}` | `{ status: 'operational' }` or `{ status: 'incidents', incidents: [...] }` |

Quote body required fields: `dry`, `swapType` (`EXACT_INPUT` | `EXACT_OUTPUT` | `FLEX_INPUT` | `ANY_INPUT`), `depositType` (`ORIGIN_CHAIN` | `INTENTS` | `CONFIDENTIAL_INTENTS`), `amount` (smallest units, string), `originAsset`, `destinationAsset` (asset IDs from `/api/tokens`, never hand-built), `slippageTolerance` (bps), `refundTo`, `refundType`, `recipient`, `recipientType` (`DESTINATION_CHAIN` | `INTENTS` | `CONFIDENTIAL_INTENTS`). Optional: `deadline` (ISO; refunds start after), `depositMode` (`SIMPLE` | `MEMO`), `confidentiality`, `quoteWaitingTimeMs`, `sessionId`, `connectedWallets`, `virtualChainRecipient`, `virtualChainRefundRecipient`.

Status values: `KNOWN_DEPOSIT_TX`, `PENDING_DEPOSIT`, `INCOMPLETE_DEPOSIT`, `PROCESSING`, `SUCCESS`, `REFUNDED`, `FAILED`. Terminal: `SUCCESS`, `REFUNDED`, `FAILED`.

Flow: tokens -> dry quote (show price) -> real quote (`dry: false`) -> user sends `quote.amountIn` of origin asset to `quote.depositAddress` (+ `depositMemo` if present) before `quote.deadline` -> optional deposit submit with tx hash -> poll status until terminal.

Refund semantics: `EXACT_INPUT` under-deposit refunded by deadline, over-deposit swapped and excess refunded to `refundTo`. `EXACT_OUTPUT` uses `minAmountIn`/`maxAmountIn`. `quote.refundFee` (origin units) charged on refunds; `withdrawFee` already deducted from `amountOut`.

## Confidential Swaps (details in references/confidential-swaps-api.md)
- Same endpoints and API key. Add `confidentiality: "advanced"` (enum `public` default | `basic` | `advanced`) to the quote body. Deposit, status polling, refunds and fees work the same.
- Confidentiality covers only the **origin** of assets; destination tx is public.
- Status for confidential quotes returns only `{ status }` (quote and swap details withheld).
- Optional: read the Confidential Intents (private NEAR Intents layer) balance: `POST /api/auth/authenticate/{apiKey}` with `signedData` (`erc191` or `nep413`) -> `{ accessToken, refreshToken, expiresIn, refreshExpiresIn }`; then `GET /api/account/balances/{apiKey}` and `GET /api/account/history/{apiKey}` with `Authorization: Bearer <accessToken>`; refresh via `POST /api/auth/refresh/{apiKey}` `{ refreshToken }`.
- `depositType: 'CONFIDENTIAL_INTENTS'` funds a swap from a Confidential Intents account via a signed transfer intent to `depositAddress` (direct token transfers not supported).

## Monad notes
- Supported chains page lists **Monad: Source supported, Destination supported** (https://docs.intents.aurora.dev/intents-swap/supported-chains.md).
- Chain code is `monad` (in `/api/tokens` `blockchain` options and `chainDepositAddresses[].blockchain` enum). Widget chain filters use the same short codes (e.g. `allowedChainsList: ['monad']`, confirmed via the docs ask endpoint).
- Monad assets (https://docs.intents.aurora.dev/intents-swap/supported-assets.md):

| Symbol | Contract | Asset ID |
| --- | --- | --- |
| MON | native | `nep245:v2_1.omni.hot.tg:143_11111111111111111111` |
| USDC | `0x754704bc059f8c67012fed69bc8a327a5aafb603` | `nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx` |
| USDT0 | `0xe7cd86e13ac4309349f30b3435a9d337750fc82d` | `nep245:v2_1.omni.hot.tg:143_4EJiJxSALvGoTZbnc8K7Ft9533et` |

  The `143` in the IDs matches Monad mainnet chain ID (`eip155:143`). Testnet (`eip155:10143`) is not mentioned. Always confirm IDs from `/api/tokens` at runtime.
- Standalone widget's built-in EVM wallet list does **not** include Monad (Ethereum, Arbitrum, Polygon, BSC, Optimism, Avalanche, Base). For Monad as a source chain use external mode (Privy wallet + `evm` plugin) or the API. Whether the `evm` plugin handles Monad deposits is not stated; verify with Aurora (Telegram mentor).
- For API flows from a Privy embedded wallet on Monad: get a real quote with `originAsset` = Monad asset, `refundTo` = the user's Privy address, `refundType: 'ORIGIN_CHAIN'`; then send MON (native transfer) or an ERC-20 `transfer` of USDC/USDT0 to `depositAddress` with Privy (`useSendTransaction` client side or `privy.wallets().ethereum().sendTransaction` server side; see `privy-transactions`), then `POST /api/deposit/submit` with the tx hash.

## Doc inconsistency
The Confidential Swaps page shows `POST /api/status/{apiKey}?depositAddress=...` to "notify the API after depositing", while the API reference defines `GET /api/status/...` for status and `POST /api/deposit/submit/...` for deposit notification. Prefer the API reference.

## Source pages
- https://docs.intents.aurora.dev/intents-swap/what-is-swap-widget.md
- https://docs.intents.aurora.dev/intents-swap/supported-assets.md
- https://docs.intents.aurora.dev/intents-swap/supported-chains.md
- https://docs.intents.aurora.dev/intents-swap/widget-integration.md
- https://docs.intents.aurora.dev/intents-swap/widget-configuration/get-started.md
- https://docs.intents.aurora.dev/intents-swap/widget-configuration/theming.md
- https://docs.intents.aurora.dev/intents-swap/widget-configuration/wallet-connection.md
- https://docs.intents.aurora.dev/intents-swap/widget-configuration/troubleshooting.md
- https://docs.intents.aurora.dev/intents-swap/widget-configuration/localisation.md
- https://docs.intents.aurora.dev/intents-swap/widget-configuration/widgets.md
- https://docs.intents.aurora.dev/intents-swap/confidential-swaps.md
- https://docs.intents.aurora.dev/api-reference/swap-api-reference.md (and sub-pages: get-supported-tokens, request-a-quote, submit-a-deposit, get-swap-status, get-transactions-history, get-ongoing-incidents)
- https://docs.intents.aurora.dev/api-reference/confidential-swaps-api-reference.md (and sub-pages: authenticate-user-with-signed-data, refresh-access-token, get-user-token-balances, get-transaction-history)
- https://docs.intents.aurora.dev/intents-connect/developer-guides/submit-signing.md (erc191 signature encoding)
