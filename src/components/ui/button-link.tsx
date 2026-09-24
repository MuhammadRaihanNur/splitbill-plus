import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: "primary" | "secondary";
  showArrow?: boolean;
}

export function ButtonLink({
  className,
  variant = "primary",
  showArrow = false,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-5 py-3 text-sm font-bold transition duration-[var(--motion-fast)] hover:-translate-y-0.5",
        variant === "primary"
          ? "bg-[var(--brand-500)] text-white shadow-[0_10px_24px_rgba(22,119,255,0.25)] hover:bg-[var(--brand-600)]"
          : "border border-[var(--brand-100)] bg-[var(--surface-card)] text-[var(--brand-600)] hover:bg-[var(--brand-50)]",
        className,
      )}
      {...props}
    >
      {children}
      {showArrow ? (
        <ArrowRight aria-hidden="true" size={17} strokeWidth={2.3} />
      ) : null}
    </Link>
  );
}
