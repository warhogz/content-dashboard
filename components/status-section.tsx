import { Card, CardContent } from "@/components/ui/card";
import { ContentCard, StatusRow } from "@/lib/types";
import { CardItem } from "@/components/card-item";
import type { CardSortMode } from "@/lib/public-cards";

function cardDateValue(card: ContentCard) {
  return card.created_at ? new Date(card.created_at).getTime() : 0;
}

export function StatusSection({ status, cards, sortMode = "oldest" }: { status: StatusRow; cards: ContentCard[]; sortMode?: CardSortMode }) {
  const visibleCards = cards
    .filter((card) => card.status_id === status.id && !card.is_hidden)
    .sort((a, b) => {
      const pinnedDiff = Number(b.is_pinned) - Number(a.is_pinned);
      if (pinnedDiff !== 0) return pinnedDiff;

      const dateDiff = sortMode === "newest" ? cardDateValue(b) - cardDateValue(a) : cardDateValue(a) - cardDateValue(b);
      if (dateDiff !== 0) return dateDiff;

      return sortMode === "newest" ? b.sort_order - a.sort_order : a.sort_order - b.sort_order;
    });

  if (!status.show_on_public) return null;

  return (
    <section
      className="space-y-5 rounded-[32px] border p-5 backdrop-blur-2xl sm:p-6"
      style={{
        borderColor: `${status.color}40`,
        background: "var(--theme-status-bg)",
        boxShadow: `0 0 0 1px ${status.color}14 inset, var(--theme-shadow), 0 0 44px ${status.color}16`
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: status.color, boxShadow: `0 0 18px ${status.color}` }} />
            <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--theme-text)" }}>
              {status.title}
            </h2>
          </div>
          <p className="mt-2 text-sm" style={{ color: "var(--theme-text-muted)" }}>
            {visibleCards.length} карточек в этом статусе
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleCards.length ? (
          visibleCards.map((item, index) => <CardItem key={item.id} item={item} compact imagePriority={index < 3 ? "high" : "auto"} />)
        ) : (
          <Card className="border-dashed" style={{ background: "var(--theme-surface-soft)" }}>
            <CardContent className="p-8 text-center text-sm" style={{ color: "var(--theme-text-muted)" }}>
              Пока нет карточек в этом статусе.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
