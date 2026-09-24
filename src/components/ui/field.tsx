import { useId, type InputHTMLAttributes, type ReactNode } from "react";
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": hint || error ? helpId : undefined,
        "aria-invalid": Boolean(error) || undefined,
      })}
      {hint || error ? (
        <p
          id={helpId}
          className={`mt-1 text-xs ${error ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}`}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
export const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-500)]";
export type NativeInputProps = InputHTMLAttributes<HTMLInputElement>;
