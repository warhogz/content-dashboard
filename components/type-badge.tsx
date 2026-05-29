import { CardTypeRow } from "@/lib/types";

export function TypeBadge({ type }: { type?: Pick<CardTypeRow, "title"> }) {
  return <span className="inline-flex items-center rounded-full border border-white/10 bg-white/7 px-2.5 py-1 text-xs font-medium text-white/75">{type?.title || "Без типа"}</span>;
}
