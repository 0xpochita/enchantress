import { buttonClassName } from "@/components/ui";

interface SubmitBarProps {
  errors: string[];
  label: string;
  isDisabled: boolean;
  onSubmit: () => void;
}

export function SubmitBar({
  errors,
  label,
  isDisabled,
  onSubmit,
}: SubmitBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={isDisabled}
        onClick={onSubmit}
        className={buttonClassName("primary", "w-full py-3 text-sm")}
      >
        {label}
      </button>
      {errors.length > 0 && (
        <p className="px-1 text-xs text-ink-subtle">{errors[0]}</p>
      )}
    </div>
  );
}
