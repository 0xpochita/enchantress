<p align="center">
  <img src="apps/public/logo/mark-light.png" alt="Enchantress" width="120" />
</p>

<h1 align="center">Enchantress</h1>

<p align="center">
  Yield indexes for any token on any chain. Pick a basket, deposit once, and every slice lands in the best vault on Monad, inside your own wallet.
</p>

<p align="center">
  <a href="https://github.com/0xpochita/enchantress"><img src="https://img.shields.io/badge/SOURCE-GITHUB-000000?style=flat-square&labelColor=555555&logo=github&logoColor=white" alt="Source on GitHub" /></a>
  <a href="https://monad.xyz"><img src="https://img.shields.io/badge/NETWORK-MONAD%20MAINNET-836EF9?style=flat-square&labelColor=555555" alt="Monad mainnet" /></a>
  <a href="https://privy.io"><img src="https://img.shields.io/badge/WALLETS-PRIVY-010110?style=flat-square&labelColor=555555" alt="Privy" /></a>
  <a href="https://aurora.dev"><img src="https://img.shields.io/badge/CROSS%20CHAIN-AURORA%20INTENTS-70D44B?style=flat-square&labelColor=555555" alt="Aurora Intents" /></a>
</p>

---

Enchantress is a DeFi yield index app on **Monad mainnet**. An index is a recipe: a set of assets with target weights, such as a stablecoin basket or a MON and USDC mix. When you deposit, Enchantress routes each slice to the best eligible vault across **Aave V3**, **Neverland** and **Morpho**, swaps through **Uniswap v3** where needed, and supplies everything in one flow. Funds can start on Monad or on Base, Ethereum and Arbitrum through **Aurora Intents**.

> **There is no vault, no share token, no NAV and no redemption queue.** When you subscribe to a yield index, your own Privy embedded wallet starts following those weights.
>
> - Every position is an aToken or a vault share held by **your** wallet
> - The app signs through a **Privy session signer** whose policy only allows approve, swap, supply and withdraw back to your own address
> - Delete our backend and your positions are still in your wallet, redeemable from each protocol directly

<img width="1710" alt="Enchantress landing page" src=".github/assets/landing.jpg" />

---

## What Makes Enchantress Special

### Who This Is For

Meet Dimas. He holds USDC on Base and some ETH on Arbitrum. He keeps hearing that Monad lending markets pay well, so one evening he tries to get in.

He needs a bridge he trusts, then gas on a chain he has never used, then a list of which vaults are live. Aave V3 pays one rate for USDC, Neverland another, Morpho a third. He wants a mix, not one bet, so he swaps three times, approves three times and supplies three times. A week later the best rate has moved and he would have to do it all again. He stops at the bridge.

Dimas's problem is not a missing protocol. It is that there is no single place where a diversified Monad yield position is **one decision**: pick the basket, pick the token you already have, sign once.

---

### The Problem

Earning yield on Monad today means doing every step by hand.

- **Liquidity is scattered**: 329 chains hold DeFi TVL (DefiLlama, Oct 2026). The money users have is rarely on the chain where new yield appears
- **Bridging is a separate product**: a different app, a different fee model, a different failure mode, and historically the riskiest step in crypto
- **Rates differ for the same asset**: Aave V3, Neverland and Morpho pay different APYs for USDC on the same chain, and those numbers move daily
- **A basket is many transactions**: every slice needs a swap, an approval and a supply, each one signed separately
- **Most users quit before the first deposit**: 68% of wallets that connect to a DeFi app never make a single transaction

Vault products solve the clicks by taking custody. Your funds move into someone else's contract, you get a share token, and exiting depends on their NAV and their redemption queue.

**How might we give anyone a diversified Monad yield position from the token they already hold, in one signature, without ever taking custody of their funds?**

---

### The Solution

Enchantress answers with five pieces, each doing a job the others cannot.

**1. Indexes as recipes, not vaults**: an index is a row of assets and weights in Postgres. It holds no funds. A deposit turns the recipe into positions inside the depositor's own wallet, and a withdraw unwinds them from each protocol directly.

**2. Best venue per asset, decided live**: each asset goes to the highest APY vault that passes a **$250k TVL safety floor**, read from Aave and Neverland reserve data and the Morpho API. Creators can also pin a protocol per asset, including smaller vaults like Morpho shown with their TVL.

**3. Privy embedded wallets with a policy locked session signer**: login with email or Google creates a wallet. The user grants one session signer, and a **Privy policy** limits it to approve, Uniswap `exactInputSingle`, Aave `supply` / `withdraw` and ERC-4626 `deposit` / `redeem` on allowlisted contracts, where every receiver must be `{{wallet.address}}`. It can never send tokens anywhere else.

**4. Aurora Intents for any chain in**: pick USDC on Base, Ethereum or Arbitrum. Aurora's 1Click API returns a reserved quote and a unique deposit address, the user signs **one transfer** on the origin chain, and solvers deliver USDC to the user's Monad wallet.

**5. A server runner that finishes the job**: once funds land, a leased state machine plans every swap and supply, sends each step through Privy, waits for receipts, retries transient failures, and can **resume** a deposit that stopped halfway without repeating confirmed steps.

---

## Index Setups

An index is configured, not deployed. Enchantress ships every shape below in the same tables.

| | **Featured index** | **Community index** | **Pinned venue** | **Auto venue** |
|---|---|---|---|---|
| **Example** | `mon-maxi` (WMON 60% / USDC 40%) | `monad-blend` (USDC / WETH / WMON) | USDC pinned to Morpho | WMON routed to the best APY |
| **Created by** | seed script | any logged in user from `/create` | the creator, per asset | the router, per deposit |
| **Listed** | always | once it holds deposits | with its index | with its index |
| **Venue choice** | best eligible APY | best APY or pinned | fixed `venue_id` | live `findMarket` |
| **TVL floor** | applies | applies | creator may go below it, TVL shown | applies |
| **Cost to create** | zero gas | zero gas, optional first deposit | zero gas | zero gas |

### Why each shape earns its place

Featured indexes give a new user a safe first click. Community indexes turn every creator into a distribution channel. Pinned venues let a creator express a view, such as "Morpho for USDC", while auto venues keep everyone else on the best rate without rebalancing by hand.

### Decision flow when creating an index

```
POST /api/indexes  { name, allocations[{ assetSymbol, weightBps, venueId? }] }
  ├─ validate: 1 to 6 unique assets, weights sum to 10,000 bps, name 3 to 40 chars
  ├─ every pinned venue exists and supports its asset
  ├─ probe liquidity: route 100 USDC into every asset through Uniswap v3
  │    └─ refused if any asset cannot be bought on Monad (no index that fails on deposit)
  ├─ insert index + allocations (is_featured = false)
  └─ optional first deposit → a normal deposit execution, labelled "Created" in activity
```

---

## Features

- **One Click Index Deposit**: a whole basket of swaps, approvals and supplies from a single confirmation
- **Deposit From Any Chain**: USDC and other catalog tokens on Base, Ethereum and Arbitrum through Aurora Intents, landing as USDC on Monad
- **Same Chain Fast Path**: USDC and USDT0 already on Monad skip the bridge entirely
- **Best Venue Routing**: live APY across Aave V3, Neverland and Morpho with a configurable TVL floor
- **Pinned Venues**: creators choose the protocol per asset, including small vaults shown with their TVL
- **Hub Token Swaps**: when no direct pool exists (USDT0 to WETH), the plan routes through USDC, USDT0 or WMON in two hops and keeps the better output
- **Oracle Guarded Quotes**: every Uniswap quote is checked against the Aave oracle price and refused past a 5% deviation
- **Resilient Quoting**: flaky RPC quote calls retry three times with backoff before a route is declared missing
- **Resume Failed Deposits**: confirmed steps are kept, only the failed step and the ones after it run again
- **Auto Cancel Unfunded Bridges**: a bridge quote that never receives an origin transfer is cancelled after 2 minutes
- **Live Progress Modal**: Sent to Aurora Intents, bridging with the origin chain and token, then every Monad step with its tx hash and an elapsed timer
- **Create Your Own Index**: up to six assets, custom or equal split, optional first deposit
- **Community Listing**: indexes appear on Invest and in the Deposit aggregator once they hold deposits
- **Partial Withdraw**: 25%, 50%, 75% or all, redeemed from each vault back to the user's wallet
- **Portfolio**: live value, earnings, daily snapshots, one transaction history with expandable legs and explorer links
- **Revoke Anytime**: remove the session signer from the portfolio page and the app loses all signing power
- **Email or Google Login**: embedded wallet, no extension, no seed phrase
- **Gas Sponsorship Ready**: Privy sponsored transactions per chain through `NEXT_PUBLIC_SPONSORED_CHAIN_IDS`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, React Compiler), React 19, TypeScript, Tailwind CSS v4 |
| Wallets | Privy `@privy-io/react-auth` 3.46 (embedded wallets, session signers, sponsored sends) |
| Server signing | Privy `@privy-io/node` 0.35 (key quorum, policy, `authorization_context`) |
| Cross chain | Aurora Intents 1Click API (`intents-api.aurora.dev`) |
| Blockchain | Monad mainnet (chainId 143) via viem 2.57 |
| Protocols | Aave V3, Neverland (Aave pool fork), Morpho (ERC-4626), Uniswap v3 SwapRouter02 + QuoterV2 |
| Database | Postgres 17 + Drizzle ORM 0.45 (8 migrations) |
| Data fetching | TanStack Query 5 |
| Validation | Zod 4 |
| Animation | Motion |
| Tests | Node built in test runner (43 unit files) + a Postgres backed repository test |
| Lint / Format | Biome, Husky, commitlint |

---

## Privy Integration

Privy is the wallet, the signer and the permission system. Login is the smallest part of it.

| Component | File | Description |
|---|---|---|
| **Embedded Wallets** | [`WalletProviders.tsx`](apps/src/features/wallet/components/WalletProviders.tsx) | `PrivyProvider` with email and Google login, `createOnLogin: "all-users"`, Monad as default chain with an RPC override, Base / Ethereum / Arbitrum as supported chains |
| **Session Signer Grant** | [`useDelegation.ts`](apps/src/features/wallet/hooks/useDelegation.ts) | `useSigners().addSigners` attaches our key quorum with the vault policy id. `removeSigners` revokes it. Both refresh the server's view of the user |
| **Policy Rules** | [`vault-policy.ts`](apps/src/features/executions/utils/vault-policy.ts) | Every rule is `eth_sendTransaction` ALLOW on chain 143 with value `0x0`: approve only to venues and the router, Aave `onBehalfOf` / `to`, vault `receiver` / `owner` and swap `recipient` all pinned to `{{wallet.address}}` |
| **Signer Setup** | [`setup-privy-signer.ts`](apps/scripts/setup-privy-signer.ts) | Generates a P-256 key pair, creates the key quorum and the policy, and writes the ids to `.env` |
| **Server Sends** | [`privy-sender.ts`](apps/src/features/executions/services/privy-sender.ts) | `wallets().ethereum().sendTransaction` with `caip2: "eip155:143"`, `authorization_context`, optional `sponsor`, and an idempotency key of `execution:position:attempt` |
| **Receipt Tracking** | [`privy-sender.ts`](apps/src/features/executions/services/privy-sender.ts) | `transactions().get(id)` maps broadcasted, confirmed, reverted, failed and replaced into step status |
| **Origin Chain Transfer** | [`useBridgeDeposit.ts`](apps/src/features/bridge/hooks/useBridgeDeposit.ts) | `useSendTransaction` signs the one transfer to the Aurora deposit address on Base, Ethereum or Arbitrum, sponsored where enabled |
| **Auth and User Sync** | [`current-user.ts`](apps/src/features/wallet/services/current-user.ts) | `verifyAccessToken` on every API call, then reads linked accounts to find the embedded wallet and its `delegated` flag |
| **Revoke UI** | [`RevokeAccess.tsx`](apps/src/components/(main)/portfolio/RevokeAccess.tsx) | One click to take signing power back |

### Privy surface in use

| API | Call | Purpose |
|---|---|---|
| React SDK | `PrivyProvider` + `createOnLogin` | A Monad wallet for every user, no extension |
| React SDK | `useWallets`, `usePrivy().getAccessToken` | Wallet address and bearer token for the API |
| React SDK | `useSigners().addSigners / removeSigners` | Grant and revoke the policy locked session signer |
| React SDK | `useSendTransaction` with `sponsor` | The single origin chain transfer into Aurora |
| Node SDK | `keyQuorums().create`, `policies().create` | One time setup of the signer and its rules |
| Node SDK | `utils().auth().verifyAccessToken`, `users()._get` | Authenticate requests and read delegation state |
| Node SDK | `wallets().ethereum().sendTransaction` | Every approve, swap, supply, withdraw and redeem |
| Node SDK | `transactions().get` | Confirm each step before the next one runs |

---

## Aurora Intents Integration

| Component | File | Description |
|---|---|---|
| **API Client** | [`aurora-client.ts`](apps/src/features/bridge/services/aurora-client.ts) | Tokens, quote, deposit submit and status endpoints, with retry on 429 that honours `Retry-After` |
| **Token Catalog** | [`bridge-catalog.ts`](apps/src/features/bridge/services/bridge-catalog.ts) | Aurora tokens cached for 5 minutes, filtered to Base / Ethereum / Arbitrum origins, with Monad USDC as the destination asset |
| **Quotes** | [`bridge-quote.ts`](apps/src/features/bridge/services/bridge-quote.ts) | `dry: true` previews for the form, then a reserved quote with a 10 minute deadline that must return a deposit address |
| **Deposit Start** | [`create-bridge-deposit.ts`](apps/src/features/bridge/services/create-bridge-deposit.ts) | Checks the origin balance, reserves the quote and stores a `bridging` execution with the deposit address, memo and deadline |
| **Lifecycle** | [`bridge-lifecycle.ts`](apps/src/features/bridge/services/bridge-lifecycle.ts) | Notifies Aurora of the origin tx, polls status, and on SUCCESS plans the Monad steps from the landed amount |
| **Status Mapping** | [`bridge-transition.ts`](apps/src/features/bridge/utils/bridge-transition.ts) | SUCCESS lands, REFUNDED refunds, FAILED fails, an expired unfunded quote fails, everything else waits |
| **Minimum Amounts** | [`minimum.ts`](apps/src/features/bridge/utils/minimum.ts) | Turns Aurora's minimum error into "Minimum X USDC" next to the amount input |

### Aurora surface in use

| Endpoint | Purpose |
|---|---|
| `GET /api/tokens` | Which origin tokens can be deposited |
| `POST /api/quote` (`dry: true`) | Live preview of what lands on Monad |
| `POST /api/quote` (`dry: false`) | Reserved quote with a unique deposit address and deadline |
| `POST /api/deposit/submit` | Tell Aurora which origin tx funded the address |
| `GET /api/status` | Poll until SUCCESS, REFUNDED or FAILED |

Quotes use `EXACT_INPUT`, 100 bps slippage, and both `recipient` and `refundTo` set to the user's own wallet, so a failed intent refunds on the origin chain to the same person who sent it.

---

## Architecture

### System Flow

```mermaid
sequenceDiagram
    participant User
    participant App as Enchantress API
    participant Aurora as Aurora Intents
    participant Runner as Execution Runner
    participant Privy as Privy (session signer)
    participant Wallet as User Monad Wallet
    participant Uni as Uniswap v3
    participant Vaults as Aave V3 / Neverland / Morpho
    participant DB as Postgres

    User->>App: deposit(index, token, chain, amount)
    App->>Aurora: reserved quote
    Aurora-->>App: deposit address + deadline
    App->>DB: execution (bridging)
    User->>Aurora: one signed transfer on the origin chain
    App->>Aurora: deposit/submit(txHash)

    loop until SUCCESS
      Runner->>Aurora: status
    end
    Aurora-->>Wallet: USDC lands on Monad
    Runner->>DB: plan steps (executing)

    loop each step
      Runner->>Privy: sendTransaction (policy checked)
      Privy->>Wallet: approve / swap / supply
      Wallet->>Uni: exactInputSingle (recipient = self)
      Wallet->>Vaults: supply / deposit (onBehalfOf = self)
      Runner->>Privy: transactions().get
      Runner->>DB: step confirmed
    end

    Runner->>DB: ledger + position lots (succeeded)
```

### Execution State Machine

```mermaid
graph TD
    START["deposit / withdraw request"] --> BR["bridging<br/>waiting for Aurora"]
    START --> EX["executing<br/>runner sends steps"]
    BR --> EX
    BR --> RF["refunded"]
    BR --> CA["cancelled<br/>unfunded after 2 min"]
    BR --> FA["failed"]
    EX --> SU["succeeded"]
    EX --> FA
    FA -->|resume| EX

    style START fill:#2563eb,color:#fff
    style SU fill:#16a34a,color:#fff
    style FA fill:#dc2626,color:#fff
    style RF fill:#f59e0b,color:#fff
    style CA fill:#64748b,color:#fff
```

One user can have at most one active execution, enforced by a partial unique index. The runner takes a 60 second lease per execution, so a crashed worker never double sends, and Privy idempotency keys make a retried send safe.

---

## Setup

### Requirements

- Node 24, pnpm 10
- Docker (for Postgres)
- A Privy app with embedded wallets enabled
- An Aurora Intents API key (optional; without it the deposit form offers Monad USDC and USDT0 only)

### App Setup

```bash
# Clone the repository
git clone https://github.com/0xpochita/enchantress.git
cd enchantress/apps

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env:
#   NEXT_PUBLIC_PRIVY_APP_ID, NEXT_PUBLIC_PRIVY_CLIENT_ID, PRIVY_APP_SECRET
#   NEXT_PUBLIC_MONAD_RPC_URL, MONAD_RPC_URL
#   DATABASE_URL=postgres://enchantress:enchantress@localhost:5432/enchantress
#   AURORA_INTENTS_API_KEY
#   ETHEREUM_RPC_URL, BASE_RPC_URL, ARBITRUM_RPC_URL
#   CRON_SECRET
#   VENUE_MIN_TVL_USD=250000
#   NEXT_PUBLIC_SPONSORED_CHAIN_IDS=        (comma separated chain ids, optional)

# Create the session signer key quorum and vault policy (writes three vars to .env)
#   PRIVY_AUTHORIZATION_PRIVATE_KEY, NEXT_PUBLIC_PRIVY_SIGNER_QUORUM_ID, NEXT_PUBLIC_PRIVY_VAULT_POLICY_ID
node --experimental-strip-types scripts/setup-privy-signer.ts

# Start Postgres, migrate and seed the featured indexes
pnpm db:up
pnpm db:migrate
pnpm db:seed

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

```bash
pnpm dev            # Next.js dev server
pnpm build          # production build
pnpm lint           # biome check
pnpm type-check     # next typegen + tsc
pnpm test           # 43 unit test files on the node test runner
pnpm test:db        # repository tests against the docker Postgres
pnpm db:generate    # drizzle migration from schema changes
pnpm db:migrate     # apply migrations
pnpm db:seed        # featured indexes
```

Two cron endpoints keep the system moving, both behind `Bearer CRON_SECRET`: `GET /api/cron/resume-executions` advances stale active executions, and `GET /api/cron/snapshots` writes daily portfolio snapshots.

> **Two traps worth knowing.** Privy policies are evaluated on the raw calldata, so a new venue needs its own rule before the runner can touch it, otherwise every send is rejected. And a reserved Aurora quote expires after 10 minutes, so an origin transfer signed after the deadline is refunded rather than delivered.

---

## How It Works

### Depositor Flow

```
Pick an index → Pick any token on any chain → Sign once → Positions appear in your wallet
```

1. **Pick**: compare every index by blended APY, protocols and TVL on Invest or in the Deposit aggregator
2. **Choose a token**: tokens are sorted by popularity with live balances on Monad, Base, Ethereum and Arbitrum
3. **Review**: the review modal shows where every slice goes, as a tree of protocol, asset, amount and APY
4. **Sign once**: from Monad, nothing else to sign; from another chain, one transfer to the Aurora deposit address
5. **Watch**: the progress modal follows Aurora, then every swap and supply with its tx hash

### Creator Flow

```
Name it → Pick assets and protocols → Set weights → Optional first deposit → Listed
```

1. **Name**: 3 to 40 characters, turned into a unique slug
2. **Assets**: up to six; each goes to the best venue or a protocol the creator pins
3. **Weights**: equal split or custom, always 10,000 bps
4. **Check**: the API routes 100 USDC into every asset and refuses the index if any swap is impossible
5. **List**: the index stays private until it holds deposits, then shows as a community index for everyone

### Runner Flow

```
Lease → Load → Send or settle one step → Release
```

1. **Lease**: claim the execution for 60 seconds so only one worker touches it
2. **Bridge**: while `bridging`, poll Aurora and land the deposit when it succeeds
3. **Plan**: direct slice = approve + supply; swapped slice = approve router + swap (+ second hop) + approve venue + supply
4. **Send**: one step through Privy with an idempotency key, then wait for the receipt
5. **Settle**: record units received, write the ledger and position lots, and move on
6. **Recover**: transient errors retry, permanent errors fail the execution with a readable reason, and the user can resume

### Withdraw Flow

```
Choose 25 / 50 / 75 / 100% → Redeem from each vault → Assets back in your wallet
```

Aave and Neverland positions use `withdraw(to = self)`. Morpho positions use `redeem(receiver = self, owner = self)`. Lots are reduced proportionally so the portfolio stays exact.

### On-Chain Flow

```
User            Origin chain        Aurora Intents        Privy signer          Monad wallet         Vaults
  │                  │                    │                     │                     │                  │
  ├── transfer USDC ─►│── deposit addr ───►│                     │                     │                  │
  │                  │                    ├── USDC on Monad ────┼────────────────────►│                  │
  │                  │                    │                     ├── approve router ──►│                  │
  │                  │                    │                     ├── exactInputSingle ►│ (recipient=self) │
  │                  │                    │                     ├── approve venue ───►│                  │
  │                  │                    │                     ├── supply ──────────►├─────────────────►│ aTokens / shares
  │                  │                    │                     │                     │◄── to self ──────┤
  ◄── portfolio: positions read from the user's own wallet ───────────────────────────────────────────────►
```

---

## Contract Details

### Addresses (Monad mainnet, chainId 143)

**Tokens**

| Token | Address | Decimals | Note |
|---|---|---|---|
| USDC | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` | 6 | Aurora destination asset |
| USDT0 | `0xe7cd86e13AC4309349F30B3435a9d337750fC82D` | 6 | |
| WMON | `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A` | 18 | |
| WETH | `0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242` | 18 | |
| WBTC | `0x0555E30da8f98308EdB960aa94C0Db47230d2B9c` | 8 | |
| AUSD | `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a` | 6 | closed to new indexes |
| cbBTC | `0xd18B7EC58Cdf4876f6AFebd3Ed1730e4Ce10414b` | 8 | closed to new indexes |

**Venues**

| Venue | Contract | Address |
|---|---|---|
| Aave V3 | Pool | `0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef` |
| Aave V3 | Data provider | `0xB65A68B98274ef7D9a60E0C0747dD1BEc3D32fad` |
| Aave V3 | Oracle | `0x0c02b2c2038066C10Eab8fe1D5Cdb73d5a78A1Bf` |
| Neverland | Pool | `0x80F00661b13CC5F6ccd3885bE7b4C9c67545D585` |
| Neverland | Data provider | `0xfd0b6b6F736376F7B99ee989c749007c7757fDba` |
| Neverland | Oracle | `0x94bbA11004B9877d13bb5E1aE29319b6f7bDEdD4` |
| Morpho | USDC vault | `0x802c91d807A8DaCA257c4708ab264B6520964e44` |
| Morpho | USDT0 vault | `0x961a59Fe249b9795FAE7fA35f9E89629689D5278` |
| Morpho | WETH vault | `0xba8424EBBEd6C51bEa6d6D903B8815838E6a0322` |

**Swaps**

| What | Address | Note |
|---|---|---|
| Uniswap v3 SwapRouter02 | `0xfe31f71c1b106eac32f1a19239c9a9a72ddfb900` | only router the policy allows |
| Uniswap v3 QuoterV2 | `0x661e93cca42afacb172121ef892830ca3b70f08d` | fee tiers 100 / 500 / 3000 / 10000 |
| Uniswap v3 Factory | `0x204faca1764b154221e35c0d20abb3c525710498` | pool existence check before quoting |

Enchantress deploys **no contracts**. Every address above belongs to the protocol that operates it, which is the point: there is nothing of ours holding user funds.

### Seeded Indexes

| Index | Allocation |
|---|---|
| `monad-stable` | USDC 50% / USDT0 50% |
| `mon-maxi` | WMON 60% / USDC 40% |
| `eth-yield` | WETH 70% / USDC 30% |
| `blue-chip` | WETH 50% / WMON 25% / USDC 25% |
| `dollar-mix` | USDT0 60% / USDC 40% |

### Key Functions

#### Deposit planning

```
buildDepositPlan(index, depositAsset, amount)  # slices by weight, routes each, returns ordered steps
routeSwaps(from, to, amount)                   # direct pool or a hub (USDC / USDT0 / WMON), best output wins
quoteBestSwap(tokenIn, tokenOut, amount)       # getPool + QuoterV2 per fee tier, 3 retries, oracle deviation guard
findMarket(asset, venues, pinnedVenueId?)      # pinned venue first, otherwise best APY above the TVL floor
```

#### Execution runner

```
advanceExecution(id)        # lease, load, then bridge / send / settle exactly one thing
resumeExecution(id)         # failed → executing, confirmed steps kept
cancelExecution(id)         # only while bridging with no origin tx
staleExecutionIds()         # what the cron endpoint wakes up
```

#### Policy

```
buildVaultPolicyRules()     # approve, swap, supply, withdraw, deposit, redeem; every receiver = {{wallet.address}}
```

#### Database

```
users               # Privy DID, embedded wallet, delegated_at
indexes             # slug, name, creator, is_featured
index_allocations   # asset, weight_bps, optional venue_id
executions          # kind, status, Aurora deposit address / memo / deadline / status, lease
execution_steps     # kind, spender, amounts, Privy tx id, tx hash, attempts
position_lots       # units per user, index, venue and asset
ledger              # every in / out with USD value and tx hash
position_snapshots  # daily portfolio value per index
```

---

## Deployment Checklist

- [x] Privy embedded wallets created on login (email and Google)
- [x] Session signer key quorum + vault policy, scoped to allowlisted contracts and self receivers
- [x] Server side sends through Privy with idempotency keys and receipt tracking
- [x] Grant and revoke signer from the app
- [x] Aurora Intents catalog, dry quotes, reserved quotes with deposit addresses
- [x] **Cross chain deposit**: USDC on Base bridged to Monad and supplied to Neverland and Aave in one flow
- [x] Same chain deposits for USDC and USDT0 on Monad
- [x] Best venue routing across Aave V3, Neverland and Morpho with a TVL floor
- [x] Pinned venues per asset, including small Morpho vaults
- [x] Hub token two hop swaps with oracle guarded quotes
- [x] **Index creation from the browser** with a liquidity probe and optional first deposit
- [x] Community indexes listed once they hold deposits
- [x] Resume failed deposits, auto cancel unfunded bridges
- [x] Partial withdraw from every venue back to the user's wallet
- [x] Portfolio with snapshots, ledger history and explorer links
- [x] Unit tests (43 files) and a Postgres repository test
- [x] Demo video

**One limitation worth naming.** Cross chain deposits depend on Aurora having a live route into Monad. When Aurora cannot quote a pair, the form says so before anything is signed and Monad native deposits keep working.

---

## Hackathon Submission

| | |
|---|---|
| **Event** | Metropolis Hackathon |
| **Bounties** | Privy (beyond authentication), Aurora Intents |
| **Network** | Monad mainnet (chainId 143) |
| **Source** | [github.com/0xpochita/enchantress](https://github.com/0xpochita/enchantress) |

---

## License

No license file has been added yet. All rights reserved until one is.

---

> Bring any token from any chain to Monad's best yield. Enchantress
