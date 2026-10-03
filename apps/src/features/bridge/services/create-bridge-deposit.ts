import "server-only";
import { type Address, parseUnits } from "viem";
import { MONAD_CHAIN, originChainById } from "@/config/chains";
import type { NewBridgingExecution } from "@/features/executions/services/execution-repository";
import { ExecutionRequestError } from "@/features/executions/types";
import type { CreateBridgeDepositBody, TransferInstruction } from "../types";
import { getBridgeTokenDetail } from "./bridge-catalog";
import { requestBridgeQuote } from "./bridge-quote";
import { readOriginBalances } from "./origin-balances";

type BridgeToken = NonNullable<
  Awaited<ReturnType<typeof getBridgeTokenDetail>>
>;

export interface PreparedBridgeDeposit {
  execution: NewBridgingExecution;
  transfer: TransferInstruction;
}

async function assertOriginBalance(
  wallet: Address,
  token: BridgeToken,
  amount: string,
) {
  const [balance] = await readOriginBalances(wallet, [token]);
  const held = balance?.amount ?? 0;
  if (held < Number(amount))
    throw new ExecutionRequestError(
      400,
      "BALANCE",
      `You only have ${held} ${token.symbol} on ${originChainById(token.chainId)?.name ?? token.chainId}.`,
    );
}

async function originToken(tokenId: string) {
  const token = await getBridgeTokenDetail(tokenId);
  if (!token)
    throw new ExecutionRequestError(
      400,
      "TOKEN",
      "This token is not supported.",
    );
  const origin = originChainById(token.chainId);
  if (!origin || origin.chain.id === MONAD_CHAIN.id)
    throw new ExecutionRequestError(
      400,
      "TOKEN",
      "Deposit USDC or USDT0 directly when your funds are already on Monad.",
    );
  return { token, chainId: origin.chain.id };
}

export async function prepareBridgeDeposit(
  userId: string,
  wallet: Address,
  body: CreateBridgeDepositBody,
): Promise<PreparedBridgeDeposit> {
  const { token, chainId } = await originToken(body.originTokenId);
  await assertOriginBalance(wallet, token, body.amount);
  const quote = await requestBridgeQuote(token, body.amount, wallet);
  const depositMemo = quote.depositMemo ?? null;
  return {
    execution: {
      userId,
      indexId: body.indexId,
      valueUsd: Number(quote.amountInUsd),
      estimatedLandedBase: BigInt(quote.amountOut),
      originChain: token.chainId,
      originAssetId: token.assetId,
      originAmountBase: parseUnits(body.amount, token.decimals),
      depositAddress: quote.depositAddress,
      depositMemo,
      deadline: quote.deadline,
    },
    transfer: {
      chainId,
      tokenAddress: token.contractAddress,
      depositAddress: quote.depositAddress,
      amountInBase: quote.amountIn,
      memo: depositMemo,
    },
  };
}
