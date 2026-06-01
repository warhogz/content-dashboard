import { getDashboardData } from "@/lib/supabase/data";
import { PublicDashboard } from "@/components/public-dashboard";

const statusPriority: Record<string, number> = { done: 1, "waiting-feedback": 2, revisions: 3, "in-progress": 4, archive: 5 };

export default async function HomePage() {
  const { statuses, types, cards } = await getDashboardData();
  const activeStatuses = [...statuses].filter((status) => status.show_on_public).sort((a, b) => {
    const pa = statusPriority[a.slug] ?? 100 + a.sort_order;
    const pb = statusPriority[b.slug] ?? 100 + b.sort_order;
    return pa - pb || a.sort_order - b.sort_order;
  });

  return (
    <main className="page-shell py-6 sm:py-8">
      <PublicDashboard statuses={activeStatuses} types={types} cards={cards} />
    </main>
  );
}
