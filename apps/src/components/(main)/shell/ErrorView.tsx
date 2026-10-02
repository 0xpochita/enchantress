import { buttonClassName } from "@/components/ui/button-styles";

export function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 py-24 text-center"
    >
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-ink-muted">
        We could not load this page. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={buttonClassName("primary", "px-5 py-2 text-sm")}
      >
        Try again
      </button>
    </div>
  );
}
