"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/aggregators", label: "Aggregators" },
  { href: "/invest", label: "Invest" },
  { href: "/create", label: "Create" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/invest")
    return pathname === "/invest" || pathname.startsWith("/baskets");
  return pathname.startsWith(href);
}

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="order-last flex w-full gap-1 md:order-none md:w-auto"
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className="rounded-full px-4 py-2 text-sm text-ink-muted transition-colors duration-200 ease-out hover:text-ink aria-[current=page]:bg-surface-raised aria-[current=page]:text-ink"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
