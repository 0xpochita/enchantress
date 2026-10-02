import type { ReactNode } from "react";
import { LandingNav } from "./LandingNav";

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing">
      <LandingNav />
      <main className="contents">{children}</main>
    </div>
  );
}
