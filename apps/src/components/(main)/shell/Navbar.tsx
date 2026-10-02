import Link from "next/link";
import { ThemedLogoMark, ThemeToggle } from "@/components/ui";
import { NavLinks } from "./NavLinks";
import { NetworkBadge } from "./NetworkBadge";
import { WalletButton } from "./WalletButton";

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 mx-auto w-full max-w-6xl px-4 pt-3 md:px-8">
      <div className="grid grid-cols-[1fr_auto] items-center gap-y-2 rounded-2xl border border-line bg-surface/80 px-4 py-2 backdrop-blur-md md:grid-cols-[1fr_auto_1fr] md:rounded-full md:pl-5">
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
