import "server-only";
import { type Address, erc20Abi } from "viem";
import { originChainClient } from "@/features/chain/services/public-client";
import type { WalletBalance } from "@/types/market";
import type { BridgeTokenDetail } from "./bridge-catalog";

function groupByChain(
  details: BridgeTokenDetail[],
): Map<string, BridgeTokenDetail[]> {
  const groups = new Map<string, BridgeTokenDetail[]>();
  for (const detail of details) {
    groups.set(detail.chainId, [...(groups.get(detail.chainId) ?? []), detail]);
  }
  return groups;
}

async function readChainBalances(
  chainId: string,
  tokens: BridgeTokenDetail[],
  owner: Address,
): Promise<WalletBalance[]> {
  const client = originChainClient(chainId);
  const contracts = tokens.filter((t) => t.contractAddress !== null);
  const natives = tokens.filter((t) => t.contractAddress === null);
  const [erc20Raw, nativeRaw] = await Promise.all([
    contracts.length === 0
      ? []
      : client.multicall({
          allowFailure: true,
          contracts: contracts.map((token) => ({
            address: token.contractAddress as Address,
            abi: erc20Abi,
            functionName: "balanceOf" as const,
            args: [owner] as const,
          })),
        }),
    natives.length === 0 ? [] : [await client.getBalance({ address: owner })],
  ]);
  const toBalance = (token: BridgeTokenDetail, raw: bigint | undefined) => ({
    tokenId: token.assetId,
    amount: raw === undefined ? 0 : Number(raw) / 10 ** token.decimals,
  });
  return [
    ...contracts.map((token, i) =>
      toBalance(
        token,
        erc20Raw[i]?.status === "success" ? erc20Raw[i].result : undefined,
      ),
    ),
    ...natives.map((token) => toBalance(token, nativeRaw[0])),
  ];
}

export async function readOriginBalances(
  owner: Address,
  details: BridgeTokenDetail[],
): Promise<WalletBalance[]> {
  const results = await Promise.allSettled(
    [...groupByChain(details)].map(([chainId, tokens]) =>
      readChainBalances(chainId, tokens, owner),
    ),
  );
  return results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((balance) => balance.amount > 0);
}
