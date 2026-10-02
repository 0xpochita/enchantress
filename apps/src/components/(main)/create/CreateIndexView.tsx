import {
  getChains,
  getTokens,
  getVaultAssets,
  getVenues,
  POPULAR_TOKEN_IDS,
  WALLET_BALANCES,
} from "@/lib/market";
import type { DraftCatalog } from "@/utils/draft";
import type { TokenCatalog } from "../token-select/TokenSelectModal";
import { CreateIndexForm } from "./CreateIndexForm";

const DEFAULT_DEPOSIT_TOKEN_ID = "eth-base";

function buildCatalogs(): {
  catalog: DraftCatalog;
  tokenCatalog: TokenCatalog;
} {
  const tokens = getTokens();
  return {
    catalog: {
      venues: getVenues(),
      vaultAssets: getVaultAssets(),
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

export function CreateIndexView() {
  const { catalog, tokenCatalog } = buildCatalogs();
  return <CreateIndexForm catalog={catalog} tokenCatalog={tokenCatalog} />;
}
