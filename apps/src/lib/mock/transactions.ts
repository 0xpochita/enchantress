import type { IndexTransaction, TransactionType } from "@/types/market";

interface TransactionSeed {
  hash: string;
  type: TransactionType;
  account: string;
  tokenId: string;
  amount: number;
  valueUsd: number;
  timestamp: string;
}

const SEEDS: TransactionSeed[] = [
  {
    hash: "0x23db8f1c0a4e9b7d6c5f2e1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c",
    type: "deposit",
    account: "0x0253A1c9E4b7D2f8C6a0B3e5D9f1C7a2B4e6ef72",
    tokenId: "eth-base",
    amount: 0.25,
    valueUsd: 787.6,
    timestamp: "2026-09-15T21:42:00Z",
  },
  {
    hash: "0xf930a7b2c4d6e8f0a1b3c5d7e9f1a2b4c6d8e0f2a3b5c7d9e1f3a4b6c8d0e2f4",
    type: "deposit",
    account: "0x9C41d7E2a8B5f3C0e6D1a4B9c2E7f5A3d8B0c613",
    tokenId: "usdc-monad",
    amount: 500,
    valueUsd: 500,
    timestamp: "2026-09-15T21:41:00Z",
  },
  {
    hash: "0xdf9a6c3b1e8d5f2a0c7b4e1d9f6a3c0b8e5d2f9a7c4b1e8d6f3a0c9b7e4d1f8a",
    type: "withdraw",
    account: "0x0253A1c9E4b7D2f8C6a0B3e5D9f1C7a2B4e6ef72",
    tokenId: "usdc-base",
    amount: 120,
    valueUsd: 120,
    timestamp: "2026-09-15T21:40:00Z",
  },
  {
    hash: "0xbd08e4f1a7c3b9d5e2f8a4c0b6d1e7f3a9c5b2d8e4f0a6c1b7d3e9f5a2c8b4d0",
    type: "deposit",
    account: "0x7E2b5A9c1D4f8E0a3B6c9D2e5F8a1B4c7D0e3d55",
    tokenId: "sol-sol",
    amount: 2,
    valueUsd: 344.6,
    timestamp: "2026-09-13T07:33:00Z",
  },
  {
    hash: "0xa533c8e2b6d0f4a9c3e7b1d5f9a2c6e0b4d8f1a5c9e3b7d0f4a8c2e6b9d3f7a1",
    type: "deposit",
    account: "0x4B8a2C6e0D3f7A1b5C9d2E6f0A4b8C1d5E9f2a47",
    tokenId: "usdt-tron",
    amount: 300,
    valueUsd: 300,
    timestamp: "2026-09-13T07:29:00Z",
  },
  {
    hash: "0x8a29f5c1e7b3d9a4c0e6b2f8d1a7c3e9b5f0a2d6c8e4b1f7a3d9c5e0b6f2a8d4",
    type: "withdraw",
    account: "0x9C41d7E2a8B5f3C0e6D1a4B9c2E7f5A3d8B0c613",
    tokenId: "mon-monad",
    amount: 950,
    valueUsd: 389.5,
    timestamp: "2026-09-13T07:26:00Z",
  },
];

export function buildTransactions(indexIds: string[]): IndexTransaction[] {
  return indexIds.flatMap((indexId) =>
    SEEDS.map((seed) => ({ ...seed, indexId })),
  );
}
