"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, NAV_ITEMS } from "./nav-items";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="order-last flex w-full items-center gap-7 md:order-none md:w-auto"
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isNavActive(pathname, item.href) ? "page" : undefined}
          className="text-[0.95rem] text-ink-muted transition-colors duration-200 ease-out hover:text-ink aria-[current=page]:font-medium aria-[current=page]:text-ink"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
