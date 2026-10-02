---
name: privy
description: Entry point for any Privy work in enchantress (wallets, signers, policies, gas sponsorship, Earn vaults, deposits/onramp, webhooks, linked accounts, organizations). Load first when a task mentions Privy, embedded wallet, server wallet, session key, authorization key, policy, key quorum, sponsor gas, Earn, ERC-4626 vault, deposit address, onramp, fundWallet, Privy webhook, link account, or organization wallet; it routes to the right privy-* skill.
---

# Privy (router)

Privy provides auth plus wallet infrastructure. Login is assumed known; this skill set covers everything else.
Stack here: Next.js App Router in `apps/`, client SDK `@privy-io/react-auth`, server SDK `@privy-io/node`, target chain Monad (EVM).

## Feature map

| Feature | Group | Priority | Skill |
| --- | --- | --- | --- |
| Embedded wallet | Wallet | Required | `privy-wallets` |
| Server wallet (REST API) | Wallet | Optional | `privy-wallets` |
| Multi-chain support | Wallet | Optional | `privy-wallets` |
| Signer / authorization key | Controls | Required | `privy-controls` |
| Policies | Controls | Required | `privy-controls` |
| Key quorum | Controls | Optional | `privy-controls` |
| Manual approvals | Controls | Optional | `privy-controls` |
| Wallet actions (transfer, swap) | Money movement | Optional | `privy-transactions` |
| Earn (ERC-4626 vaults) | Money movement | Differentiator | `privy-earn` |
| Gas sponsorship | Money movement | Required | `privy-transactions` |
| Webhooks and tracking | Money movement | Required | `privy-transactions` |
| Universal deposit address | Funding | Differentiator | `privy-funding` |
| Card onramp | Funding | Optional | `privy-funding` |
| Bank transfer | Funding | Optional | `privy-funding` |
| Exchange funding | Funding | Optional | `privy-funding` |
| Link accounts | User | Optional | `privy-users` |
| Organizations | User | Optional | `privy-users` |

Skill files live in `skills/<name>/SKILL.md`. Read the matching one before writing code.

## Monad support (from docs, 2026-10-02)

Monad mainnet is `eip155:143`, testnet `eip155:10143`. Not in Privy's default chain list: set it via `defaultChain` / `supportedChains` with your own RPC (see `privy-wallets`).

| Feature | Monad status |
| --- | --- |
| Embedded wallet, signing, `eth_sendTransaction` | Works as generic EVM chain |
| Gas sponsorship (app pays) | Listed: Monad and Monad Testnet. User-pays mode: not listed |
| Swaps (same chain) | Listed: Monad and Monad Testnet. Cross-chain: use `aurora-intents-swap` |
| Transfer API (wallet actions) | Not listed; use low-level `eth_sendTransaction` |
| Wallet automations deposit detection | Listed (`eip155:143`) |
| Earn vaults | Not listed; contact sales@privy.io |
| Universal deposit (cross-chain into Monad) | Not documented; use `aurora-intents-deposits` (Monad supported) |
| Card onramp, fiat payouts | Not listed |
| Balance API, tx history, `transaction.*` webhooks | Not confirmed; read balances onchain |

## Plan gates

Enterprise only: webhooks in production (incl. Earn and user webhooks), manual approvals, postpaid gas billing. Without Enterprise, poll action status.

## Getting fresh docs

Skills are snapshots. When an API detail matters, fetch the live page:

- Index of all pages: `https://docs.privy.io/llms.txt`
- Sub-indexes: `https://docs.privy.io/_llms/wallets.md`, `https://docs.privy.io/_llms/api-reference.md`
- Any doc page as raw markdown: append `.md` to its URL.

Never guess hook names, endpoints, or config keys. If a skill and the live docs disagree, the docs win; update the skill.

## Project rules that apply

- Secrets (`PRIVY_APP_SECRET`, authorization private keys) stay server side, never behind `NEXT_PUBLIC_`.
- Validate Privy API responses and webhook payloads with Zod at the trust boundary.
- Verify webhook signatures before trusting the payload.
