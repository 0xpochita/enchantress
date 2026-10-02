import Link from "next/link";
import { ThemedLogoMark } from "@/components/ui";
import { AccountButton } from "@/features/wallet";
import { NavLinks } from "./NavLinks";
import { NetworkBadge } from "./NetworkBadge";
import { ThemeIconButton } from "./ThemeIconButton";

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 w-full bg-canvas/80 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-2 px-4 py-3 md:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-xl font-bold tracking-[-0.02em]"
        >
          <ThemedLogoMark />
          enchantress
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-2">
          <NetworkBadge />
          <AccountButton />
          <ThemeIconButton />
        </div>
      </div>
    </header>
  );
}
