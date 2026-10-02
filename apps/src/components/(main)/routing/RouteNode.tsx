import type { ReactNode } from "react";
import { CryptoIcon } from "@/components/ui";

interface RouteNodeProps {
  iconKey?: string;
  badgeIconKey?: string;
  icon?: ReactNode;
  title: string;
  detail?: ReactNode;
}

export function RouteNode({
  iconKey,
  badgeIconKey,
  icon,
  title,
  detail,
}: RouteNodeProps) {
  return (
    <div className="flex min-w-40 items-center gap-3 rounded-md border border-line bg-surface-raised px-3 py-2">
      {iconKey ? (
        <CryptoIcon
          iconKey={iconKey}
          label=""
          badgeIconKey={badgeIconKey}
          size={28}
        />
      ) : (
        icon
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium whitespace-nowrap">{title}</span>
        {detail && <span className="text-xs text-ink-muted">{detail}</span>}
      </div>
    </div>
  );
}
