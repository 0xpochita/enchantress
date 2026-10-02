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
    return pathname === "/invest" || pathname.startsWith("/indexes");
  return pathname.startsWith(href);
}

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="order-last col-span-2 flex gap-8 md:order-none md:col-span-1"
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className="text-[0.85rem] text-ink-muted transition-colors duration-200 ease-out hover:text-ink aria-[current=page]:font-medium aria-[current=page]:text-ink"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
