"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api-client";
import { executionViewSchema } from "../types";

export function useResumeExecution(id: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post(`/api/executions/${id}/resume`, {}, executionViewSchema),
    onSuccess: (view) => queryClient.setQueryData(["execution", id], view),
  });
}
