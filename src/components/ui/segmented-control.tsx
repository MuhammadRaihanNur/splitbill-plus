export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--surface-muted)] p-1"
    >
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-lg px-3 text-sm font-bold ${value === option.value ? "bg-[var(--surface-card)] text-[var(--brand-500)] shadow-sm" : "text-[var(--text-secondary)]"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
