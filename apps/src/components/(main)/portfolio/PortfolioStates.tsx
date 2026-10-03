import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClassName, Card } from "@/components/ui";

export function LoadingCard({ label }: { label: string }) {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <span className="sr-only">{label}</span>
      <span className="h-4 w-32 animate-pulse rounded bg-surface-raised" />
      <span className="h-10 w-48 animate-pulse rounded bg-surface-raised" />
      <span className="h-4 w-full animate-pulse rounded bg-surface-raised" />
    </Card>
  );
}

export function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="flex flex-col items-start gap-3 p-6">
      <p role="alert" className="text-sm text-ink-muted">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={buttonClassName("secondary", "px-4 py-2 text-sm")}
      >
        Try again
      </button>
    </Card>
  );
}

export function EmptyCard({
  title,
  children,
  href,
  action,
}: {
  title: string;
  children: ReactNode;
  href: string;
  action: string;
}) {
  return (
    <Card className="flex flex-col items-start gap-3 p-6">
      <h3 className="text-lg font-light">{title}</h3>
      <p className="text-sm text-ink-muted">{children}</p>
      <Link
        href={href}
        className={buttonClassName("primary", "px-4 py-2 text-sm")}
      >
        {action}
      </Link>
    </Card>
  );
}
