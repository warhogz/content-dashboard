import { PublicDashboard } from "@/components/public-dashboard";
import { getDashboardData } from "@/lib/supabase/data";
import { ARCHIVE_STATUS_SLUG, STATUS_PRIORITY } from "@/lib/types";

export default async function HomePage() {
  const { statuses, types, cards } = await getDashboardData();

  const activeStatuses = [...statuses]
    .filter((status) => status.show_on_public && status.slug !== ARCHIVE_STATUS_SLUG)
    .sort((a, b) => {
      const pa = STATUS_PRIORITY[a.slug] ?? 100 + a.sort_order;
      const pb = STATUS_PRIORITY[b.slug] ?? 100 + b.sort_order;
      return pa - pb || a.sort_order - b.sort_order;
    });

  return (
    <main className="page-shell py-6 sm:py-8">
      <PublicDashboard statuses={activeStatuses} types={types} cards={cards} />
    </main>
  );
}
