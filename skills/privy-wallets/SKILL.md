---
name: privy-wallets
description: Privy wallet infrastructure for the enchantress Next.js app. Covers embedded wallets (auto-created on login via createOnLogin, useCreateWallet, useWallets, useImportWallet), server wallets created from the backend with @privy-io/node PrivyClient or the REST API (POST /v1/wallets, admin/treasury/fee-receiver wallets, owner/owner_id), multi-chain support (EVM, Solana, Bitcoin, Tron, Sui, chain_type, CAIP-2, defaultChain/supportedChains, Monad), external wallets (useConnectWallet, MetaMask/Phantom), wallet UI components, custodial wallets, global wallets and EVM smart wallets (brief), plus PrivyProvider / PrivyClient / REST auth setup. Load when the task mentions: privy wallet, embedded wallet, server wallet, create wallet, PrivyProvider config, PrivyClient, @privy-io/node, @privy-io/react-auth, useWallets, createOnLogin, wallet id, chain_type, caip2, connect external wallet, smart wallet, global wallet, custodial wallet, Monad chain config.
---

# Privy wallets

Login is out of scope (assumed done). Signers, policies, authorization keys and quorums are a separate skill: only the concept of `owner` is covered here.

## What exists

- **Embedded wallets**: self-custodial wallets built into the app, keys secured in TEEs. No extension, no seed phrase for the user. Neither Privy nor the app sees user keys. Can be auto-created at login or created on demand. Users can export the key.
- **Server (developer-controlled) wallets**: same embedded-wallet infra, created from the backend with `@privy-io/node` or REST. Owner is a user ID, an authorization key (P-256 public key), a key quorum (`owner_id`), or nothing (app secret controls it). Use for admin, treasury, fee-receiver wallets.
- **External wallets**: MetaMask, Phantom, Rainbow, etc. connected via Privy connectors; works with wagmi / viem / ethers / @solana/web3.js.
- **Custodial wallets**: backed by a licensed custodian (today Bridge). Chains: Tempo, Base, Solana only. Not relevant for Monad.
- **Global wallets**: share one embedded wallet across Privy apps (provider/requester roles). Provider access is gated (request in Dashboard).
- **EVM smart wallets**: ERC-4337 accounts controlled by the embedded signer (Alchemy, Kernel, Safe, Biconomy, Thirdweb, Coinbase). React / React Native SDKs only; enable in Dashboard first.

## Setup (React, client side)

Install: `pnpm install @privy-io/react-auth@latest` (React 18+, TS 5+). Solana peer deps only if using Solana: `@solana/kit @solana-program/memo @solana-program/system @solana-program/token` (Turbopack needs no externals config).

```tsx
// apps/<app>/src/app/providers.tsx
'use client';

import {PrivyProvider} from '@privy-io/react-auth';
import type {ReactNode} from 'react';

export default function Providers({children}: {children: ReactNode}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ''}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID} // optional app client
      config={{
        embeddedWallets: {
          ethereum: {createOnLogin: 'users-without-wallets'}
        }
        // defaultChain / supportedChains: see Multi-chain below
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

- Wrap as close to the root as possible (in `app/layout.tsx`).
- Gate UI on `usePrivy().ready`; gate wallet logic on `useWallets().ready`.

### createOnLogin

`config.embeddedWallets.ethereum.createOnLogin` and/or `config.embeddedWallets.solana.createOnLogin`:
- `'all-users'`: create a wallet for all users on login.
- `'users-without-wallets'`: create only for users who do not have a wallet on login.
- `'off'` (default).

Gotcha: auto-creation works only for login through the **Privy modal**. Whitelabel / headless login (`loginWithCode`, `useLoginWithOAuth`, etc.) does NOT trigger it. Create manually after login in that case.

## Embedded wallets in React

```tsx
'use client';

import {useCreateWallet, usePrivy, useWallets} from '@privy-io/react-auth';

export function WalletPanel() {
  const {ready: privyReady, authenticated, user} = usePrivy();
  const {ready: walletsReady, wallets} = useWallets(); // CONNECTED wallets (embedded + external)
  const {createWallet} = useCreateWallet({
    onSuccess: ({wallet}) => console.log('created', wallet.address),
    onError: (error) => console.error(error)
  });

  if (!privyReady || !walletsReady) return null;
  if (!authenticated) return null;

  // LINKED wallets (tied to the user object; may not be connected right now)
  const linked = user?.linkedAccounts.filter(
    (a) => a.type === 'wallet' || a.type === 'smart_wallet'
  );

  return (
    <div>
      {wallets.map((w) => (
        <p key={w.address}>{w.address}</p>
      ))}
      <p>linked: {linked?.length ?? 0}</p>
      <button onClick={() => createWallet()}>Create wallet</button>
    </div>
  );
}
```

- `createWallet({createAdditional?: boolean, signers?: {signerId: string; policyIds?: string[]}[]})` returns `Promise<Wallet>`. To create a second Ethereum embedded wallet for a user who already has one, `createAdditional: true` is required (default `false`).
- Solana: same hook names from `@privy-io/react-auth/solana`.
- Other chains (cosmos, stellar, sui, ...): `useCreateWallet` from `@privy-io/react-auth/extended-chains`, `createWallet({chainType})` returns `{user, wallet}`.
- `useWallets` = connected, use for signing/tx. `usePrivy().user.linkedAccounts` = linked, use for ownership checks.
- Switch network on a connected EVM wallet: `await wallet.switchChain(chainId)` (number or hex string). Chain must be in `supportedChains`.
- Import a key: `const {importWallet} = useImportWallet(); await importWallet({privateKey})` (EVM from `@privy-io/react-auth`, Solana from `@privy-io/react-auth/solana`).

### UI components

Privy ships prebuilt sign-message and send-transaction confirmation UIs. Customize per call with a `uiOptions` object (`showWalletUIs`, `title`, `description`, `buttonText`, `transactionInfo {title, action, contractInfo}`, `successHeader`, `successDescription`, `isCancellable`). Exact sign/send hook signatures belong to the transactions skill; verify in docs: https://docs.privy.io/wallets/using-wallets/ui-components.md

## Server wallets (@privy-io/node)

Install: `pnpm install @privy-io/node@latest`. Runtimes: Node 20+, Bun, Deno, Cloudflare Workers, Vercel Edge.

```ts
// apps/<app>/src/lib/privy-server.ts  (server-only, never import into client components)
import {PrivyClient} from '@privy-io/node';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const privy = new PrivyClient({
  appId: env('PRIVY_APP_ID'),
  appSecret: env('PRIVY_APP_SECRET')
});
```

```ts
import {APIError, PrivyAPIError} from '@privy-io/node';
import {privy} from '@/lib/privy-server';

// App-controlled wallet (e.g. fee receiver). No owner: controlled by app secret.
const feeWallet = await privy.wallets().create({chain_type: 'ethereum'});
// Persist feeWallet.id: later calls use the wallet ID, not the address.

// Wallet owned by a Privy user
const userWallet = await privy.wallets().create({
  chain_type: 'ethereum',
  owner: {user_id: 'did:privy:xxxxx'}
});

const w = await privy.wallets().get(feeWallet.id);

for await (const wallet of privy.wallets().list({chain_type: 'ethereum'})) {
  // paginated, iterates all pages
}

try {
  /* ... */
} catch (error) {
  if (error instanceof APIError) console.log(error.status, error.name); // HTTP 4xx/5xx
  else if (error instanceof PrivyAPIError) console.log(error.message);
  else throw error;
}
```

Full create params, REST equivalents, import, get-by-address, send tx with `caip2`: read `references/server-wallets.md` (read when building backend wallet code or calling the REST API directly).

### Owner (concept only)

- `owner: {user_id}`: only that authenticated user controls it.
- `owner: {public_key}` (P-256 authorization key): holder of the private key (your backend) controls it; requests must be signed (`privy-authorization-signature`). Server SDK only.
- `owner_id`: an existing key quorum ID. Do not pass both `owner` and `owner_id`.
- `entity: {id, type: 'user' | 'organization'}`: attribution only, does NOT grant control, permanent.
- No owner: app secret alone can act. Fine for dev; for a real treasury/fee wallet prefer an authorization-key owner + policies (see signers/policies skill: https://docs.privy.io/controls/authorization-keys/owners/overview.md).

## REST API auth

Base URL `https://api.privy.io` (HTTPS only). Every request needs both headers:
- `Authorization: Basic base64(PRIVY_APP_ID:PRIVY_APP_SECRET)`
- `privy-app-id: <PRIVY_APP_ID>`

```ts
const auth = Buffer.from(`${process.env.PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`).toString('base64');
const res = await fetch('https://api.privy.io/v1/wallets', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${auth}`,
    'privy-app-id': process.env.PRIVY_APP_ID ?? '',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({chain_type: 'ethereum'})
});
```

Wallet creation is rate limited (HTTP 429): back off exponentially. Use `idempotency_key` on create to make retries safe.

## Multi-chain

Server `chain_type` values (API enum): `ethereum`, `solana`, `cosmos`, `stellar`, `sui`, `aptos`, `movement`, `tron`, `bitcoin-segwit`, `bitcoin-taproot`, `pearl`, `near`, `ton`, `starknet`, `xrpl`, `spark`.

- One `ethereum` wallet = one address usable on ALL EVM chains. The chain is chosen per request, not per wallet.
- Server: pass CAIP-2 per transaction, e.g. `caip2: 'eip155:11155111'` (Sepolia) plus `chain_id` in the tx. Solana mainnet: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`.
- Client: `config.defaultChain` (single viem chain) + `config.supportedChains` (array). Embedded wallets start on `defaultChain` (or first supported chain). Sending/switching to a chain not in `supportedChains` throws. Empty `supportedChains` or `defaultChain` not in the list makes `PrivyProvider` throw.
- Support tiers: Tier 3 (sign + send, Privy broadcasts): Ethereum/EVM, Solana, Tempo, Tron. Tier 2 (sign tx): Sui, Stellar, Aptos, Near. Tier 1 (sign hashes/messages only): Bitcoin (segwit/taproot inputs), Cosmos, Ton, Starknet, Pearl, other Ed25519/secp256k1. Gas sponsorship, smart wallets, batching, wallet actions need Tier 3; tx policies need Tier 2.
- Default RPCs are rate limited: override for production with `addRpcUrlOverrideToChain(chain, url)` from `@privy-io/chains`.

## External wallets (brief)

```tsx
import {useConnectWallet} from '@privy-io/react-auth';
const {connectWallet} = useConnectWallet({onSuccess: ({wallet}) => console.log(wallet)});
connectWallet(); // optional {description, walletList, walletChainType}
```

EVM-only app: `config.appearance.walletChainType: 'ethereum-only'`. Solana external wallets need `externalWallets: {solana: {connectors: toSolanaWalletConnectors()}}` (from `@privy-io/react-auth/solana`). External wallets are prompted to switch to `defaultChain` on connect but users can switch manually anytime.

## EVM smart wallets (brief)

Enable + pick implementation and paymaster in Dashboard, then `pnpm add permissionless viem` and wrap with `SmartWalletsProvider` from `@privy-io/react-auth/smart-wallets` inside `PrivyProvider`. Smart wallet auto-created once the user has an embedded wallet; `useSmartWallets().client.sendTransaction(...)`. Lazily deployed on first tx. Networks set in Dashboard must also be in `defaultChain`/`supportedChains`. Privy now recommends native gas sponsorship over smart wallets for sponsoring gas. Server-created wallets: see https://docs.privy.io/wallets/gas-and-asset-management/gas/ethereum.md

## Monad notes

- Docs confirm EVM compatibility for Monad: "You can seamlessly use Privy with Ethereum Mainnet, Base, Polygon, Arbitrum, Monad, Berachain, ..." and "Configure Privy with any EVM-compatible chain, like Berachain, Monad, or Story" (https://docs.privy.io/basics/react/advanced/configuring-evm-networks.md).
- Monad is NOT in Privy's default chain list and has no Privy-hosted RPC listed: you must set it in `defaultChain`/`supportedChains`, ideally with your own RPC via `addRpcUrlOverrideToChain`.
- Use the chain from `viem/chains` if the installed viem exports it (verify), else `defineChain` (id, name, nativeCurrency, rpcUrls, blockExplorers required).
- Server side: use `chain_type: 'ethereum'` and per-tx CAIP-2 `eip155:143` (mainnet) / `eip155:10143` (testnet). These IDs come from the project spec, not Privy docs; Privy docs only show the `eip155:<chainId>` pattern. Server-side broadcast on Monad not explicitly confirmed; verify with Privy or test on testnet.
- Custodial wallets: not available on Monad (Tempo, Base, Solana only). Smart wallets / paymaster on Monad: verify in Dashboard network list.

```ts
import {defineChain} from 'viem';

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {name: 'Monad', symbol: 'MON', decimals: 18},
  rpcUrls: {default: {http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? '']}},
  blockExplorers: {default: {name: 'Explorer', url: process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ?? ''}}
});
// config={{ defaultChain: monadTestnet, supportedChains: [monadTestnet] }}
```

## Gotchas

- Store wallet `id` server-side; Node/REST calls take the ID, not the address.
- `PRIVY_APP_SECRET` server-only. Only `NEXT_PUBLIC_PRIVY_APP_ID` (and client ID) go to the browser.
- Auto-create skips headless/whitelabel login flows.
- Only one policy per wallet currently (`policy_ids`).
- `external_id` on create: unique per app, URL-safe, max 64 chars, write-once. `display_name` max 100 chars, editable.

## Source pages

- https://docs.privy.io/wallets/overview.md
- https://docs.privy.io/wallets/overview/types.md
- https://docs.privy.io/wallets/overview/chains.md
- https://docs.privy.io/wallets/overview/embedded.md
- https://docs.privy.io/wallets/overview/flexible-custody.md
- https://docs.privy.io/wallets/wallets/create/create-a-wallet.md
- https://docs.privy.io/wallets/wallets/get-a-wallet/get-connected-wallet.md
- https://docs.privy.io/wallets/wallets/get-a-wallet/get-wallet-by-id.md
- https://docs.privy.io/wallets/wallets/get-a-wallet/get-all-wallets.md
- https://docs.privy.io/wallets/wallets/import-a-wallet/private-key.md
- https://docs.privy.io/wallets/using-wallets/ui-components.md
- https://docs.privy.io/wallets/using-wallets/ethereum/switch-chain.md
- https://docs.privy.io/wallets/custodial-wallets/overview.md
- https://docs.privy.io/wallets/custodial-wallets/create-custodial-wallet.md
- https://docs.privy.io/wallets/global-wallets/overview.md
- https://docs.privy.io/wallets/using-wallets/evm-smart-wallets/overview.md
- https://docs.privy.io/wallets/using-wallets/evm-smart-wallets/setup/configuring-sdk.md
- https://docs.privy.io/wallets/connectors/overview.md
- https://docs.privy.io/wallets/connectors/usage/connecting-external-wallets.md
- https://docs.privy.io/wallets/connectors/setup/configuring-external-connector-chains.md
- https://docs.privy.io/basics/react/installation.md
- https://docs.privy.io/basics/react/setup.md
- https://docs.privy.io/basics/react/advanced/automatic-wallet-creation.md
- https://docs.privy.io/basics/react/advanced/configuring-evm-networks.md
- https://docs.privy.io/basics/nodeJS/installation.md
- https://docs.privy.io/basics/nodeJS/setup.md
- https://docs.privy.io/basics/nodeJS/quickstart.md
- https://docs.privy.io/basics/rest-api/setup.md
- https://docs.privy.io/basics/rest-api/quickstart.md
- https://docs.privy.io/api-reference/wallets/create.md
- https://docs.privy.io/api-reference/wallets/get.md
- https://docs.privy.io/api-reference/wallets/get-all.md
- https://docs.privy.io/api-reference/wallets/get-by-address.md
