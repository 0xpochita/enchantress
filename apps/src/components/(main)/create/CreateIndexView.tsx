import {
  DEFAULT_DEPOSIT_TOKEN_ID,
  getChains,
  getMarketCatalog,
  getTokens,
  POPULAR_TOKEN_IDS,
  WALLET_BALANCES,
} from "@/lib/market";
import type { DraftCatalog } from "@/utils/draft";
import type { TokenCatalog } from "../token-select/TokenSelectModal";
import { CreateIndexForm } from "./CreateIndexForm";

async function buildCatalogs(): Promise<{
  catalog: DraftCatalog;
  tokenCatalog: TokenCatalog;
}> {
  const tokens = getTokens();
  const market = await getMarketCatalog();
  return {
    catalog: {
      venues: market.venues,
      vaultAssets: market.assets,
      tokens,
      defaultDepositTokenId: DEFAULT_DEPOSIT_TOKEN_ID,
    },
    tokenCatalog: {
      chains: getChains(),
      tokens,
      balances: WALLET_BALANCES,
      popularTokenIds: POPULAR_TOKEN_IDS,
    },
  };
}

export async function CreateIndexView() {
  const { catalog, tokenCatalog } = await buildCatalogs();
  return <CreateIndexForm catalog={catalog} tokenCatalog={tokenCatalog} />;
}
