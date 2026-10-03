"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { indexActivitySchema } from "../types";

async function fetchActivity(indexId: string) {
  const response = await fetch(`/api/indexes/${indexId}/activity`, {
    cache: "no-store",
  });
  if (!response.ok)
    throw new ApiError(response.status, "Could not load the activity.");
  return indexActivitySchema.parse(await response.json());
}

export function useIndexActivity(indexId: string) {
  return useQuery({
    queryKey: ["index-activity", indexId],
    queryFn: () => fetchActivity(indexId),
    staleTime: 30_000,
  });
}
