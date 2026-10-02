import { BasketDetailView } from "@/components/(main)";

export default async function BasketPage({
  params,
}: PageProps<"/baskets/[id]">) {
  const { id } = await params;
  return <BasketDetailView basketId={id} />;
}
