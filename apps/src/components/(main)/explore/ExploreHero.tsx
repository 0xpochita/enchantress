import { Card } from "@/components/ui";
import { formatPercent } from "@/utils/format";

interface ExploreHeroProps {
  basketCount: number;
  vaultCount: number;
  bestApy: number;
  chainCount: number;
}

export function ExploreHero({
  basketCount,
  vaultCount,
  bestApy,
  chainCount,
}: ExploreHeroProps) {
  const stats = [
    { label: "Public baskets", value: String(basketCount) },
    { label: "Vaults indexed on Monad", value: String(vaultCount) },
    { label: "Best vault APY", value: formatPercent(bestApy) },
    { label: "Chains you can deposit from", value: String(chainCount) },
  ];
  return (
    <Card className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Yield baskets on Monad
        </h1>
        <p className="text-ink-muted md:text-lg">
          Each basket is a set of weighted assets. Deposit any token from any
          chain and every slice is routed to the highest APY vault in its
          aggregator.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <dt className="order-last text-sm text-ink-muted">{stat.label}</dt>
            <dd className="text-2xl font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
