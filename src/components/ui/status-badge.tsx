import { CheckCircle2, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "completed" | "pending";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const isCompleted = status === "completed";
  const Icon = isCompleted ? CheckCircle2 : Clock3;

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        isCompleted
          ? "bg-emerald-50 text-emerald-700"
          : "bg-blue-50 text-blue-700",
      )}
    >
      <Icon aria-hidden="true" size={13} strokeWidth={2.5} />
      {isCompleted ? "Selesai" : "Pending"}
    </span>
  );
}
