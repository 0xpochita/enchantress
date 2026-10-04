export interface ExecutionRecord {
  id: string;
  indexId: string;
  kind: string;
  status: string;
  depositAsset: string;
  depositAmountBase: string;
  valueUsd: string;
  originChain: string | null;
  originAssetId: string | null;
  originAmountBase: string | null;
  originTxHash: string | null;
  firstTxHash: string | null;
  createdAt: Date;
}

export interface TokenInfo {
  symbol: string;
  decimals: number;
  iconKey: string;
}

export interface PurchaseLookups {
  indexName: (id: string) => string;
  monadToken: (symbol: string) => TokenInfo | undefined;
  originToken: (assetId: string) => TokenInfo | undefined;
}

export interface Purchase {
  id: string;
  indexId: string;
  indexName: string;
  kind: "create" | "deposit" | "withdraw";
  status: string;
  paidSymbol: string;
  paidIconKey: string;
  paidAmount: number | null;
  valueUsd: number;
  chainId: string;
  txHash: string | null;
  at: string;
}

function toUnits(base: string | null, decimals: number): number | null {
  if (!base || base === "0") return null;
  return Number(BigInt(base)) / 10 ** decimals;
}

function paid(record: ExecutionRecord, lookups: PurchaseLookups) {
  const origin = record.originAssetId
    ? lookups.originToken(record.originAssetId)
    : undefined;
  if (origin)
    return {
      symbol: origin.symbol,
      iconKey: origin.iconKey,
      amount: toUnits(record.originAmountBase, origin.decimals),
    };
  const token = lookups.monadToken(record.depositAsset);
  return {
    symbol: record.depositAsset,
    iconKey: token?.iconKey ?? record.depositAsset.toLowerCase(),
    amount: token ? toUnits(record.depositAmountBase, token.decimals) : null,
  };
}

export function toPurchase(
  record: ExecutionRecord,
  lookups: PurchaseLookups,
): Purchase {
  const token = paid(record, lookups);
  return {
    id: record.id,
    indexId: record.indexId,
    indexName: lookups.indexName(record.indexId),
    kind: record.kind === "withdraw" ? "withdraw" : "deposit",
    status: record.status,
    paidSymbol: token.symbol,
    paidIconKey: token.iconKey,
    paidAmount: token.amount,
    valueUsd: Number(record.valueUsd),
    chainId: record.originChain ?? "monad",
    txHash: record.originTxHash ?? record.firstTxHash,
    at: record.createdAt.toISOString(),
  };
}

function firstDepositPerIndex(purchases: Purchase[]): Map<string, string> {
  const firsts = new Map<string, string>();
  const oldestFirst = [...purchases].sort((a, b) => a.at.localeCompare(b.at));
  for (const purchase of oldestFirst)
    if (purchase.kind === "deposit" && !firsts.has(purchase.indexId))
      firsts.set(purchase.indexId, purchase.id);
  return firsts;
}

export function markCreations(
  purchases: Purchase[],
  ownIndexIds: Set<string>,
): Purchase[] {
  const firsts = firstDepositPerIndex(purchases);
  return purchases.map((purchase) =>
    ownIndexIds.has(purchase.indexId) &&
    firsts.get(purchase.indexId) === purchase.id
      ? { ...purchase, kind: "create" }
      : purchase,
  );
}
