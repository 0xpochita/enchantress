---
name: privy-earn
description: Privy Earn (yield vaults) for enchantress. Covers depositing into and withdrawing from Morpho, Aave and Veda vaults through Privy's single earn API, reading positions and vault details (APY, TVL, liquidity), claiming reward incentives, revenue sharing / performance fees (monetization), Aave fee collection, earn policies, earn deposit automations, and earn webhooks (wallet_action.earn_deposit.*, earn_withdraw.*). Load when the task mentions earn, yield, vault, vault_id, APY, ERC-4626, Morpho, Aave, Veda, Kamino, deposit into vault, withdraw from vault, assets_in_vault, performance fee, revenue share, admin wallet, fee wrapper, monetization, treasury management, or Earn on Monad.
---

# Privy Earn

Server-side wallet action API that deposits a Privy wallet's balance into a yield vault, withdraws it with accrued yield, and reads positions in real time. Privy handles approvals, vault contract calls, signing and broadcasting. Your app can keep a share of the yield as a performance fee paid to an admin wallet.

There is no React hook for earn actions in the docs. Call earn from a trusted server (Next.js Route Handler / Server Action) with `@privy-io/node` or REST. The only client-side piece is `useWalletActions().getAction(walletId, actionId)` from `@privy-io/react-auth` to poll a wallet action's status.

## Access and setup (read first)

- Configure in Privy Dashboard: **Wallet infrastructure > Earn**. Prereqs: embedded wallets configured, app ID + app secret, webhook endpoint (recommended).
- **Self-serve** vaults in the Dashboard:
  - Morpho: Sentora PathUSD (PathUSD on Tempo), Gauntlet USDC Prime (USDC on Base), Steakhouse Prime Instant (USDC on Base). Fee 0-50%.
  - Aave: **Aave USDC on Base** only. Fee 0-100%.
- **Sales-gated** (sales@privy.io): any other Morpho v2 / Aave / Veda / Kamino vault, tokenized money market funds (TMMFs), other chains, Morpho fee above 50%. Docs: "Contact sales@privy.io to enable additional Veda, Aave, Morpho, and Kamino vaults from any curator, on any chain."
- Not marked Enterprise-only, no waitlist. But **earn webhooks in production require the Enterprise plan** ("Webhooks can be tested at no cost in development environments. To enable webhooks in production, upgrade to the Enterprise plan").
- After setup copy the `vault_id`. Every deposit/withdraw/position/details call needs it.
- Admin wallet: receives fees, must be able to sign, **cannot be reassigned after creation**. Privy-generated admin wallets have no owner and are authorized by the app secret alone: assign an authorization key before production.
- Gas: if gas sponsorship is enabled, earn deposit, withdraw and incentive claim (and fee collect) are sponsored by default, no extra params.
- Starter template (Next.js): https://github.com/privy-io/examples/tree/main/examples/privy-next-yield-demo
- UX requirement from docs: tell users yield comes from a third-party fund/protocol independent of the wallet provider; the user must explicitly direct the deposit.

## Key concepts

- ERC-4626 shares: deposit converts assets to shares at the current share price; share price rises as yield accrues. No claiming/compounding needed. Shares are ERC-20 and transferable.
- Endpoints are namespaced `/earn/ethereum/...` for **every** EVM chain, not just mainnet. Privy routes by the vault's configured chain.
- Every action is async: response `status: "pending"`, then terminal `succeeded` | `rejected` (nothing broadcast, safe to retry: insufficient balance, policy, Veda share lock) | `failed` (broadcast and reverted; inspect `steps`).
- Amounts: pass exactly one of `amount` (decimal string, e.g. `"1.5"`) or `raw_amount` (base units, e.g. `"1500000"`).
- Wallets with an `owner_id` need an authorization signature (`privy-authorization-signature` header, or `authorization_context` in the Node SDK).
- Optional body fields per OpenAPI: `reference_id` (1-64 chars, unique per app) and `nonce` (>= 24 chars, anti-replay for signed requests).

## Endpoints

Guide pages show `https://api.privy.io/api/v1/...`; the OpenAPI spec uses server `https://api.privy.io` with paths `/v1/...` (same as other Privy wallet APIs). Prefer the Node SDK; if using REST verify the base path in docs.

| Action | Method + path | Node SDK |
| - | - | - |
| Deposit | `POST /v1/wallets/{wallet_id}/earn/ethereum/deposit` | `privy.wallets().earn().ethereum().deposit(walletId, {...})` |
| Withdraw | `POST /v1/wallets/{wallet_id}/earn/ethereum/withdraw` | `privy.wallets().earn().ethereum().withdraw(walletId, {...})` |
| Claim incentives | `POST /v1/wallets/{wallet_id}/earn/ethereum/incentive/claim` body `{chain}` | `privy.wallets().earn().ethereum().incentive().claim(walletId, {chain})` |
| Get incentive rewards | `GET /v1/wallets/{wallet_id}/earn/ethereum/incentive/claim` | not shown in docs |
| Position | `GET /v1/wallets/{wallet_id}/earn/ethereum/vaults?vault_id=...` | not shown in docs |
| Vault details | `GET /v1/earn/ethereum/vaults/{vault_id}` | not shown in docs |
| Collect fees (Aave only) | `POST /v1/wallets/{admin_wallet_id}/earn/ethereum/fees/collect` body `{vault_id}` | not shown in docs |
| Action status | `GET /v1/wallets/{wallet_id}/actions/{action_id}?include=steps` | React: `useWalletActions().getAction` |

Auth for REST: headers `privy-app-id` + `Authorization: Basic base64(appId:appSecret)`.

## Code: deposit / withdraw (server, Node SDK)

```ts
// app/api/earn/deposit/route.ts
import { PrivyClient } from '@privy-io/node';

const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

export async function POST(req: Request): Promise<Response> {
  const { walletId, amount } = (await req.json()) as { walletId: string; amount: string };
  // TODO: verify the caller owns walletId (auth token) before acting.
  const action = await privy.wallets().earn().ethereum().deposit(walletId, {
    vault_id: process.env.PRIVY_EARN_VAULT_ID!,
    amount, // or raw_amount, never both
    // Only for wallets with an owner_id:
    authorization_context: {
      authorization_private_keys: [process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY!],
    },
  });
  // action.status === 'pending'; action.share_amount === null until succeeded
  return Response.json({ actionId: action.id, status: action.status });
}
```

Withdraw is identical with `.withdraw(walletId, { vault_id, amount | raw_amount, authorization_context })`, returning an `earn_withdraw` action. Full exit: read position, pass `assets_in_vault` as `raw_amount` (yield accrued in between stays as residual shares). Check `available_liquidity_usd` before large withdrawals (may partially fill or fail).

Deposit gotchas: wallet must hold the full amount of the vault's underlying token on the vault's chain (check balance first). Shares are split between depositor and admin wallet per the configured fee.

## Code: read position and vault details (server, REST)

```ts
type EarnPosition = {
  asset: { address: string; symbol: string; decimals: number };
  total_deposited: string; // base units
  total_withdrawn: string;
  assets_in_vault: string; // current redeemable value incl. yield -> show as balance
  shares_in_vault: string;
};

type VaultDetails = {
  id: string;
  name: string;
  provider: 'morpho' | 'aave' | 'veda';
  vault_address: string;
  asset: { address: string; symbol: string; decimals: number };
  caip2: string;
  user_apy: number | null; // basis points, 500 = 5%
  app_apy: number | null; // your app's share, bps
  tvl_usd: number | null;
  available_liquidity_usd: number | null; // always null for Veda
  admin_wallet_id: string;
  admin_wallet_address: string;
  total_rewards_apr?: number; // Morpho only, bps
  available_fees?: string; // Aave only, base units
};

const PRIVY_API = 'https://api.privy.io/v1'; // verify base path, see Endpoints note

function privyHeaders(): HeadersInit {
  const appId = process.env.PRIVY_APP_ID!;
  const basic = Buffer.from(`${appId}:${process.env.PRIVY_APP_SECRET!}`).toString('base64');
  return { 'privy-app-id': appId, Authorization: `Basic ${basic}` };
}

export async function getPosition(walletId: string, vaultId: string): Promise<EarnPosition> {
  const url = `${PRIVY_API}/wallets/${walletId}/earn/ethereum/vaults?vault_id=${encodeURIComponent(vaultId)}`;
  const res = await fetch(url, { headers: privyHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`Privy position ${res.status}`);
  return (await res.json()) as EarnPosition;
}

export async function getVault(vaultId: string): Promise<VaultDetails> {
  const res = await fetch(`${PRIVY_API}/earn/ethereum/vaults/${vaultId}`, {
    headers: privyHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Privy vault ${res.status}`);
  return (await res.json()) as VaultDetails;
}

// earned = assets_in_vault - (total_deposited - total_withdrawn), all base units
export function earnedYield(p: EarnPosition): bigint {
  return BigInt(p.assets_in_vault) - (BigInt(p.total_deposited) - BigInt(p.total_withdrawn));
}
```

Divide base units by `10 ** decimals` only for display. Render `null` APY/TVL as a fallback, not `0`.

## Webhooks (deposit/withdraw status)

Subscribe in Dashboard **Configuration > Webhooks**. Events (each has `.created`, `.succeeded`, `.rejected`, `.failed`):

- `wallet_action.earn_deposit.*`
- `wallet_action.earn_withdraw.*`
- `wallet_action.earn_incentive_claim.*`
- `wallet_action.earn_fee_collect.*`

Patterns: on `earn_deposit.succeeded` re-fetch position; on `earn_withdraw.succeeded` notify user (payload includes `wallet_id` and `vault_id`); on `failed` call get wallet action with `?include=steps`. Payload schema and signature verification: verify in docs https://docs.privy.io/api-reference/webhooks/overview.md. Production webhooks need Enterprise; otherwise poll the action.

## Monetization (revenue sharing)

Fee is a performance fee on yield, set at vault setup (not per deposit). Users keep principal and the rest of the yield.

| Provider | Max fee | How it reaches the admin wallet |
| - | - | - |
| Morpho | 50% (self-serve) | Accrues as vault shares in the admin wallet; redeem with `withdraw` |
| Aave | 100% | Accumulates in vault; read `available_fees`, then `fees/collect` with the admin wallet (collects all, no partial) |
| Veda | by agreement | Veda pays out on a schedule; no app action |

The Monetization page also lists swap and cross-chain transfer developer fees (early access, sales-gated). Fees can be zero.

## Treasury management (brief)

Account-level Dashboard workspace (not app-specific) for Finance/Ops: maker-checker m-of-n approvals, transfer limits, allowlists, monitoring, "Earn yield 24/7 on idle capital". Not an API for end-user yield. Supported chains: Ethereum, Base, Arbitrum, Polygon, Tempo, Robinhood Chain, Solana, Tron (+ testnets). **Monad is not listed.**

## Monad notes

- No earn page, provider page, API reference or the Treasury chain list mentions Monad, `eip155:143` or `eip155:10143`.
- Documented chains: self-serve vaults on **Base** and **Tempo**; example responses `eip155:8453` / `eip155:1`; Aave: "Privy deploys Aave vaults on Ethereum, Base, Optimism, Polygon, and Arbitrum"; Veda: "Ethereum, Base, Tempo, Arbitrum, Optimism, and Linea"; incentive claim `chain`: "'tempo', 'ethereum', 'base', 'arbitrum', 'polygon', 'solana', and more".
- Only opening: "Contact sales@privy.io to enable additional Veda, Aave, Morpho, and Kamino vaults from any curator, on any chain."
- **Monad support for Earn is not confirmed in docs; verify in dashboard or with Privy (sales@privy.io).** Plan a fallback: run Earn on Base, or integrate a Monad ERC-4626 vault directly with low-level `eth_sendTransaction` (no Privy revenue share, policies must use RPC methods, not `earn_*`).

## References

- `references/providers-policies-automation.md`: read when choosing a provider (Morpho/Aave/Veda quirks, Veda share lock), restricting earn with policies (`earn_deposit` / `earn_withdraw` rules), auto-depositing incoming funds (wallet automations), or using DIY yield recipes (Kamino, Ethena, Sky, Morpho borrow).

## Source pages

- https://docs.privy.io/financial-flows/earn.md
- https://docs.privy.io/wallets/actions/earn/overview.md
- https://docs.privy.io/wallets/actions/earn/setup.md
- https://docs.privy.io/wallets/actions/earn/revenue-sharing.md
- https://docs.privy.io/wallets/actions/earn/policies.md
- https://docs.privy.io/wallets/actions/earn/deposit.md
- https://docs.privy.io/wallets/actions/earn/withdraw.md
- https://docs.privy.io/wallets/actions/earn/claim.md
- https://docs.privy.io/wallets/actions/earn/collect-fees.md
- https://docs.privy.io/wallets/actions/earn/get-vault-position.md
- https://docs.privy.io/wallets/actions/earn/get-vault-details.md
- https://docs.privy.io/wallets/actions/earn/webhooks.md
- https://docs.privy.io/wallets/actions/earn/providers/morpho.md
- https://docs.privy.io/wallets/actions/earn/providers/aave.md
- https://docs.privy.io/wallets/actions/earn/providers/veda.md
- https://docs.privy.io/wallets/automations/earn-deposits.md
- https://docs.privy.io/wallets/actions/overview.md
- https://docs.privy.io/wallets/actions/status.md
- https://docs.privy.io/api-reference/wallets/earn/deposit.md (also withdraw, incentive-claim, get-incentive-rewards, get-vault-details, get-position, fees-collect)
- https://docs.privy.io/financial-flows/monetization.md
- https://docs.privy.io/treasury-management/overview.md
- https://docs.privy.io/treasury-management/supported-chains-and-assets.md
- https://docs.privy.io/recipes/yield/overview.md
