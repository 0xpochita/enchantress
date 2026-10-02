---
name: aurora-intents
description: Entry point for any Aurora Intents work in enchantress (cross-chain swaps, cross-chain deposits, cross-chain contract execution, confidential intents). Load first when a task mentions Aurora Intents, Aurora, NEAR Intents, 1Click, intents-api.aurora.dev, Intents Studio, client portal, API key, integrator fee, fees collection, rate limit, 429 Retry-After, support case, deposit address UX, Intents Connect, Intents Deposits, persistent deposit address, Swap Widget, Swap API, confidential swap, or Aurora + Monad; it routes to aurora-intents-connect, aurora-intents-deposits or aurora-intents-swap.
---

# Aurora Intents (router)

Aurora Intents is "the cross-chain execution layer for on-chain applications": move assets, execute actions and access liquidity across chains. All products are powered by NEAR Intents (routing/bridging goes through NEAR Intents / 1Click; integrators never manage bridges or liquidity).
Stack here: Next.js App Router in `apps/`, Privy embedded EVM wallets (see `skills/privy*`), target chain Monad.

## Product map

| Skill | Product | What it is | Use when |
| --- | --- | --- | --- |
| `aurora-intents-connect` | Intents Connect | User signs one intent on the origin chain; an intermediary account (owned by the origin wallet, controlled via NEAR Chain Signatures MPC) runs destination-chain steps. TS SDK `@aurora-is-near/intents-connect`, wallet pkg `@aurora-is-near/intents-connect-wallet`, React provider, widget, REST API. | Execute contract actions on another chain (e.g. deposit into Aave/vault from Solana), bundled flows (swap, stake, borrow), agents/backends doing cross-chain ops. |
| `aurora-intents-deposits` | Intents Deposits | Generate a deposit address; user does a plain transfer; infra detects, routes, optionally swaps and credits the destination. Persistent (reusable, no TTL) addresses, custom actions on arrival (coming soon), widget or API. | Accept deposits/top-ups from any chain/asset into your app or contract. |
| `aurora-intents-swap` | Swap Widget / Swap API / Confidential Swaps | Plug-and-play cross-chain swap UI (iFrame or React SDK) plus the quote/deposit/status Swap API; confidential mode is one quote flag. | Add cross-chain swaps in-app, or build a custom swap UI on the REST API. |

Docs' own guidance: DeFi app or wallet: Swap Widget. Cross-chain deposits/funding: Intents Deposits. Full control over cross-chain execution: Intents Connect.

## Use cases (from docs)

- Cross-chain swaps in your app: Swap Widget.
- Cross-chain deposits (prediction markets, neobanks, RWA onboarding): Intents Deposits.
- Direct deposit into protocols (lending, mint RWAs, vaults): Intents Deposits + Intents Connect.
- Cross-chain yield (stake on another chain, rebalance): Intents Connect.
- Custom multi-step flows (swap -> stake -> borrow, bridge -> vault): Intents Connect API.

## Confidential Intents

- Swap routed through a private shard of NEAR running the NEAR Intents engine.
- Hidden: origin wallet, routing path, link between source and destination. Public: destination tx, destination asset and amount, recipient.
- Live on the Swap API: add `confidentiality: "advanced"` to the quote request body; rest of the flow (deposit address, status polling, refunds, fees) is unchanged. Details in `aurora-intents-swap`.
- Rolling out to confidential deposits and confidential DeFi actions. Intents Deposits lists confidentiality as an optional feature.

## Getting started

### API keys and fees

- Create keys in Intents Studio (https://studio.aurora.dev/) or the Client Portal. Unlimited keys; use separate keys per environment/app (prod, dev, QA) for clean analytics and isolated rate limits.
- The API key is NOT confidential; docs allow it in public-facing code. It goes in the URL path: `https://intents-api.aurora.dev/api/<endpoint>/{apiKey}`. In Next.js a `NEXT_PUBLIC_AURORA_INTENTS_API_KEY` env var is fine.
- Deposits: permissionless, keys issued immediately, no allowlist.
- Fees: integrator fee set per key (API keys tab, Edit fees). Max 100 bps. Split 60% integrator / 40% Aurora, with Aurora floor: `auroraFee = max(2 bps, 40% of integrator fee)`.

| Integrator fee | Integrator share | Aurora fee |
| --- | --- | --- |
| 0 bps | 0 bps | 2 bps |
| 5 bps | 3 bps | 2 bps |
| 10 bps | 6 bps | 4 bps |
| 20 bps | 12 bps | 8 bps |

- Reports: Widget Studio -> Export code -> Reports -> Download CSV report (all swaps per key).

### Client Portal (https://portal.intents.aurora.dev/)

Org-scoped. Home (volume, swaps, fees earned, active keys; last 30 days default), Analytics (overview, volume by API key, user analytics: unique/new/returning wallets, retention, CSV export), API keys (create, configure fee rules), Organization (invite members, "Contact Aurora team"), Audit log. Deposit health monitoring: not yet available.

### Fees Collection

Configured by Aurora on request (not self-serve). Provide target chain, target asset (USDC recommended), recipient address, optional custom threshold. Fees accrue, convert to the target asset and are withdrawn to the recipient once they reach the threshold (default $1,000 USD).

### Rate limits

Per API key, per endpoint. Both windows enforced, fixed and clock-aligned: 100 requests / 10 s and 2000 requests / 1 h. Over limit: HTTP `429` + `Retry-After` (seconds). Rejected requests still count toward the hourly quota. Rules: honour `Retry-After`, exponential backoff with jitter, cache token list (refresh every few minutes), poll status every 5-10 s, debounce quotes (auto-refresh >= 10 s). Higher limits: contact@aurora.dev with key and expected volume.

```ts
// Typed port of the docs' fetchWithRetry (rate-limits page).
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  maxAttempts = 3,
): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= maxAttempts) return res;
    const retryAfter = Number(res.headers.get("Retry-After")) || 1;
    const jitter = Math.random() * 500;
    await new Promise((r) => setTimeout(r, retryAfter * 1000 + jitter));
  }
}

const quoteRequest: Record<string, unknown> = {}; // fields: see aurora-intents-swap
const apiKey = process.env.NEXT_PUBLIC_AURORA_INTENTS_API_KEY;
const res = await fetchWithRetry(`https://intents-api.aurora.dev/api/quote/${apiKey}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(quoteRequest),
});
```

### UX recommendations (deposit addresses)

An Intents deposit address supports only a subset of assets on its network; unsupported sends may be unrecoverable. Never show the address or QR code without its transfer requirements.
- Flow: show source network -> state "N assets supported" -> user picks asset -> show address + QR tied to that network/asset -> "Transfer requirements" block directly below (min deposit, restrictions, loss-of-funds warning) plus fees and estimated time.
- Copy: "Send only USDC from Monad to this address.", never "Send funds to this address." Keep requirement text data-driven off the selected network/asset.
- Not in tooltips, FAQs or secondary screens. The docs page includes a copyable AUDIT/BUILD prompt for deposit screens.

### Handling support cases

Submit every user issue via https://aurora.dev/intents-support (single pipeline; do not DM team members or open the same case in multiple channels). Include tx hash(es) and deposit address; add error message, expected vs actual, route and amount if known. Never include keys, seed phrases or credentials.

## Monad support

All three supported-chains pages list Monad as "✅ Supported" for both SOURCE and DESTINATION:
- Intents Connect: "Monad ✅ Supported ✅ Supported" (https://docs.intents.aurora.dev/intents-connect/supported-chains.md). Note several non-EVM chains there are source-only or coming soon; Monad is not.
- Intents Deposits: "Monad ✅ Supported ✅ Supported" (https://docs.intents.aurora.dev/intents-deposits/supported-chains.md).
- Swap: "Monad ✅ Supported ✅ Supported" (https://docs.intents.aurora.dev/intents-swap/supported-chains.md).

Other Monad references in docs:
- Intents Connect wallet package EVM networks: "Ethereum, Arbitrum, Base, BSC, Polygon, Optimism, Avalanche, Gnosis, Berachain, Monad, Plasma, ..." (https://docs.intents.aurora.dev/intents-connect/intents-connect-sdk/wallet-integrations.md).
- Supported Assets on Monad (https://docs.intents.aurora.dev/intents-swap/supported-assets.md):

| Symbol | Contract | Asset ID |
| --- | --- | --- |
| MON | native | `nep245:v2_1.omni.hot.tg:143_11111111111111111111` |
| USDC | `0x754704bc059f8c67012fed69bc8a327a5aafb603` | `nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx` |
| USDT0 | `0xe7cd86e13ac4309349f30b3435a9d337750fc82d` | `nep245:v2_1.omni.hot.tg:143_4EJiJxSALvGoTZbnc8K7Ft9533et` |

- Asset IDs embed chain id `143` (Monad mainnet). Docs warn: fetch asset IDs from Get supported tokens, never construct them by hand.
- API schemas use the short chain code `"monad"`: Swap API `blockchain` enum; Persistent Addresses API `depositChain` / `destinationChain` enums.
- No testnet (`eip155:10143`) support is mentioned anywhere in the docs; assume mainnet only and verify with Aurora (Telegram mentor).

## Support channels

- Dedicated mentor via Aurora Telegram (community: https://t.me/auroraisnear/377725).
- User/transaction issues: https://aurora.dev/intents-support. Business/limits: contact@aurora.dev.
- Docs Q&A endpoint: `GET <any-page>.md?ask=<question>` on docs.intents.aurora.dev.
- Monad: https://docs.monad.xyz, https://developers.monad.xyz.

## Source pages

- https://docs.intents.aurora.dev/welcome-to-aurora-intents.md
- https://docs.intents.aurora.dev/confidential-intents.md
- https://docs.intents.aurora.dev/getting-started/use-cases.md
- https://docs.intents.aurora.dev/getting-started/api-keys-and-fees.md
- https://docs.intents.aurora.dev/getting-started/client-portal.md
- https://docs.intents.aurora.dev/getting-started/integration-best-practices/handling-support-cases.md
- https://docs.intents.aurora.dev/getting-started/integration-best-practices/fees-collection.md
- https://docs.intents.aurora.dev/getting-started/integration-best-practices/ux-recommendations.md
- https://docs.intents.aurora.dev/getting-started/integration-best-practices/rate-limits.md
- https://docs.intents.aurora.dev/intents-connect/readme-1.md
- https://docs.intents.aurora.dev/intents-deposits/what-are-intents-deposits.md
- https://docs.intents.aurora.dev/intents-swap/what-is-swap-widget.md
- https://docs.intents.aurora.dev/intents-swap/confidential-swaps.md
- https://docs.intents.aurora.dev/intents-connect/supported-chains.md
- https://docs.intents.aurora.dev/intents-deposits/supported-chains.md
- https://docs.intents.aurora.dev/intents-swap/supported-chains.md
- https://docs.intents.aurora.dev/intents-swap/supported-assets.md
- https://docs.intents.aurora.dev/intents-connect/intents-connect-sdk/wallet-integrations.md
