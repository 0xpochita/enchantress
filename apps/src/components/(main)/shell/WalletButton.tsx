import { WALLET_ADDRESS } from "@/lib/market";
import { shortenAddress } from "@/utils/format";

export function WalletButton() {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-full bg-surface-raised py-1 pr-3.5 pl-1 text-[0.9rem] font-medium transition-colors duration-200 hover:bg-surface-hover"
    >
      <span
        aria-hidden
        className="size-7 rounded-full bg-[conic-gradient(from_120deg,var(--brand),var(--positive),var(--accent-strong),var(--brand))]"
      />
      {shortenAddress(WALLET_ADDRESS)}
    </button>
  );
}
