"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ThemedLogoMark, ThemeToggle } from "@/components/ui";
import { useMobileMenu } from "@/hooks/useMobileMenu";

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
        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/create" className="btn-login" onClick={menu.close}>
            Create index
          </Link>
          <Link href="/deposit" className="btn-signup" onClick={menu.close}>
            Launch app
            <span className="btn-arrow" aria-hidden>
              <ArrowRight />
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
