import type { ReactNode } from "react";
import { AuroraBackdrop } from "@/components/ui";
import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing">
      <AuroraBackdrop className="aurora-backdrop" />
      <LandingNav />
      <main className="contents">{children}</main>
      <LandingFooter />
    </div>
  );
}
