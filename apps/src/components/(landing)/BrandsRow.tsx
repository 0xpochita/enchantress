import { CryptoIcon } from "@/components/ui";

const BRANDS = [
  { name: "Ethereum", iconKey: "eth" },
  { name: "Base", iconKey: "base" },
  { name: "Arbitrum", iconKey: "arb" },
  { name: "Monad", iconKey: "monad" },
  { name: "Aurora Intents", iconKey: "/logo/aurora-logo.avif" },
  { name: "Privy", iconKey: "/logo/privy.png" },
  { name: "Aave V3", iconKey: "/crypto/aave.png" },
  { name: "Neverland", iconKey: "/logo/neverland-logo.jpg" },
  { name: "Morpho", iconKey: "/crypto/morpho.png" },
  { name: "Uniswap", iconKey: "uni" },
];

function BrandList({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="brands" aria-hidden={hidden || undefined}>
      {BRANDS.map((brand) => (
        <li key={brand.name} className="brand-item">
          <CryptoIcon iconKey={brand.iconKey} label="" size={22} />
          {brand.name}
        </li>
      ))}
    </ul>
  );
}

export function BrandsRow() {
  return (
    <section
      id="chains"
      aria-label="Chains, protocols and partners"
      className="brands-marquee"
    >
      <div className="brands-track">
        <BrandList />
        <BrandList hidden />
      </div>
    </section>
  );
}
