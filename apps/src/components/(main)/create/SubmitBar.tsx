import { buttonClassName } from "@/components/ui";

interface SubmitBarProps {
  errors: string[];
  onSubmit: () => void;
}

export function SubmitBar({ errors, onSubmit }: SubmitBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={errors.length > 0}
        onClick={onSubmit}
        className={buttonClassName("primary", "w-full py-3 text-sm")}
      >
        Create
      </button>
      {errors.length > 0 && (
        <p className="px-1 text-xs text-ink-subtle">{errors[0]}</p>
      )}
    </div>
  );
}
