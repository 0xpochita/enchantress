import { AggregatorDetailView } from "@/components/(main)";

export default async function AggregatorPage({
  params,
}: PageProps<"/deposit/[id]">) {
  const { id } = await params;
  return <AggregatorDetailView aggregatorId={id} />;
}
