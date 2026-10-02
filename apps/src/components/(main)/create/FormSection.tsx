import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  htmlFor?: string;
  children: ReactNode;
}

export function FormSection({ title, htmlFor, children }: FormSectionProps) {
  const Label = htmlFor ? "label" : "h3";
  return (
    <div className="flex flex-col gap-3 border-b border-line p-6 last:border-b-0">
      <Label htmlFor={htmlFor} className="text-sm text-ink-muted">
        {title}
      </Label>
      {children}
    </div>
  );
}
