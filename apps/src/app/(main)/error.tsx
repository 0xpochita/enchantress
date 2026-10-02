"use client";

import { ErrorView } from "@/components/(main)/shell/ErrorView";

export default function MainError({ reset }: { reset: () => void }) {
  return <ErrorView onRetry={reset} />;
}
