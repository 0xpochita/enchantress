import { buttonClassName } from "@/components/ui";
import { WALLET_ADDRESS } from "@/lib/market";
import { shortenAddress } from "@/utils/format";

export function WalletButton() {
  return (
    <button
      type="button"
      className={buttonClassName(
        "primary",
        "px-[18px] py-[7px] text-[0.82rem] font-semibold",
      )}
    >
      {shortenAddress(WALLET_ADDRESS)}
    </button>
  );
}
