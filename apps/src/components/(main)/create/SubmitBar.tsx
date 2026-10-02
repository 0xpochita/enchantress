import Link from "next/link";
import { buttonClassName } from "@/components/ui";
import type { DraftStatus } from "@/hooks/useIndexDraft";
import { formatUsd } from "@/utils/format";

interface SubmitBarProps {
  status: DraftStatus;
  errors: string[];
  depositUsd: number;
  onSubmit: () => void;
}

export function SubmitBar({
  status,
  errors,
  depositUsd,
  onSubmit,
}: SubmitBarProps) {
  if (status === "submitted") {
    return (
      <output className="flex flex-col gap-3 rounded-md bg-surface-raised p-4">
        <p className="text-positive">
          Index created. This is mock data, nothing was sent onchain.
        </p>
        <Link
          href="/invest"
          className={buttonClassName("secondary", "px-4 py-2 text-sm")}
        >
          Back to indexes
        </Link>
      </output>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={errors.length > 0}
        onClick={onSubmit}
        className={buttonClassName("primary", "w-full py-3")}
      >
        Create & deposit {formatUsd(depositUsd)}
      </button>
      {errors.length > 0 && (
        <p className="text-sm text-ink-subtle">{errors[0]}</p>
      )}
    </div>
  );
}
