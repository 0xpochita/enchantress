import { type Address, encodeFunctionData, erc20Abi, type Hex } from "viem";
import { aavePoolAbi } from "../../chain/abis/aave.ts";
import { erc4626Abi } from "../../chain/abis/erc4626.ts";
import { uniswapRouterAbi } from "../../chain/abis/uniswap.ts";

export interface SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  fee: number;
  recipient: Address;
  amountIn: bigint;
  amountOutMinimum: bigint;
}

export function approveCalldata(spender: Address, amount: bigint): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
  });
}

export function aaveSupplyCalldata(
  asset: Address,
  amount: bigint,
  onBehalfOf: Address,
): Hex {
  return encodeFunctionData({
    abi: aavePoolAbi,
    functionName: "supply",
    args: [asset, amount, onBehalfOf, 0],
  });
}

export function erc4626DepositCalldata(amount: bigint, receiver: Address): Hex {
  return encodeFunctionData({
    abi: erc4626Abi,
    functionName: "deposit",
    args: [amount, receiver],
  });
}

export function uniswapSwapCalldata(params: SwapParams): Hex {
  return encodeFunctionData({
    abi: uniswapRouterAbi,
    functionName: "exactInputSingle",
    args: [{ ...params, sqrtPriceLimitX96: 0n }],
  });
}

export function minimumOut(quoted: bigint, slippageBps: number): bigint {
  return (quoted * BigInt(10_000 - slippageBps)) / 10_000n;
}
