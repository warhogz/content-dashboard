import { CanvasSpacePage } from "@/components/canvas-space-page";
import { getDashboardData } from "@/lib/supabase/data";
import { ARCHIVE_STATUS_SLUG, STATUS_PRIORITY } from "@/lib/types";

export default async function CanvasPage() {
  const { statuses, types, cards } = await getDashboardData();

  const canvasStatusSlugs = new Set(["done", "waiting-feedback", "revisions"]);
  const activeStatuses = [...statuses]
    .filter((status) => status.show_on_public && status.slug !== ARCHIVE_STATUS_SLUG && canvasStatusSlugs.has(status.slug))
    .sort((a, b) => {
      const pa = STATUS_PRIORITY[a.slug] ?? 100 + a.sort_order;
      const pb = STATUS_PRIORITY[b.slug] ?? 100 + b.sort_order;
      return pa - pb || a.sort_order - b.sort_order;
    });
  const activeStatusIds = new Set(activeStatuses.map((status) => status.id));
  const canvasCards = cards.filter((card) => card.is_archived || activeStatusIds.has(card.status_id));

  return (
    <main className="min-h-[calc(100vh-5.5rem)]">
      <CanvasSpacePage statuses={activeStatuses} types={types} cards={canvasCards} />
    </main>
  );
}
