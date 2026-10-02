import type { Chain, Token } from "@/types/market";
import type { RoutingSource } from "./RoutingDiagram";

const VAULT_CHAIN_ID = "monad";

export function toRoutingSource(
  token?: Token,
  chain?: Chain,
): RoutingSource | undefined {
  if (!token || !chain) return undefined;
  return {
    symbol: token.symbol,
    chainName: chain.name,
    iconKey: token.iconKey,
    chainIconKey: chain.iconKey,
    isCrossChain: chain.id !== VAULT_CHAIN_ID,
  };
}
