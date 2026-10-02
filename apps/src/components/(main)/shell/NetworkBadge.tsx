import { CryptoIcon } from "@/components/ui";

export function NetworkBadge() {
  return (
    <span className="hidden items-center gap-2 rounded-full border border-line py-1.5 pr-4 pl-1.5 text-sm sm:flex">
      <CryptoIcon iconKey="monad" label="" size={24} />
      Monad
    </span>
  );
}
