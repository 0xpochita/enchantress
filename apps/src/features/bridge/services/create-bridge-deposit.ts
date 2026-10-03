import "server-only";
import { parseUnits } from "viem";
import { MONAD_CHAIN, originChainById } from "@/config/chains";
import {
  assertBetaGate,
  assertNoActiveExecution,
  createDeposit,
  DepositRequestError,
  requireDelegatedWallet,
} from "@/features/executions/services/create-deposit";
import {
  createBridgingExecution,
  loadExecution,
  toExecutionView,
} from "@/features/executions/services/execution-repository";
import type { UserRow } from "@/lib/db/schema";
import type { BridgeDepositResponse, CreateBridgeDepositBody } from "../types";
import { getBridgeTokenDetail, MONAD_USDC_ASSET_ID } from "./bridge-catalog";
import { requestBridgeQuote } from "./bridge-quote";
import { readOriginBalances } from "./origin-balances";

async function assertOriginBalance(
  wallet: `0x${string}`,
  token: NonNullable<Awaited<ReturnType<typeof getBridgeTokenDetail>>>,
  amount: string,
) {
  const [balance] = await readOriginBalances(wallet, [token]);
  const held = balance?.amount ?? 0;
  if (held < Number(amount))
    throw new DepositRequestError(
      400,
      "BALANCE",
      `You only have ${held} ${token.symbol} on ${originChainById(token.chainId)?.name ?? token.chainId}.`,
    );
}

export async function createBridgeDeposit(
  user: UserRow,
  body: CreateBridgeDepositBody,
): Promise<BridgeDepositResponse> {
  if (body.originTokenId === MONAD_USDC_ASSET_ID) {
    const execution = await createDeposit(user, {
      indexId: body.indexId,
      depositAsset: "USDC",
      amount: body.amount,
    });
    return { execution, transfer: null };
  }
  const wallet = requireDelegatedWallet(user);
  await assertNoActiveExecution(user);
  const token = await getBridgeTokenDetail(body.originTokenId);
  if (!token)
    throw new DepositRequestError(400, "TOKEN", "This token is not supported.");
  const origin = originChainById(token.chainId);
  if (!origin || origin.chain.id === MONAD_CHAIN.id)
    throw new DepositRequestError(
      400,
      "TOKEN",
      "Deposit USDC directly when your funds are already on Monad.",
    );
  await assertOriginBalance(wallet.address, token, body.amount);
  const quote = await requestBridgeQuote(token, body.amount, wallet.address);
  await assertBetaGate(user, Number(quote.amountInUsd));
  const execution = await createBridgingExecution({
    userId: user.id,
    indexId: body.indexId,
    valueUsd: Number(quote.amountInUsd),
    estimatedLandedBase: BigInt(quote.amountOut),
    originChain: token.chainId,
    originAssetId: token.assetId,
    originAmountBase: parseUnits(body.amount, token.decimals),
    depositAddress: quote.depositAddress,
    depositMemo: quote.depositMemo ?? null,
    deadline: quote.deadline,
  });
  const loaded = await loadExecution(execution.id);
  if (!loaded)
    throw new DepositRequestError(
      500,
      "CREATE",
      "Could not start the deposit.",
    );
  return {
    execution: toExecutionView(loaded),
    transfer: {
      chainId: origin.chain.id,
      tokenAddress: token.contractAddress,
      depositAddress: quote.depositAddress,
      amountInBase: quote.amountIn,
      memo: quote.depositMemo ?? null,
    },
  };
}
