export type StepKind = "swap" | "approve" | "supply" | "withdraw" | "redeem";
export type Spender = "venue" | "router";

export interface PlannedStep {
  position: number;
  kind: StepKind;
  assetSymbol: string;
  venueId: string;
  spender: Spender | null;
  amountBase: string | null;
  amountFromPosition: number | null;
}

export interface PlanSlice {
  assetSymbol: string;
  weightBps: number;
  venueId: string;
  via?: string;
}

export interface DepositPlanInput {
  depositAsset: string;
  depositAmountBase: bigint;
  slices: PlanSlice[];
}

const BPS = 10_000n;

export function sliceAmounts(total: bigint, weightsBps: number[]): bigint[] {
  if (weightsBps.length === 0) return [];
  const totalBps = weightsBps.reduce((sum, bps) => sum + bps, 0);
  if (BigInt(totalBps) !== BPS)
    throw new RangeError(
      `Slice weights add up to ${totalBps} bps, not ${BPS}.`,
    );
  const amounts = weightsBps.map((bps) => (total * BigInt(bps)) / BPS);
  const assigned = amounts.reduce((sum, amount) => sum + amount, 0n);
  amounts[amounts.length - 1] += total - assigned;
  return amounts;
}

type StepDraft = Omit<PlannedStep, "position">;

function directSteps(slice: PlanSlice, amount: bigint): StepDraft[] {
  const fixed = {
    assetSymbol: slice.assetSymbol,
    venueId: slice.venueId,
    amountBase: amount.toString(),
    amountFromPosition: null,
  };
  return [
    { kind: "approve", spender: "venue", ...fixed },
    { kind: "supply", spender: null, ...fixed },
  ];
}

function swapLeg(
  from: string,
  to: string,
  venueId: string,
  amount: StepAmount,
): StepDraft[] {
  return [
    {
      kind: "approve",
      spender: "router",
      assetSymbol: from,
      venueId,
      ...amount,
    },
    { kind: "swap", spender: null, assetSymbol: to, venueId, ...amount },
  ];
}

type StepAmount = Pick<PlannedStep, "amountBase" | "amountFromPosition">;

function fromStep(position: number): StepAmount {
  return { amountBase: null, amountFromPosition: position };
}

function swappedSteps(
  slice: PlanSlice,
  amount: bigint,
  depositAsset: string,
  start: number,
): StepDraft[] {
  const fixed = { amountBase: amount.toString(), amountFromPosition: null };
  const hops = slice.via
    ? [
        ...swapLeg(depositAsset, slice.via, slice.venueId, fixed),
        ...swapLeg(
          slice.via,
          slice.assetSymbol,
          slice.venueId,
          fromStep(start + 1),
        ),
      ]
    : swapLeg(depositAsset, slice.assetSymbol, slice.venueId, fixed);
  const output = fromStep(start + hops.length - 1);
  const target = { assetSymbol: slice.assetSymbol, venueId: slice.venueId };
  return [
    ...hops,
    { kind: "approve", spender: "venue", ...target, ...output },
    { kind: "supply", spender: null, ...target, ...output },
  ];
}

export function planDeposit(input: DepositPlanInput): PlannedStep[] {
  const amounts = sliceAmounts(
    input.depositAmountBase,
    input.slices.map((slice) => slice.weightBps),
  );
  const steps: PlannedStep[] = [];
  input.slices.forEach((slice, index) => {
    const amount = amounts[index];
    if (amount <= 0n) return;
    const drafts =
      slice.assetSymbol === input.depositAsset
        ? directSteps(slice, amount)
        : swappedSteps(slice, amount, input.depositAsset, steps.length);
    for (const draft of drafts)
      steps.push({ position: steps.length, ...draft });
  });
  return steps;
}
