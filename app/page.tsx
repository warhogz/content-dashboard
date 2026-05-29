import { getDashboardData } from "@/lib/supabase/data";
import { PublicDashboard } from "@/components/public-dashboard";

const statusPriority: Record<string, number> = { done: 1, "waiting-feedback": 2, revisions: 3, "in-progress": 4, archive: 5 };
const heroStatusSlugs = ["done", "waiting-feedback", "revisions"] as const;

export default async function HomePage() {
  const { statuses, types, cards } = await getDashboardData();
  const visibleCards = cards.filter((card) => !card.is_hidden);
  const activeStatuses = [...statuses].filter((status) => status.show_on_public).sort((a, b) => {
    const pa = statusPriority[a.slug] ?? 100 + a.sort_order;
    const pb = statusPriority[b.slug] ?? 100 + b.sort_order;
    return pa - pb || a.sort_order - b.sort_order;
  });

  const heroStats = heroStatusSlugs.map((slug) => {
    const status = activeStatuses.find((item) => item.slug === slug);
    return {
      slug,
      title: status?.title ?? slug,
      color: status?.color ?? "#64748b",
      count: status ? visibleCards.filter((card) => card.status_id === status.id).length : 0
    };
  });

  return (
    <main className="page-shell py-6 sm:py-8">
      <section className="mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,100,150,0.14),transparent_40%),linear-gradient(180deg,rgba(40,10,24,0.82),rgba(14,6,12,0.92))] p-5 shadow-[0_30px_100px_rgba(0,0,0,.35)] backdrop-blur-2xl sm:p-6 lg:p-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="max-w-2xl">
            <div className="label">Лента контента</div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3">
            {heroStats.map((item) => (
              <div
                key={item.slug}
                className="rounded-[26px] border bg-white/[0.03] px-4 py-4 text-left backdrop-blur-xl sm:px-5"
                style={{
                  borderColor: `${item.color}55`,
                  boxShadow: `0 0 0 1px ${item.color}18 inset, 0 0 38px ${item.color}24`
                }}
              >
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">{item.title}</div>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div className="text-3xl font-semibold text-white sm:text-4xl">{item.count}</div>
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 18px ${item.color}` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicDashboard statuses={activeStatuses} types={types} cards={cards} />
    </main>
  );
}
