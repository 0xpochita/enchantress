import {
  getBridgeSource,
  MONAD_USDC_ASSET_ID,
} from "@/features/bridge/services/bridge-catalog";
import { isOfferedForNewIndex } from "@/features/chain/config/tokens";
import { getMarketCatalog } from "@/features/indexes/services/index-catalog";
import { CreateIndexForm } from "./CreateIndexForm";

export async function CreateIndexView() {
  const [market, source] = await Promise.all([
    getMarketCatalog(),
    getBridgeSource(),
  ]);
  const catalog = {
    venues: market.venues,
    allVenues: market.allVenues,
    vaultAssets: market.assets.filter((a) => isOfferedForNewIndex(a.symbol)),
    tokens: source.catalog.tokens,
    defaultDepositTokenId: MONAD_USDC_ASSET_ID,
  };
  return <CreateIndexForm catalog={catalog} bridgeCatalog={source.catalog} />;
}
