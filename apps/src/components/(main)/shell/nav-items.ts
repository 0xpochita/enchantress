export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/aggregators", label: "Deposit" },
  { href: "/invest", label: "Invest" },
  { href: "/create", label: "Create" },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/invest")
    return pathname === "/invest" || pathname.startsWith("/indexes");
  return pathname.startsWith(href);
}
