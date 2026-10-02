import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { LandingNav } from "./LandingNav";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className={`landing ${inter.variable}`}>
      <LandingNav />
      <main className="contents">{children}</main>
    </div>
  );
}
