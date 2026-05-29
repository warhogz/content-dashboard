import { Card, CardContent } from "@/components/ui/card";
import { ContentCard, StatusRow } from "@/lib/types";
import { CardItem } from "@/components/card-item";

function cardDateValue(card: ContentCard) {
  return card.created_at ? new Date(card.created_at).getTime() : 0;
}

export function StatusSection({ status, cards }: { status: StatusRow; cards: ContentCard[]; }) {
  const visibleCards = cards
    .filter((card) => card.status_id === status.id && !card.is_hidden)
    .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || cardDateValue(b) - cardDateValue(a) || b.sort_order - a.sort_order);

  if (!status.show_on_public) return null;

  return (
    <section
      className="space-y-5 rounded-[32px] border bg-[linear-gradient(180deg,rgba(35,10,20,0.76),rgba(15,7,12,0.92))] p-5 backdrop-blur-2xl sm:p-6"
      style={{
        borderColor: `${status.color}50`,
        boxShadow: `0 0 0 1px ${status.color}14 inset, 0 24px 80px rgba(0,0,0,.3), 0 0 44px ${status.color}16`
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: status.color, boxShadow: `0 0 18px ${status.color}` }} />
            <h2 className="text-2xl font-semibold tracking-tight text-white">{status.title}</h2>
          </div>
          <p className="mt-2 text-sm text-white/52">{visibleCards.length} карточек в этом статусе</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleCards.length ? visibleCards.map((item) => <CardItem key={item.id} item={item} compact />) : <Card className="border-dashed bg-white/[0.04]"><CardContent className="p-8 text-center text-sm text-white/45">Пока нет карточек в этом статусе.</CardContent></Card>}
      </div>
    </section>
  );
}
