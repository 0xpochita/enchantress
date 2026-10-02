import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-lg border border-line bg-surface ${className}`}
    >
      {children}
    </section>
  );
}
