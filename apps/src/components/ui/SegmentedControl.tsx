interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  getLabel?: (value: T) => string;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  getLabel = (option) => option,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="flex flex-wrap gap-1">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className="flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm text-ink-muted transition-colors duration-200 ease-out hover:text-ink aria-pressed:bg-surface-raised aria-pressed:text-ink"
        >
          {getLabel(option)}
        </button>
      ))}
    </fieldset>
  );
}
