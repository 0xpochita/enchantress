import {
  getBridgeSource,
  MONAD_USDC_ASSET_ID,
} from "@/features/bridge/services/bridge-catalog";
import { getMarketCatalog } from "@/lib/market";
import { CreateIndexForm } from "./CreateIndexForm";

export async function CreateIndexView() {
  const [market, source] = await Promise.all([
    getMarketCatalog(),
    getBridgeSource(),
  ]);
  const catalog = {
    venues: market.venues,
    vaultAssets: market.assets,
    tokens: source.catalog.tokens,
    defaultDepositTokenId: MONAD_USDC_ASSET_ID,
  };
  return <CreateIndexForm catalog={catalog} bridgeCatalog={source.catalog} />;
}
