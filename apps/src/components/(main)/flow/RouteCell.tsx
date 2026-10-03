import { CryptoIcon } from "@/components/ui";
import { AuroraIntents } from "./AuroraIntents";

export function RouteCell({ viaAurora }: { viaAurora: boolean }) {
  if (!viaAurora)
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <CryptoIcon iconKey="monad" label="" size={14} />
        Monad
      </span>
    );
  return (
    <span className="whitespace-nowrap">
      <AuroraIntents />
    </span>
  );
}
