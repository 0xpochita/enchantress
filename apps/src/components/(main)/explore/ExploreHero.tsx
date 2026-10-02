import { BRAND_FADE_SURFACE, Card, HalftoneArt } from "@/components/ui";
import { formatPercent } from "@/utils/format";

interface ExploreHeroProps {
  indexCount: number;
  vaultCount: number;
  bestApy: number;
  chainCount: number;
}

export function ExploreHero({
  indexCount,
  vaultCount,
  bestApy,
  chainCount,
}: ExploreHeroProps) {
  const stats = [
    { label: "Indexes", value: String(indexCount) },
    { label: "Vaults on Monad", value: String(vaultCount) },
    { label: "Best APY", value: formatPercent(bestApy) },
    { label: "Source chains", value: String(chainCount) },
  ];
  return (
    <Card
      className={`group relative flex flex-col gap-10 overflow-hidden p-6 md:p-10 ${BRAND_FADE_SURFACE}`}
    >
      <HalftoneArt
        iconKey="monad"
        className="-right-12 -bottom-20 hidden size-80 md:block"
      />
      <div className="relative flex max-w-xl flex-col gap-3">
        <h1 className="text-4xl font-light tracking-tight md:text-5xl">
          Yield indexes on Monad
        </h1>
        <p className="text-ink-muted">
          One deposit from any chain, split across the best DeFi vaults.
        </p>
      </div>
      <dl className="relative flex w-fit flex-wrap divide-x divide-line">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1 px-5 first:pl-0">
            <dt className="order-last text-xs text-ink-muted">{stat.label}</dt>
            <dd className="text-2xl font-light">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
