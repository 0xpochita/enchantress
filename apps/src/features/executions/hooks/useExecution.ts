"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-client";
import { executionViewSchema } from "../types";
import { shouldPoll } from "../utils/flow";

const POLL_MS = 4000;

export function useExecution(id: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: ["execution", id],
    queryFn: () => api.get(`/api/executions/${id}`, executionViewSchema),
    enabled: id !== null,
    refetchInterval: (query) =>
      shouldPoll(query.state.data?.status) ? POLL_MS : false,
  });
}
