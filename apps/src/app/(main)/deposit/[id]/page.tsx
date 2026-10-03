import { ProtocolDetailView } from "@/components/(main)";

export default async function ProtocolPage({
  params,
}: PageProps<"/deposit/[id]">) {
  const { id } = await params;
  return <ProtocolDetailView venueId={id} />;
}
