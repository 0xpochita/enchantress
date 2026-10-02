"use client";

import { ErrorView } from "@/components/(main)/shell/ErrorView";

export default function RootError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4">
      <ErrorView onRetry={reset} />
    </main>
  );
}
