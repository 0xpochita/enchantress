import { ExploreView } from "@/components/(main)";

export default async function InvestPage({
  searchParams,
}: PageProps<"/invest">) {
  const { protocol } = await searchParams;
  return (
    <ExploreView
      venueId={typeof protocol === "string" ? protocol : undefined}
    />
  );
}
