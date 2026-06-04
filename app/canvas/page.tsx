import { CanvasSpacePage } from "@/components/canvas-space-page";
import { getDashboardData } from "@/lib/supabase/data";
import { ARCHIVE_STATUS_SLUG, STATUS_PRIORITY } from "@/lib/types";

export default async function CanvasPage() {
  const { statuses, types, cards } = await getDashboardData();

  const activeStatuses = [...statuses]
    .filter((status) => status.show_on_public && status.slug !== ARCHIVE_STATUS_SLUG)
    .sort((a, b) => {
      const pa = STATUS_PRIORITY[a.slug] ?? 100 + a.sort_order;
      const pb = STATUS_PRIORITY[b.slug] ?? 100 + b.sort_order;
      return pa - pb || a.sort_order - b.sort_order;
    });

  return (
    <main className="min-h-[calc(100vh-5.5rem)]">
      <CanvasSpacePage statuses={activeStatuses} types={types} cards={cards} />
    </main>
  );
}
