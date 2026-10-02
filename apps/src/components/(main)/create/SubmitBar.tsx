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
      <output className="flex flex-col gap-3 text-sm">
        <span className="text-positive">
          Index created. Mock data, nothing was sent onchain.
        </span>
        <Link
          href="/invest"
          className={buttonClassName("secondary", "w-full py-3 text-sm")}
        >
          Back to indexes
        </Link>
      </output>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={errors.length > 0}
        onClick={onSubmit}
        className={buttonClassName("primary", "w-full py-3 text-sm")}
      >
        Create & deposit {formatUsd(depositUsd)}
      </button>
      {errors.length > 0 && (
        <p className="px-1 text-xs text-ink-subtle">{errors[0]}</p>
      )}
    </div>
  );
}
