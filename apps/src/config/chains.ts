import type { Chain as ViemChain } from "viem";
import { arbitrum, base, mainnet, monad } from "viem/chains";

export const MONAD_CHAIN = monad;
export const MONAD_CAIP2 = `eip155:${monad.id}`;

export interface OriginChain {
  id: string;
  name: string;
  iconKey: string;
  auroraCode: string;
  chain: ViemChain;
}

export const ORIGIN_CHAINS: OriginChain[] = [
  {
    id: "monad",
    name: "Monad",
    iconKey: "monad",
    auroraCode: "monad",
    chain: monad,
  },
  {
    id: "base",
    name: "Base",
    iconKey: "base",
    auroraCode: "base",
    chain: base,
  },
  {
    id: "eth",
    name: "Ethereum",
    iconKey: "eth",
    auroraCode: "eth",
    chain: mainnet,
  },
  {
    id: "arb",
    name: "Arbitrum",
    iconKey: "arb",
    auroraCode: "arb",
    chain: arbitrum,
  },
];

export function originChainById(id: string): OriginChain | undefined {
  return ORIGIN_CHAINS.find((chain) => chain.id === id);
}

export function originChainByAuroraCode(code: string): OriginChain | undefined {
  return ORIGIN_CHAINS.find((chain) => chain.auroraCode === code);
}
