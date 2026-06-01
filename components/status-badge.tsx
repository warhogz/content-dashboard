import { StatusRow } from "@/lib/types";

export function StatusBadge({ status }: { status?: Pick<StatusRow, "title" | "color"> }) {
  const color = status?.color || "#f43f5e";

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface-strong)",
        color: "var(--theme-text)",
        boxShadow: `inset 0 0 0 1px ${color}20, 0 0 18px ${color}12`
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {status?.title || "Без статуса"}
    </span>
  );
}
