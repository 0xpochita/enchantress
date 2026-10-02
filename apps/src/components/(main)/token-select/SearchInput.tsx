import { Search } from "lucide-react";

interface SearchInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ label, value, onChange }: SearchInputProps) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 focus-within:border-accent">
      <Search aria-hidden className="size-4 text-ink-subtle" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        placeholder={label}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-sm outline-none placeholder:text-ink-subtle"
      />
    </label>
  );
}
