import { ExternalLink } from "lucide-react";

export function TxLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-brand hover:underline"
    >
      View transaction
      <ExternalLink aria-hidden className="size-3" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
