"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { buttonClassName } from "@/components/ui";
import { useDelegation } from "@/features/wallet";

function RevokeWarning({ onCancel }: { onCancel: () => void }) {
  const delegation = useDelegation();
  const revoke = useMutation({ mutationFn: delegation.revoke });
  return (
    <div className="flex max-w-sm flex-col gap-3 rounded-lg border border-line bg-surface-raised p-4 text-sm">
      <p role="alert" className="text-ink-muted">
        Enchantress will no longer be able to move funds into vaults for you.
        Any deposit or withdrawal still in progress will fail. Your positions
        stay in your wallet.
      </p>
      {revoke.error && <p className="text-ink">{revoke.error.message}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => revoke.mutate()}
          disabled={revoke.isPending}
          className={buttonClassName("primary", "px-4 py-2 text-sm")}
        >
          {revoke.isPending ? "Revoking..." : "Revoke access"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={buttonClassName("ghost", "px-4 py-2 text-sm")}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function RevokeAccess() {
  const delegation = useDelegation();
  const [isConfirming, setIsConfirming] = useState(false);
  if (!delegation.isDelegated) return null;
  if (isConfirming)
    return <RevokeWarning onCancel={() => setIsConfirming(false)} />;
  return (
    <button
      type="button"
      onClick={() => setIsConfirming(true)}
      className={buttonClassName("ghost", "px-4 py-2 text-sm")}
    >
      Revoke app access
    </button>
  );
}
