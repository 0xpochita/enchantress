import { type Address, encodeFunctionData, erc20Abi, type Hex } from "viem";

export interface TransferInput {
  chainId: number;
  tokenAddress: string | null;
  depositAddress: string;
  amountInBase: string;
}

export interface TransferRequest {
  chainId: number;
  to: Address;
  data?: Hex;
  value?: bigint;
}

export function buildTransferRequest(input: TransferInput): TransferRequest {
  const amount = BigInt(input.amountInBase);
  const depositAddress = input.depositAddress as Address;
  if (!input.tokenAddress)
    return { chainId: input.chainId, to: depositAddress, value: amount };
  return {
    chainId: input.chainId,
    to: input.tokenAddress as Address,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [depositAddress, amount],
    }),
  };
}
