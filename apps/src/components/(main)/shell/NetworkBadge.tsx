import { CryptoIcon } from "@/components/ui";

export function NetworkBadge() {
  return (
    <span className="hidden items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-[0.82rem] font-medium sm:flex">
      <CryptoIcon iconKey="monad" label="" size={24} />
      Monad
    </span>
  );
}
