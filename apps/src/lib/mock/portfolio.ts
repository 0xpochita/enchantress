import type { IndexTransaction } from "@/types/market";
import { WALLET_ADDRESS } from "./tokens";

export const PORTFOLIO_AS_OF = "2026-10-02T00:00:00Z";

type PurchaseSeed = Omit<IndexTransaction, "account">;

const PURCHASE_SEEDS: PurchaseSeed[] = [
  {
    hash: "0x5e2a9c4f1b8d3e7a0c6f2b9d4e1a8c5f3b0d7e2a9c6f1b4d8e3a0c7f5b2d9e6a",
    indexId: "dollar-mix",
    tokenId: "usdc-base",
    amount: 1500,
    valueUsd: 1500,
    timestamp: "2026-08-24T10:12:00Z",
  },
  {
    hash: "0x3c8f1a6d2e9b5c0f7a4d1e8b3c6f9a2d5e0b7c4f1a8d3e6b9c2f5a0d7e4b1c8f",
    indexId: "eth-yield",
    tokenId: "eth-base",
    amount: 0.4,
    valueUsd: 1250,
    timestamp: "2026-09-01T16:40:00Z",
  },
  {
    hash: "0x9b4e7a2c5f0d8b3e6a1c4f9d2b7e0a5c8f3d6b1e4a9c2f7d0b5e8a3c6f1d4b9e",
    indexId: "mon-maxi",
    tokenId: "mon-monad",
    amount: 2050,
    valueUsd: 840,
    timestamp: "2026-09-08T09:05:00Z",
  },
  {
    hash: "0x1d6a3f8c0e5b2d9a7c4f1e6b3d0a8c5f2e9b7d4a1c6f3e0b8d5a2c9f7e4b1d6a",
    indexId: "monad-stable",
    tokenId: "usdc-monad",
    amount: 6,
    valueUsd: 6,
    timestamp: "2026-09-13T19:42:26Z",
  },
  {
    hash: "0x7f2c5a8e1b4d9f6c3a0e7b2d5f8c1a4e9b6d3f0c7a2e5b8d1f4c9a6e3b0d7f2c",
    indexId: "dollar-mix",
    tokenId: "usdc-monad",
    amount: 650,
    valueUsd: 650,
    timestamp: "2026-09-18T13:22:00Z",
  },
];

export const USER_PURCHASES: IndexTransaction[] = PURCHASE_SEEDS.map(
  (seed) => ({ ...seed, account: WALLET_ADDRESS }),
);
