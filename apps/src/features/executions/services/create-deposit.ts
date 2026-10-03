import "server-only";
import { type Address, parseUnits } from "viem";
import { MONAD_TOKENS } from "@/features/chain/config/tokens";
import { readTokenBalance } from "@/features/chain/services/balances";
import { assetValueUsd } from "@/features/portfolio/services/valuation";
import { type CreateExecutionBody, ExecutionRequestError } from "../types";
import type { NewExecution } from "./execution-repository";
import { buildDepositPlan } from "./plan-deposit";

export async function prepareDeposit(
  userId: string,
  wallet: Address,
  body: CreateExecutionBody,
): Promise<NewExecution> {
  const token = MONAD_TOKENS[body.depositAsset];
  const amountBase = parseUnits(body.amount, token.decimals);
  const balance = await readTokenBalance(wallet, token);
  if (balance < amountBase)
    throw new ExecutionRequestError(
      400,
      "BALANCE",
      `You only have ${Number(balance) / 10 ** token.decimals} ${token.symbol} on Monad.`,
    );
  const plan = await buildDepositPlan(
    body.indexId,
    body.depositAsset,
    amountBase,
  );
  const { valueUsd } = await assetValueUsd(body.depositAsset, amountBase);
  return {
    kind: "deposit",
    userId,
    indexId: plan.summary.index.id,
    depositAsset: body.depositAsset,
    depositAmountBase: amountBase,
    valueUsd,
    steps: plan.steps,
  };
}
