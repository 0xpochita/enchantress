---
name: privy-funding
description: Privy wallet funding and money movement. Covers crypto deposit addresses (persistent deposit address that swaps/bridges incoming crypto into a target asset, useHeadlessCryptoDeposit, deposit_accounts/crypto, quotes, orders), the deposit modal (useDepositFunds) with card onramps (Stripe, MoonPay, Meld; card, Apple Pay, Google Pay), Coinbase exchange funding, bank-transfer fiat deposits via Bridge virtual accounts (ACH, wire, SEPA, deposit_accounts/fiat), KYC/KYB prerequisites, and fiat/crypto payouts (offramp to bank, transfer API). Load when the task mentions: fund wallet, add funds, deposit, top up, onramp, buy crypto, card/Apple Pay/Google Pay, Stripe onramp, MoonPay, Coinbase onramp, deposit address, universal deposit, bridge in, bank transfer, ACH, wire, SEPA, virtual account, IBAN, KYC, KYB, offramp, payout, cash out, withdraw to bank, or Monad funding.
---

# Privy funding (deposits, onramps, payouts)

All flows land funds in a Privy wallet (embedded or server wallet). Configure methods in Dashboard > Funding (`https://dashboard.privy.io/apps?page=funding`).

| Method | What | Surface |
| - | - | - |
| Crypto deposits | Persistent deposit address; incoming crypto auto-swapped/bridged to one target asset on one chain | React hook (experimental), Node, REST |
| Deposit modal | Prebuilt UI: card/bank onramp + crypto deposit picker | React `useDepositFunds`; RN `useFundWallet` |
| Fiat deposits | Dedicated bank account (Bridge virtual account), fiat converted to stablecoin on-chain | Node, REST, Python |
| Exchange | User funds from a connected Coinbase account | Deposit modal (RN: `defaultPaymentMethod: 'exchange'`) |
| Payouts | Fiat to bank (Bridge offramp) or crypto via transfer API | Node, REST |

Read when needed:
- `references/fiat-kyc-payouts.md`: fiat deposit account details, webhooks, KYC link, fiat payout code and supported chains.

## 1. Crypto deposits (universal deposit address)

How it works: create a crypto deposit account on a destination wallet (accepted sources + one destination asset/chain), show `deposit_address`, user sends funds, a wallet automation runs a swap and delivers to the destination.

Prerequisites (setup page):
- Enable swaps (`/wallets/actions/swap/setup`) AND gas sponsorship in **App pays** mode for EVERY source chain. "Deposit addresses cannot be created on chains where gas sponsorship has not been enabled."
- Gas sponsorship requires TEE execution.
- Destination wallet must be a Privy wallet owned 1-of-1 by a single user, no authorization keys, no nested quorums.
- Source chain families: EVM and Solana only ("Chains must be EVM or Solana"). Bitcoin is NOT a documented source.
- `destination.chain` must be in the same family as the destination wallet's `chain_type`.

`deposit_address_strategy`: `dedicated` (default; separate source wallet per chain family owned by the user, appears as embedded wallet in linked accounts), `prefer_destination`, `require_destination` (reuse the destination wallet itself; REMOVES all existing automation attachments on it). Always display the latest returned `deposit_address`.

Identifiers: chain alias or CAIP-2 (`base`, `eip155:8453`); asset alias or contract address (`usdc`, `0x833589...`).

### React (experimental hook, `@privy-io/react-auth`)

```tsx
'use client';
import {useState} from 'react';
import {useHeadlessCryptoDeposit} from '@privy-io/react-auth';

export function CryptoDepositPanel({walletId}: {walletId: string}) {
  const {createCryptoDepositAccount} = useHeadlessCryptoDeposit();
  const [address, setAddress] = useState<string | null>(null);

  const onCreate = async (): Promise<void> => {
    try {
      const {deposit_accounts} = await createCryptoDepositAccount({
        walletId,
        type: 'inline_route',
        // depositAddressStrategy: 'prefer_destination', // optional
        source: {mode: 'include', values: [{asset: 'usdc', chain: 'base'}]},
        destination: {asset: 'usdc', chain: 'base'} // docs examples use pathusd/tempo
      });
      setAddress(deposit_accounts[0]?.deposit_address ?? null);
    } catch (error) {
      console.error(error); // unauthenticated, swaps/gas not enabled, unsupported route
    }
  };

  return (
    <div>
      <button type="button" onClick={onCreate}>Get deposit address</button>
      {address && <code>{address}</code>}
    </div>
  );
}
```

Same hook also exposes `getQuote({source: {chain, asset}, destination: {chain, asset}, inputAmount?, slippageBps?})`, `getOrder({walletId, orderId})`, `getNextOrder(...)` (poll by timestamp `after`). Interface "may change without a major SDK version bump".

### Node (`@privy-io/node`)

```ts
import {PrivyClient} from '@privy-io/node';

const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!
});

export async function createDepositAddress(walletId: string, userJwt: string) {
  const {deposit_accounts} = await privy.wallets().depositAccounts.crypto.create(walletId, {
    type: 'inline_route',
    source: {mode: 'all'},
    destination: {asset: 'usdc', chain: 'base'},
    authorization_context: {user_jwts: [userJwt]} // dest-owner signature
  });
  return deposit_accounts;
}

// Indicative quote, no wallet or signature needed. Omit input_amount to quote ~$50.
export const quote = () =>
  privy.wallets().depositAccounts.crypto.quote({
    source: {chain: 'base', asset: 'usdc'},
    destination: {chain: 'tempo', asset: 'pathusd'},
    input_amount: '1.5',
    slippage_bps: 50
  });

// Order = the sweep wallet action. status: pending | succeeded | rejected | failed
export const getOrder = (walletId: string, orderId: string) =>
  privy.wallets().depositAccounts.crypto.orders.get(orderId, {wallet_id: walletId});
```

REST:
- `POST /v1/wallets/{wallet_id}/deposit_accounts/crypto` (Basic auth app id:secret, `privy-app-id`, `privy-authorization-signature`). Body `type: 'inline_route' | 'deposit_config'` (`deposit_config_id` for the latter).
- `POST /v1/deposit_accounts/crypto/quote` (source and destination must both be mainnet or both testnet).
- `GET /v1/wallets/{wallet_id}/deposit_accounts/crypto/orders/{order_id}`
- `GET /v1/wallets/{wallet_id}/deposit_accounts/crypto/next_order?after=<ISO>` (`order: null` if none).

Gotchas: exporting a source wallet's key makes it ineligible (Privy then creates a new deposit wallet). Imported/exported wallets cannot receive automation attachments. Only the oldest enabled matching automation on a wallet runs.

## 2. Deposit modal (`useDepositFunds`, React)

One hook for fiat (card + bank onramp) and crypto. Crypto-only call opens the crypto flow directly; with `fiat` a method picker shows first.

```tsx
'use client';
import {useDepositFunds} from '@privy-io/react-auth';

export function AddFundsButton({walletId}: {walletId?: string}) {
  const {depositFunds} = useDepositFunds();

  const onClick = async (): Promise<void> => {
    try {
      const result = await depositFunds({
        destination: {wallet: walletId, asset: 'usdc', chain: 'base'}, // omit wallet -> first embedded wallet on chain
        fiat: {
          source: {assets: ['usd', 'eur'], defaultAsset: 'usd'},
          environment: 'production', // 'sandbox' for Stripe test mode
          defaultAmount: '50'
        },
        crypto: {source: {mode: 'all'}} // optional slippageBps
      });
      // result: {method: 'fiat', status: 'submitted' | 'confirmed'}
      //       | {method: 'crypto', status: 'address_shown' | 'completed'}
      if (result.method === 'crypto' && result.status === 'completed') {
        // refresh balances
      }
    } catch (error) {
      console.error(error); // user cancel, flow already in progress, config errors
    }
  };

  return <button type="button" onClick={onClick}>Add funds</button>;
}
```

Rules: at least one of `fiat`/`crypto`; `fiat.source.assets` must be non-empty if passed; crypto requires a Privy wallet as destination; crypto needs the same swaps + app-pays gas setup as section 1.

### Card onramps (Stripe, MoonPay, Meld)
- Enable **card onramps** in Dashboard > Funding. Defaults: Stripe Crypto Onramp (USD, EUR) and MoonPay (AUD, BRL). 50+ currencies (lowercase ISO 4217, e.g. `gbp`, `idr`, `sgd`) need Meld KYB via Dashboard "Configure" on Meld.
- Stripe Embedded Components in the modal: `@privy-io/react-auth` >= 3.33.1 and `pnpm install @stripe/crypto`. Payment methods: credit, debit, Apple Pay, Google Pay, ACH (US only). Available US (excluding New York) and EU. KYC handled by Stripe via Link.
- Stripe destinations: OUSD on Tempo, Base, Ethereum, Solana; USDC.e on Tempo; USDC on Base, Solana, Ethereum, Arbitrum, Polygon; USDT on Ethereum.
- MAINNET ONLY: "Stripe's onramp does not support testnets, so testnet chains fail even in sandbox mode." Sandbox test card `4242 4242 4242 4242`, OTP `000000`, amount < $200.
- Pricing/coverage questions: sales@privy.io.

### Exchange (Coinbase)
Enable **exchange** in Dashboard > Funding, then create a Coinbase Developer Platform account and add Onramp API keys (https://docs.cdp.coinbase.com/onramp/introduction/welcome). Users fund from their Coinbase account via the modal.

### React Native
`useFundWallet` / `useFundSolanaWallet` from `@privy-io/expo/ui` (needs `<PrivyElements />`): params `address`, `chain` (viem chain), `asset` (`'native-currency' | 'USDC' | {tokenAddress}`), `amount`, `defaultPaymentMethod: 'card' | 'exchange'`, `card.preferredProvider: 'coinbase' | 'moonpay'`, `moonpay.useSandbox`. RN supports only MoonPay and Coinbase (no Stripe/Meld routing). Fully custom RN Stripe flow: recipe `/recipes/stripe-embedded-onramp` (needs Stripe onramp approval + your backend).

Note: a web React `useFundWallet` hook is not in current docs; use `useDepositFunds`. If existing code uses `useFundWallet` on web, verify in docs: https://docs.privy.io/wallets/funding/use-deposit-funds.md

## 3. Fiat deposits (bank transfer via Bridge)

Dedicated persistent bank account per wallet (no memo/reference needed). US accounts: routing + account number (rails e.g. `ach_push`, `wire`); EUR: `iban` + `bic` (SEPA). Webhook rails also include `fednow`, `faster_payments`.

Prereqs: Bridge account + Bridge API key registered in Dashboard (Onramps > Bridge > Configure) with server-side flows enabled; wallet's entity must have passed KYC (individual) or KYB (business). Server-created wallets need an entity assigned explicitly. Manage Bridge resources only through Privy.

Bridge sandbox is NOT a testnet: "wallets and assets used in sandbox flows are still mainnet."

Code, response shape, and webhooks: `references/fiat-kyc-payouts.md`.

## 4. KYC / KYB (brief)
Required for fiat onramps/offramps, issued cards, custodial wallets. Provider: Bridge. Flows: hosted link (`privy.users().kyc.initiateLinks(userId, {...})`), headless (server submits data), ToS acceptance first. Endorsements unlock rails/regions (default `['base']`). Docs: https://docs.privy.io/kyc-kyb/overview.md

## 5. Payouts (brief)
- Crypto payouts: transfer API (`/wallets/actions/transfer/overview`), no provider needed; supports bridging and same-peg stablecoin conversion on its listed chains.
- Fiat payouts: register external bank account, then `privy.wallets().payout().fiat().create(walletId, {...})` (Bridge). Not a policy method: a policy that only allows other methods blocks payouts. See reference file.

## Pricing / tier notes
- Webhooks in production (deposit lifecycle events): Enterprise plan ("Webhooks can be tested at no cost in development environments").
- Gas sponsorship (required for crypto deposits): prepaid credits with saved payment method on mainnets, or postpaid on Enterprise.
- Fiat deposit accounts are billed provider resources: send an `Idempotency-Key` header.

## Monad notes
- Crypto deposits ride on the swap API. Swap supported chains list Monad: "| Monad | 143 | `eip155:143` | MON |" and testnet "| Monad Testnet | 10143 | `eip155:10143` | MON |" (https://docs.privy.io/wallets/actions/swap/overview.md).
- App-pays gas sponsorship lists "Monad" (mainnet) and "Monad Testnet" (https://docs.privy.io/wallets/gas-and-asset-management/gas/overview.md). So the two crypto-deposit prerequisites can be enabled on Monad.
- BUT cross-chain routes do NOT include Monad. Supported cross-chain source/destination set is only Ethereum, Base, Tempo, Robinhood Chain, Arbitrum, Polygon, Solana (swap overview "Cross-chain swaps" table and transfer "Native bridging" table). Monad mainnet is NOT listed as a destination chain for cross-chain deposits. Consequence: "deposit USDC on Base, receive on Monad" is not documented as supported; a same-chain Monad route (token on Monad -> asset on Monad) is plausible but not explicitly documented. Verify with the quote endpoint (`destination: {chain: 'eip155:143', asset: ...}`) before building; it rejects unsupported routes.
- Card onramp (Stripe) destinations: Tempo, Base, Ethereum, Solana, Arbitrum, Polygon. No Monad. MoonPay/Coinbase chain lists are not in Privy docs.
- Fiat deposits: `destination.chain` is a free string (examples `tempo`, `base`, `solana`); Monad not mentioned.
- Fiat payouts source chains: Tempo, Ethereum, Base, Arbitrum, Optimism, Polygon, Solana. No Monad.
- Transfer API chains exclude Monad (use low-level RPC/sendTransaction on Monad).
- Summary: Monad support for onramp, fiat deposits, payouts, and cross-chain deposits is not confirmed in docs; verify in dashboard or with Privy. Practical path today: fund on a supported chain (e.g. Base USDC) then bridge to Monad yourself, or test a same-chain Monad deposit route via quote.

## Source pages
- https://docs.privy.io/financial-flows/deposits/overview.md
- https://docs.privy.io/financial-flows/deposits/configuration.md
- https://docs.privy.io/wallets/funding/crypto-deposits/overview.md
- https://docs.privy.io/wallets/funding/crypto-deposits/setup.md
- https://docs.privy.io/wallets/funding/crypto-deposits/create-deposit-account.md
- https://docs.privy.io/wallets/funding/crypto-deposits/quotes.md
- https://docs.privy.io/wallets/funding/crypto-deposits/orders.md
- https://docs.privy.io/wallets/funding/crypto-deposits/faq.md
- https://docs.privy.io/wallets/funding/use-deposit-funds.md
- https://docs.privy.io/wallets/funding/fiat-deposits/overview.md
- https://docs.privy.io/wallets/funding/fiat-deposits/setup.md
- https://docs.privy.io/wallets/funding/fiat-deposits/create-deposit-account.md
- https://docs.privy.io/wallets/funding/fiat-deposits/deposit-lifecycle.md
- https://docs.privy.io/wallets/automations/overview.md
- https://docs.privy.io/wallets/actions/swap/overview.md
- https://docs.privy.io/wallets/actions/transfer/overview.md
- https://docs.privy.io/wallets/gas-and-asset-management/gas/overview.md
- https://docs.privy.io/wallets/gas-and-asset-management/gas/setup.md
- https://docs.privy.io/financial-flows/payouts/overview.md
- https://docs.privy.io/financial-flows/payouts/configuration.md
- https://docs.privy.io/financial-flows/transfers/fiat-payouts/overview.md
- https://docs.privy.io/financial-flows/transfers/fiat-payouts/execute-payout.md
- https://docs.privy.io/kyc-kyb/overview.md
- https://docs.privy.io/kyc-kyb/kyc.md
- https://docs.privy.io/recipes/account-funding/overview.md
- https://docs.privy.io/recipes/stripe-embedded-onramp.md
- https://docs.privy.io/api-reference/crypto-deposits/create.md
- https://docs.privy.io/api-reference/fiat/deposit-accounts/create.md
- https://docs.privy.io/api-reference/wallets/payout/create.md
