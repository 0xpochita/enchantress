export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-strong",
  secondary: "bg-surface-raised text-ink hover:bg-surface-hover",
  ghost: "text-ink-muted hover:bg-surface-raised hover:text-ink",
  danger:
    "bg-negative/10 text-negative ring-1 ring-negative/30 hover:bg-negative/20",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  extra = "",
): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`;
}
