import { CardTypeRow } from "@/lib/types";

export function TypeBadge({ type }: { type?: Pick<CardTypeRow, "title"> }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-strong)", color: "var(--theme-text-muted)" }}
    >
      {type?.title || "Без типа"}
    </span>
  );
}
