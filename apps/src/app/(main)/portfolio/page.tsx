import { PortfolioView } from "@/components/(main)";
import { getBridgeSource } from "@/features/bridge/services/bridge-catalog";

export const metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const source = await getBridgeSource();
  return <PortfolioView catalog={source.catalog} />;
}
