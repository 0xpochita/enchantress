import { maxUint256 } from "viem";
import type { VenueCalls } from "../../vaults/types.ts";
import type { PlannedStep } from "./plan.ts";

const PPM = 1_000_000n;

export interface WithdrawHolding {
  venueId: string;
  assetSymbol: string;
  units: bigint;
  otherUnits: bigint;
  rateRay: bigint;
  exit: Pick<VenueCalls, "exitStepKind" | "exitAmount">;
}

export interface WithdrawLeg<H extends WithdrawHolding = WithdrawHolding> {
  holding: H;
  units: bigint;
  amountBase: bigint;
  isMax: boolean;
}

export function fractionToPpm(fraction: number): bigint {
  return BigInt(Math.round(fraction * Number(PPM)));
}

function legFor<H extends WithdrawHolding>(
  holding: H,
  ppm: bigint,
): WithdrawLeg<H> {
  const units = (holding.units * ppm) / PPM;
  const closesPosition = ppm === PPM && holding.otherUnits === 0n;
  const amountBase = holding.exit.exitAmount(
    units,
    holding.rateRay,
    closesPosition,
  );
  return { holding, units, amountBase, isMax: amountBase === maxUint256 };
}

export function planWithdrawLegs<H extends WithdrawHolding>(
  holdings: H[],
  fraction: number,
): WithdrawLeg<H>[] {
  const ppm = fractionToPpm(fraction);
  if (ppm <= 0n || ppm > PPM) return [];
  return holdings
    .filter((holding) => holding.units > 0n)
    .map((holding) => legFor(holding, ppm))
    .filter((leg) => leg.amountBase > 0n);
}

export function withdrawSteps(legs: WithdrawLeg[]): PlannedStep[] {
  return legs.map((leg, position) => ({
    position,
    kind: leg.holding.exit.exitStepKind,
    assetSymbol: leg.holding.assetSymbol,
    venueId: leg.holding.venueId,
    spender: null,
    amountBase: leg.amountBase.toString(),
    amountFromPosition: null,
  }));
}

export interface LotUnits {
  id: string;
  units: bigint;
}

export function reduceLots(lots: LotUnits[], burned: bigint): LotUnits[] {
  let remaining = burned;
  const updates: LotUnits[] = [];
  for (const lot of lots) {
    if (remaining <= 0n) break;
    if (lot.units <= 0n) continue;
    const taken = lot.units < remaining ? lot.units : remaining;
    remaining -= taken;
    updates.push({ id: lot.id, units: lot.units - taken });
  }
  return updates;
}
