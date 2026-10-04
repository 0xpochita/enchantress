import { Layers } from "lucide-react";
import type { RoutedAllocation } from "@/types/market";
import { formatUsd } from "@/utils/format";
import { FundsTree } from "../index-detail/FundsTree";

interface DraftPreviewProps {
  name: string;
  allocations: RoutedAllocation[];
  depositUsd: number;
}

function EmptyPreview() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-line px-6 py-10 text-center">
      <Layers aria-hidden className="size-6 text-ink-subtle" />
      <p className="text-sm text-ink-muted">
        Pick assets to preview your index.
      </p>
      <p className="max-w-xs text-xs text-ink-subtle">
        Each asset goes to the protocol you pick, or the one paying the most for
        it.
      </p>
    </div>
  );
}

export function DraftPreview({
  name,
  allocations,
  depositUsd,
}: DraftPreviewProps) {
  const heading =
    depositUsd > 0
      ? `How your ${formatUsd(depositUsd)} deposit is split`
      : "Preview";
  return (
    <div className="flex min-w-0 flex-col gap-5 lg:border-l lg:border-line lg:pl-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm text-ink-muted">{heading}</h2>
        <p className="text-xs text-ink-subtle">
          {name.trim() || "Your index"}, grouped by the protocol each slice goes
          into.
        </p>
      </div>
      {allocations.length === 0 ? (
        <EmptyPreview />
      ) : (
        <FundsTree allocations={allocations} previewUsd={0} />
      )}
    </div>
  );
}
