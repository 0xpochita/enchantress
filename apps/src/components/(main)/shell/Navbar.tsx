import Link from "next/link";
import { ThemedLogoMark, ThemeToggle } from "@/components/ui";
import { NavLinks } from "./NavLinks";
import { NetworkBadge } from "./NetworkBadge";
import { WalletButton } from "./WalletButton";

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-y-2 px-4 py-3 md:grid-cols-[1fr_auto_1fr] md:px-8">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 text-[1.05rem] font-bold tracking-[-0.01em]"
        >
          <ThemedLogoMark />
          enchantress
        </Link>
        <NavLinks />
        <div className="flex items-center justify-end gap-2">
          <NetworkBadge />
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
