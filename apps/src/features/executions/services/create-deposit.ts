import "server-only";
import { type Address, parseUnits } from "viem";
import { serverEnv } from "@/config/env.server";
import { MONAD_TOKENS } from "@/features/chain/config/tokens";
import { readTokenBalance } from "@/features/chain/services/balances";
import type { UserRow } from "@/lib/db/schema";
import type { CreateExecutionBody, ExecutionView } from "../types";
import { checkBetaGate } from "../utils/beta-gate";
import {
  activeExecutionId,
  createExecution,
  loadExecution,
  spentTodayUsd,
  toExecutionView,
} from "./execution-repository";
import { buildDepositPlan, DepositRequestError } from "./plan-deposit";

export { DepositRequestError };

export interface DelegatedWallet {
  id: string;
  address: Address;
}

export function requireDelegatedWallet(user: UserRow): DelegatedWallet {
  if (!user.walletId || !user.walletAddress)
    throw new DepositRequestError(
      409,
      "NO_WALLET",
      "Your wallet is still being created.",
    );
  if (!user.delegatedAt)
    throw new DepositRequestError(
      409,
      "NOT_DELEGATED",
      "Allow Enchantress to manage your vault deposits first.",
    );
  return { id: user.walletId, address: user.walletAddress as Address };
}

export async function assertBetaGate(
  user: UserRow,
  valueUsd: number,
): Promise<void> {
  const env = serverEnv();
  const gate = checkBetaGate({
    email: user.email,
    allowlist: env.BETA_ALLOWLIST_EMAILS,
    spentTodayUsd: await spentTodayUsd(user.id),
    valueUsd,
    maxPerDayUsd: env.BETA_MAX_DEPOSIT_USD_PER_DAY,
  });
  if (!gate.ok) throw new DepositRequestError(403, "BETA_LIMIT", gate.reason);
}

export async function assertNoActiveExecution(user: UserRow): Promise<void> {
  if (await activeExecutionId(user.id))
    throw new DepositRequestError(
      409,
      "BUSY",
      "Another deposit or withdrawal is still running. Wait for it to finish.",
    );
}

export async function createDeposit(
  user: UserRow,
  body: CreateExecutionBody,
): Promise<ExecutionView> {
  const wallet = requireDelegatedWallet(user);
  await assertNoActiveExecution(user);
  const token = MONAD_TOKENS[body.depositAsset];
  const amountBase = parseUnits(body.amount, token.decimals);
  const balance = await readTokenBalance(wallet.address, token);
  if (balance < amountBase)
    throw new DepositRequestError(
      400,
      "BALANCE",
      `You only have ${Number(balance) / 10 ** token.decimals} ${token.symbol} on Monad.`,
    );
  const plan = await buildDepositPlan(
    body.indexId,
    body.depositAsset,
    amountBase,
  );
  const price =
    plan.summary.allocations.find((a) => a.asset.symbol === body.depositAsset)
      ?.asset.priceUsd ?? 1;
  const valueUsd = Number(body.amount) * price;
  await assertBetaGate(user, valueUsd);
  const execution = await createExecution({
    userId: user.id,
    indexId: plan.summary.index.id,
    depositAsset: body.depositAsset,
    depositAmountBase: amountBase,
    valueUsd,
    steps: plan.steps,
  });
  const loaded = await loadExecution(execution.id);
  if (!loaded)
    throw new DepositRequestError(
      500,
      "CREATE",
      "Could not start the deposit.",
    );
  return toExecutionView(loaded);
}
