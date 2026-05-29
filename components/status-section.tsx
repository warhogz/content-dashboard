import { Card, CardContent } from "@/components/ui/card";
import { ContentCard, StatusRow } from "@/lib/types";
import { CardItem } from "@/components/card-item";

export function StatusSection({ status, cards }: { status: StatusRow; cards: ContentCard[]; }) {
  const visibleCards = cards.filter((card) => card.status_id === status.id && !card.is_hidden).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || a.sort_order - b.sort_order);
  if (!status.show_on_public) return null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">{status.title}</h2>
          <p className="mt-1 text-sm text-white/50">{visibleCards.length} cards</p>
        </div>
        <span className="h-3 w-3 rounded-full shadow-[0_0_18px_currentColor]" style={{ backgroundColor: status.color }} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleCards.length ? visibleCards.map((item) => <CardItem key={item.id} item={item} compact />) : <Card className="border-dashed bg-white/[0.04]"><CardContent className="p-8 text-center text-sm text-white/45">No cards in this status yet.</CardContent></Card>}
      </div>
    </section>
  );
}
