import { BrandsRow } from "./BrandsRow";
import { ClosingCta } from "./ClosingCta";
import { FeatureBento } from "./FeatureBento";
import { HeroCard } from "./HeroCard";
import { HowItWorks } from "./HowItWorks";
import { IndexFlow } from "./IndexFlow";
import { IndexPreview } from "./IndexPreview";

export function LandingView() {
  return (
    <>
      <HeroCard />
      <BrandsRow />
      <HowItWorks />
      <IndexFlow />
      <IndexPreview />
      <FeatureBento />
      <ClosingCta />
    </>
  );
}
