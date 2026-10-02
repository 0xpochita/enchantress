import { IndexDetailView } from "@/components/(main)";

export default async function IndexPage({
  params,
}: PageProps<"/indexes/[id]">) {
  const { id } = await params;
  return <IndexDetailView indexId={id} />;
}
