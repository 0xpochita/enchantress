import { parseAbi } from "viem";

export const uniswapQuoterAbi = parseAbi([
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
]);

export const uniswapFactoryAbi = parseAbi([
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)",
]);

export const uniswapRouterAbi = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
]);

export const UNISWAP_MONAD = {
  swapRouter02: "0xfe31f71c1b106eac32f1a19239c9a9a72ddfb900",
  quoterV2: "0x661e93cca42afacb172121ef892830ca3b70f08d",
  factory: "0x204faca1764b154221e35c0d20abb3c525710498",
} as const;

export const UNISWAP_FEE_TIERS = [100, 500, 3000, 10000] as const;
