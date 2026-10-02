"use client";

import Link from "next/link";
import { ThemedLogoMark, ThemeToggle } from "@/components/ui";
import { useMobileMenu } from "@/hooks/useMobileMenu";

const NAV_LINKS = [
  { href: "/deposit", label: "Deposit" },
  { href: "/invest", label: "Indexes" },
  { href: "#chains", label: "Chains" },
];

export function LandingNav() {
  const menu = useMobileMenu();
  const activeClass = menu.isOpen ? " active" : "";
  return (
    <nav className="landing-nav" aria-label="Main">
      <Link href="/" className="nav-logo">
        <ThemedLogoMark />
        enchantress
      </Link>
      <button
        type="button"
        className={`menu-toggle${activeClass}`}
        aria-expanded={menu.isOpen}
        aria-controls="landing-menu"
        aria-label="Toggle menu"
        onClick={menu.toggle}
      >
        <span />
        <span />
      </button>
      <div id="landing-menu" className={`nav-menu${activeClass}`}>
        <ul className="nav-links">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={menu.close}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/create" className="btn-login" onClick={menu.close}>
            Create index
          </Link>
          <Link href="/deposit" className="btn-signup" onClick={menu.close}>
            Launch app
          </Link>
        </div>
      </div>
    </nav>
  );
}
