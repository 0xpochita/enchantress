# Swap Widget configuration reference

Sources: https://docs.intents.aurora.dev/intents-swap/widget-configuration/{get-started,theming,wallet-connection,troubleshooting,localisation,widgets}.md

Config is passed as `config` to `<WidgetConfigProvider>` (wraps one or more widgets). `WidgetConfig` and `Providers` types are exported from `@aurora-is-near/intents-swap-widget`.

## External-mode only options (`@aurora-is-near/intents-swap-widget`)
- `connectedWallets`: map of addresses keyed by chain, e.g. `{ default: '0x...', sol: '...', near: 'x.near', ton: 'UQ...' }`. Lookup by the selected token's chain, fallback `default`.
- `providers`: signing providers, keys `evm`, `sol`, `stellar`, `near`.
- `plugins`: network plugins `{ evm, sol, stellar }` from `@aurora-is-near/intents-swap-widget-evm` / `-solana` / `-stellar`. Install only what you use. NEAR needs no plugin.
- `onWalletSignin`: called by the main button when disconnected. Without it the button reads "Connect wallet" and is not clickable.
- `onWalletSignout`: used e.g. by the incompatible-wallet modal.
- `showProfileButton`: profile button at top (connect/disconnect via the two callbacks).

## Options for both packages
| Option | Meaning |
| --- | --- |
| `apiKey` | Widget integration key from https://studio.aurora.dev |
| `referral` | App name used as quote alias |
| `enableAccountAbstraction` | Deposit to / withdraw from your app's internal Intents account |
| `walletSupportedChains` | Chains the connected wallet supports, e.g. `['eth', 'base', 'arb']`; inferred from address format if omitted |
| `sendAddress` | Fixed destination; default is the source wallet |
| `slippageTolerance` | bps |
| `enableAutoTokensSwitching` | Rotate tokens if same picked on both sides |
| `attachWalletAddressToQuote` | Add active address to quote `connectedWallets` (default off) |
| `refetchQuoteInterval` | ms |
| `allowedTokensList` / `allowedSourceTokensList` / `allowedTargetTokensList` | Asset IDs or symbols |
| `filterTokens` | `(token) => boolean` for both lists |
| `defaultSourceToken` / `defaultTargetToken` | `null` = none selected |
| `chainsOrder` | e.g. `['eth', 'btc', 'near']` |
| `topChainShortcuts` | `(intentsAccountType) => readonly [4 chains]`; must be 4; hidden if filtered out by allowed chain lists |
| `allowedChainsList` / `allowedSourceChainsList` / `allowedTargetChainsList` | Chain short codes, e.g. `['base', 'eth', 'ton']` |
| `chainsFilter` | `{ source: { external: 'wallet-supported', intents: 'none' }, target: { external: 'all', intents: 'none' } }` |
| `priorityAssets` | Array of `[chain, symbol]` tuples and/or asset ID strings |
| `fetchQuote` | `async (data, { signal }) => quote` to proxy the 1Click quote via your backend |
| `fetchSourceTokens` / `fetchTargetTokens` | Custom token list loaders |
| `appFees` | `{ recipient: string /* Intents account ID */; fee: number /* bps of amountIn */ }[]` |
| `alchemyApiKey` | Exclusive balance source on Alchemy-supported chains; also Solana deposit RPC. Recommended for prod |
| `tonCenterApiKey` | TON balances |
| `hideSendAddress`, `hideTokenInputHeadings`, `lockSwapDirection` | UI toggles |
| `themeParentElementSelector` | Element holding CSS theme vars (default `body`) |
| `showTransactionHistory` | Swap history for the wallet (default off) |
| `disabledInternalBalanceTokens` | Hide tokens from internal balance list |
| `showConversionPreview` | Live conversion preview on hover |
| `extraQuoteParameters` | `virtualChainRecipient`, `virtualChainRefundRecipient`, `sessionId`, `customRecipientMsg` (experimental, can lose funds) |
| `confidentialMode` | `'public' \| 'confidential' \| 'user-choice'` |
| `allowSwapWithExternalWallet` | Toggle connected wallet vs external wallet via QR |
| `theme` | See below |
| `appName` | Shown in theming example |

Default `topChainShortcuts`: evm `['eth','arb','avax','base']`, sol `['sol','eth','btc','near']`, near `['near','sol','eth','btc']`, otherwise `['eth','btc','sol','near']`.

## Theming
`theme`: `colorScheme: 'light'|'dark'`, `accentColor`, `backgroundColor` (ignored with bold preset), `successColor`, `warningColor`, `errorColor`, `stylePreset: 'clean'|'bold'`, `borderRadius: 'none'|'sm'|'md'|'lg'`, `showContainer: boolean`.

CSS: `@import '@aurora-is-near/intents-swap-widget/styles.css';` then override `--sw-*` vars (e.g. `--sw-gray-50`, `--sw-space-s`, `--sw-radius-m`, `--sw-font-sans`). Full list: https://github.com/aurora-is-near/intents-swap-widget/blob/main/packages/intents-swap-widget/src/theme.css
To reuse widget Tailwind tokens in your own markup: wrap in `className="sw"` and import `@aurora-is-near/intents-swap-widget/tailwind.css`.
Global CSS resets must live in `@layer base { ... }` or widget spacing breaks.

## Localisation
```tsx
<WidgetConfigProvider localisation={{ 'quote.result.maxSlippage.label': 'MAX', 'submit.active.swap': 'Swap now' }}>
  <WidgetSwap />
</WidgetConfigProvider>
```
All keys: https://github.com/aurora-is-near/intents-swap-widget/blob/main/packages/intents-swap-widget/src/types/localisation.ts

## Widget components and props
`Widget` (use this; `defaultMode` prop, Swap by default), `WidgetSwap`, `WidgetWithdraw`, `WidgetDeposit`.

`makeTransfer` overrides the built-in EVM/Solana transfer:
```ts
export type MakeTransferArgs = {
  amount: string;
  decimals: number;
  address: string;          // deposit address
  tokenAddress?: string;
  chain: Chains;
  evmChainId: number | null;
  isNativeEvmTokenTransfer: boolean;
  sourceAssetId: string;
  targetAssetId: string;
};
// return { hash, transactionLink }. Second argument = widget type (swap | deposit | withdraw).
```
Whether `makeTransfer` may be async is not stated (doc example is sync); check the exported type.

`onMsg` events (deposit widget documented): `on_select_token`, `on_change_deposit_type`, `on_tokens_modal_toggled`, `on_transfer_success` (has `msg.hash`). Other widget types: see their `Props` type.

## Privy Solana adapter (from docs)
```tsx
import { type Providers } from '@aurora-is-near/intents-swap-widget';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

function solanaProviderFromPrivy(privyWallet: PrivySolanaWallet): NonNullable<Providers['sol']> {
  const account = privyWallet.standardWallet.accounts.find((a) => a.address === privyWallet.address);
  return {
    publicKey: account?.publicKey ? new PublicKey(account.publicKey) : undefined,
    signMessage: async (message) => (await privyWallet.signMessage({ message })).signature,
    signTransaction: async (transaction) => {
      if (transaction instanceof VersionedTransaction) {
        const r = await privyWallet.signTransaction({ transaction: transaction.serialize() });
        return VersionedTransaction.deserialize(r.signedTransaction);
      }
      const r = await privyWallet.signTransaction({
        transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
      });
      return Transaction.from(r.signedTransaction);
    },
  } as NonNullable<Providers['sol']>; // cast is in the official docs
}
// config: { connectedWallets: { default: privyWallet.address }, providers: { sol: solanaProviderFromPrivy(privyWallet) }, plugins: { sol } }
```
`PrivySolanaWallet` is a placeholder type in the docs (use Privy's Solana wallet type).

## Troubleshooting
- Balances load forever: set `alchemyApiKey`; watch Alchemy quotas; TON needs `tonCenterApiKey`; RPC calls retry twice.
- `No EVM transfer configured`: add `plugins: { evm }`.
- Wallet not connecting: correct `providers` key per chain; set `walletSupportedChains`.
- No styles: import `styles.css`; scope CSS resets in `@layer base`.
- Dependency conflicts: pin versions (pnpm: `resolutions` / `pnpm.overrides`):
```json
{
  "valtio": "2.1.7", "valtio-fsm": "1.0.0", "@noble/curves": "^1.6.0", "@noble/hashes": "^1.5.0", "strip-ansi": "6.0.1",
  "@reown/appkit": "1.8.17", "@reown/appkit-common": "1.8.17", "@reown/appkit-controllers": "1.8.17",
  "@reown/appkit-pay": "1.8.17", "@reown/appkit-polyfills": "1.8.17", "@reown/appkit-scaffold-ui": "1.8.17",
  "@reown/appkit-ui": "1.8.17", "@reown/appkit-utils": "1.8.17", "@reown/appkit-wallet": "1.8.17",
  "@solana/addresses": "5.5.1", "@solana/codecs-core": "5.5.1", "@solana/errors": "5.5.1", "@solana/keys": "5.5.1"
}
```
- Issues: https://github.com/aurora-is-near/intents-swap-widget/issues
