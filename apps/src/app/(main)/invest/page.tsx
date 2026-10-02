import { ExploreView } from "@/components/(main)";

export default async function InvestPage({
  searchParams,
}: PageProps<"/invest">) {
  const { aggregator } = await searchParams;
  return (
    <ExploreView
      aggregatorId={typeof aggregator === "string" ? aggregator : undefined}
    />
  );
}
