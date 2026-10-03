"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-client";
import { quotePreviewSchema } from "../types";

const DEBOUNCE_MS = 500;
const REFRESH_MS = 15_000;

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

export function useBridgePreview(input: {
  originTokenId: string;
  amount: string;
  enabled: boolean;
}) {
  const api = useApi();
  const amount = useDebounced(input.amount);
  const isEnabled = input.enabled && Number(amount) > 0;
  const query = useQuery({
    queryKey: ["bridge-preview", input.originTokenId, amount],
    queryFn: () =>
      api.post(
        "/api/bridge/quote",
        { originTokenId: input.originTokenId, amount },
        quotePreviewSchema,
      ),
    enabled: isEnabled,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  return {
    data: isEnabled ? query.data : undefined,
    isPending: isEnabled && query.isPending,
    isStale: amount !== input.amount,
    error: isEnabled && query.error ? query.error : undefined,
  };
}
