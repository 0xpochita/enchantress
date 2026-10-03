import "server-only";
import { type Address, erc20Abi } from "viem";
import { type ChainToken, MONAD_TOKEN_LIST } from "../config/tokens";
import { monadClient } from "./public-client";

export interface TokenBalance {
  symbol: string;
  amountBase: string;
  amount: number;
}

export async function readTokenBalance(
  owner: Address,
  token: ChainToken,
): Promise<bigint> {
  return monadClient().readContract({
    address: token.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [owner],
  });
}

export async function readTokenBalances(
  owner: Address,
): Promise<TokenBalance[]> {
  const balances = await monadClient().multicall({
    allowFailure: false,
    contracts: MONAD_TOKEN_LIST.map((token) => ({
      address: token.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [owner] as const,
    })),
  });
  return MONAD_TOKEN_LIST.map((token, position) => ({
    symbol: token.symbol,
    amountBase: balances[position].toString(),
    amount: Number(balances[position]) / 10 ** token.decimals,
  }));
}
