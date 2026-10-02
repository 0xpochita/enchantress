import { Sparkles } from "lucide-react";
import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { NetworkBadge } from "./NetworkBadge";
import { WalletButton } from "./WalletButton";

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Sparkles aria-hidden className="size-5 text-accent" />
          enchantress
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-3">
          <NetworkBadge />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
