import type { Address } from "viem";
import type { MonadTokenSymbol } from "@/features/chain/config/tokens";

interface VenueBase {
  id: string;
  name: string;
  iconKey: string;
}

export interface AavePoolVenue extends VenueBase {
  kind: "aave-pool";
  pool: Address;
  dataProvider: Address;
  oracle: Address;
  assets: MonadTokenSymbol[];
}

export interface Erc4626Venue extends VenueBase {
  kind: "erc4626";
  vaults: Partial<Record<MonadTokenSymbol, Address>>;
}

export type VenueConfig = AavePoolVenue | Erc4626Venue;

export const VENUE_CONFIGS: VenueConfig[] = [
  {
    id: "aave-v3",
    name: "Aave V3",
    iconKey: "/crypto/aave.png",
    kind: "aave-pool",
    pool: "0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef",
    dataProvider: "0xB65A68B98274ef7D9a60E0C0747dD1BEc3D32fad",
    oracle: "0x0c02b2c2038066C10Eab8fe1D5Cdb73d5a78A1Bf",
    assets: ["USDC", "USDT0", "AUSD", "WETH", "cbBTC"],
  },
  {
    id: "neverland",
    name: "Neverland",
    iconKey: "/logo/neverland-logo.jpg",
    kind: "aave-pool",
    pool: "0x80F00661b13CC5F6ccd3885bE7b4C9c67545D585",
    dataProvider: "0xfd0b6b6F736376F7B99ee989c749007c7757fDba",
    oracle: "0x94bbA11004B9877d13bb5E1aE29319b6f7bDEdD4",
    assets: ["USDC", "USDT0", "AUSD", "WETH", "WMON", "cbBTC", "WBTC"],
  },
  {
    id: "morpho",
    name: "Morpho",
    iconKey: "/crypto/morpho.png",
    kind: "erc4626",
    vaults: {
      USDC: "0x802c91d807A8DaCA257c4708ab264B6520964e44",
      USDT0: "0x961a59Fe249b9795FAE7fA35f9E89629689D5278",
      WETH: "0xba8424EBBEd6C51bEa6d6D903B8815838E6a0322",
    },
  },
];

export const VAULT_CHAIN_ID = "monad";
