import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}
