import { CryptoIcon } from "@/components/ui";

const BRANDS = [
  { name: "Ethereum", iconKey: "eth" },
  { name: "Base", iconKey: "base" },
  { name: "Arbitrum", iconKey: "arb" },
  { name: "Monad", iconKey: "monad" },
];

export function BrandsRow() {
  return (
    <section id="chains" aria-label="Deposit from these chains">
      <ul className="brands">
        {BRANDS.map((brand) => (
          <li key={brand.name} className="brand-item">
            <CryptoIcon iconKey={brand.iconKey} label="" size={22} />
            {brand.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
