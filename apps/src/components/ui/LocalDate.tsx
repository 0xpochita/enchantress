"use client";

import { useSyncExternalStore } from "react";
import { formatDate, formatShortDate } from "@/utils/format";

const FORMATS = { short: formatShortDate, medium: formatDate };
const SERVER_TIME_ZONE = "UTC";

function subscribe() {
  return () => {};
}

export function LocalDate({
  iso,
  format = "short",
}: {
  iso: string;
  format?: keyof typeof FORMATS;
}) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const timeZone = isClient ? undefined : SERVER_TIME_ZONE;
  return <time dateTime={iso}>{FORMATS[format](iso, timeZone)}</time>;
}
