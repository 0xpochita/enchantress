import { maxUint256 } from "viem";
import type { PlannedStep } from "./plan.ts";

const RAY = 10n ** 27n;
const PPM = 1_000_000n;

export interface WithdrawHolding {
  venueId: string;
  assetSymbol: string;
  venueKind: "aave-pool" | "erc4626";
  units: bigint;
  otherUnits: bigint;
  liquidityIndex: bigint;
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

function aaveLeg<H extends WithdrawHolding>(
  holding: H,
  ppm: bigint,
): WithdrawLeg<H> {
  const isMax = ppm === PPM && holding.otherUnits === 0n;
  const amountBase = isMax
    ? maxUint256
    : (holding.units * holding.liquidityIndex * ppm) / (RAY * PPM);
  return {
    holding,
    units: (holding.units * ppm) / PPM,
    amountBase,
    isMax,
  };
}

function legFor<H extends WithdrawHolding>(
  holding: H,
  ppm: bigint,
): WithdrawLeg<H> {
  if (holding.venueKind === "aave-pool") return aaveLeg(holding, ppm);
  const shares = (holding.units * ppm) / PPM;
  return { holding, units: shares, amountBase: shares, isMax: false };
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
    kind: leg.holding.venueKind === "aave-pool" ? "withdraw" : "redeem",
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
