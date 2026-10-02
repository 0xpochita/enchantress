import type { ReactNode } from "react";
import { AppDecor } from "./AppDecor";
import { Navbar } from "./Navbar";

export function MainShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppDecor />
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        {children}
      </main>
    </div>
  );
}
