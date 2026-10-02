"use client";

import { motion } from "motion/react";
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
      className="order-last col-span-2 flex justify-center md:order-none md:col-span-1"
    >
      <ul className="flex gap-1 rounded-full bg-surface-raised p-1">
        {NAV_ITEMS.map(({ href, label }) => {
          const isCurrent = isActive(pathname, href);
          return (
            <li key={href} className="relative">
              {isCurrent && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-full bg-surface ring-1 ring-line"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className="relative flex items-center rounded-full px-4 py-1.5 text-[0.85rem] text-ink-muted transition-colors duration-200 ease-out hover:text-ink aria-[current=page]:font-medium aria-[current=page]:text-ink"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
