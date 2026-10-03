import Link from "next/link";
import { ThemedLogoMark } from "@/components/ui";

const PRODUCT_LINKS = [
  { href: "/deposit", label: "Deposit" },
  { href: "/invest", label: "Indexes" },
  { href: "/create", label: "Create index" },
  { href: "/portfolio", label: "Portfolio" },
];

const BUILT_WITH = [
  { href: "https://monad.xyz", label: "Monad" },
  { href: "https://privy.io", label: "Privy" },
  { href: "https://intents.aurora.dev", label: "Aurora Intents" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: typeof PRODUCT_LINKS;
}) {
  const external = (href: string) => href.startsWith("http");
  return (
    <div className="footer-column">
      <p className="footer-title">{title}</p>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              {...(external(link.href) && {
                target: "_blank",
                rel: "noreferrer",
              })}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/" className="nav-logo">
            <ThemedLogoMark />
            enchantress
          </Link>
          <p>Yield indexes on Monad, funded from any chain.</p>
        </div>
        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Built with" links={BUILT_WITH} />
      </div>
      <div className="footer-bottom">
        <span>© 2026 Enchantress</span>
        <span>Non-custodial. DeFi yields change and carry risk.</span>
      </div>
    </footer>
  );
}
