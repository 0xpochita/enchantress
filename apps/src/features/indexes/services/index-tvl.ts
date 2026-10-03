import "server-only";
import { unstable_cache } from "next/cache";
import { allLots } from "@/features/portfolio/services/portfolio-repository";
import { valueLots } from "@/features/portfolio/services/valuation";
import { sumByIndex } from "@/features/portfolio/utils/lots";

const TVL_REVALIDATE_SECONDS = 60;

async function readIndexTvls(): Promise<Record<string, number>> {
  return sumByIndex(await valueLots(await allLots()));
}

export const getIndexTvls = unstable_cache(readIndexTvls, ["index-tvl"], {
  revalidate: TVL_REVALIDATE_SECONDS,
  tags: ["index-tvl"],
});
