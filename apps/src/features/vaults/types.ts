import type { Abi, Address, Hex, TransactionReceipt } from "viem";
import type { VenueConfig } from "./config/venues";

export interface MarketRead {
  assetSymbol: string;
  apy: number;
  tvlUsd: number;
  liquidityUsd: number;
  priceUsd: number;
}

export type PriceOf = (symbol: string) => number | undefined;

export interface VenueTransaction {
  to: Address;
  data: Hex;
}

export interface PolicyCall {
  rule: string;
  abi: readonly Exclude<Abi[number], { type: "error" }>[];
  functionName: string;
  selfFields: string[];
}

export type ExitStepKind = "withdraw" | "redeem";

export interface VenueCalls {
  readonly venue: VenueConfig;
  readonly exitStepKind: ExitStepKind;
  callTarget(assetSymbol: string): Address;
  callTargets(): Address[];
  policyCalls(): PolicyCall[];
  supplyTransaction(
    assetSymbol: string,
    amount: bigint,
    owner: Address,
  ): VenueTransaction;
  exitTransaction(
    assetSymbol: string,
    amount: bigint,
    owner: Address,
  ): VenueTransaction;
  exitAmount(units: bigint, rateRay: bigint, closesPosition: boolean): bigint;
}

export interface UnitsChange {
  assetSymbol: string;
  owner: Address;
  receipt: TransactionReceipt;
  unitsBefore: bigint | null;
  amount: bigint;
}

export interface VenueHolding {
  heldUnits: bigint;
  maxUnits: bigint;
  availableAssets: bigint;
  rateRay: bigint;
}

export interface VaultAdapter extends VenueCalls {
  readMarkets(priceUsd: PriceOf): Promise<MarketRead[]>;
  rate(assetSymbol: string): Promise<bigint>;
  readHolding(owner: Address, assetSymbol: string): Promise<VenueHolding>;
  unitsBefore(owner: Address, assetSymbol: string): Promise<bigint | null>;
  suppliedUnits(change: UnitsChange): Promise<bigint>;
  burnedUnits(change: UnitsChange): Promise<bigint>;
}
