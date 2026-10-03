import Link from "next/link";
import { GlowCard, RollingNumber, TokenStack } from "@/components/ui";
import { getIndexSummaries } from "@/features/indexes/services/index-catalog";
import type { IndexSummary } from "@/features/indexes/utils/route-index";
import { formatCompactUsd } from "@/utils/format";

const PREVIEW_COUNT = 3;

async function featuredSummaries(): Promise<IndexSummary[]> {
  try {
    const summaries = await getIndexSummaries();
    return summaries
      .filter((summary) => summary.index.isFeatured)
      .slice(0, PREVIEW_COUNT);
  } catch {
    return [];
  }
}

function Allocation({ summary }: { summary: IndexSummary }) {
  return (
    <div className="index-card-alloc">
      <div className="alloc-bar" aria-hidden="true">
        {summary.allocations.map((a) => (
          <span key={a.asset.symbol} style={{ flexGrow: a.weight }} />
        ))}
      </div>
      <ul>
        {summary.allocations.map((a) => (
          <li key={a.asset.symbol}>
            <span>
              {a.asset.symbol} {Math.round(a.weight * 100)}%
            </span>
            <span>{a.venue.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IndexCard({ summary }: { summary: IndexSummary }) {
  const { index, allocations, apy } = summary;
  const assets = allocations.map((a) => ({
    iconKey: a.asset.iconKey,
    label: a.asset.symbol,
  }));
  return (
    <GlowCard className="index-card">
      <Link href={`/indexes/${index.id}`} className="index-card-link">
        <span className="index-card-head">
          <TokenStack items={assets} size={30} />
          <span className="index-card-name">{index.name}</span>
        </span>
        <span className="index-card-apy">
          <RollingNumber value={Math.round(apy * 100) / 100} suffix="%" />
          <span>APY</span>
        </span>
        <Allocation summary={summary} />
        <span className="index-card-foot">
          <span>
            {index.tvlUsd > 0
              ? `TVL ${formatCompactUsd(index.tvlUsd)}`
              : "Live onchain rate"}
          </span>
          <span aria-hidden="true">↗</span>
        </span>
      </Link>
    </GlowCard>
  );
}

export async function IndexPreview() {
  const summaries = await featuredSummaries();
  if (summaries.length === 0) return null;
  return (
    <section className="landing-section" aria-labelledby="indexes-heading">
      <div className="section-head-row">
        <div>
          <h2 id="indexes-heading" className="section-heading">
            Rates read from the chain, not a spreadsheet
          </h2>
        </div>
        <Link href="/invest" className="text-link">
          View all indexes
        </Link>
      </div>
      <div className="index-cards">
        {summaries.map((summary) => (
          <IndexCard key={summary.index.id} summary={summary} />
        ))}
      </div>
    </section>
  );
}
