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
    <main className="page-shell py-8 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <div className="label">Dashboard</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Content Cards</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
          <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Statuses</div>
            <div className="mt-2 text-2xl font-semibold text-white">{activeStatuses.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Cards</div>
            <div className="mt-2 text-2xl font-semibold text-white">{cards.filter((card) => !card.is_hidden).length}</div>
          </div>
        </div>
      </div>

      <PublicDashboard statuses={activeStatuses} types={types} cards={cards} />
    </main>
  );
}
