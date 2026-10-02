import {
  getAggregators,
  getAggregatorVenues,
  getChains,
  getTokens,
  getVaultAssets,
  POPULAR_TOKEN_IDS,
  WALLET_BALANCES,
} from "@/lib/market";
import type { DraftCatalog } from "@/utils/draft";
import type { TokenCatalog } from "../token-select/TokenSelectModal";
import { CreateBasketForm } from "./CreateBasketForm";

const DEFAULT_DEPOSIT_TOKEN_ID = "eth-base";

function buildCatalogs(): {
  catalog: DraftCatalog;
  tokenCatalog: TokenCatalog;
} {
  const aggregators = getAggregators();
  const tokens = getTokens();
  return {
    catalog: {
      aggregators,
      venuesByAggregator: Object.fromEntries(
        aggregators.map((a) => [a.id, getAggregatorVenues(a)]),
      ),
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

export function CreateBasketView() {
  const { catalog, tokenCatalog } = buildCatalogs();
  return <CreateBasketForm catalog={catalog} tokenCatalog={tokenCatalog} />;
}
