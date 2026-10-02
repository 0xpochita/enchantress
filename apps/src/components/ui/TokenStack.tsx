import { CryptoIcon } from "./CryptoIcon";

interface StackItem {
  iconKey: string;
  label: string;
}

interface TokenStackProps {
  items: StackItem[];
  size?: number;
}

export function TokenStack({ items, size = 32 }: TokenStackProps) {
  return (
    <span className="flex items-center -space-x-2">
      {items.map((item) => (
        <span key={item.label} className="flex rounded-full">
          <CryptoIcon iconKey={item.iconKey} label={item.label} size={size} />
        </span>
      ))}
    </span>
  );
}
