import { buttonClassName } from "@/components/ui";
import { WALLET_ADDRESS } from "@/lib/market";
import { shortenAddress } from "@/utils/format";

export function WalletButton() {
  return (
    <button
      type="button"
      className={buttonClassName("primary", "px-4 py-2 text-sm")}
    >
      {shortenAddress(WALLET_ADDRESS)}
    </button>
  );
}
