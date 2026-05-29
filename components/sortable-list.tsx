"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { ContentCard, StatusRow } from "@/lib/types";
import { CardItem } from "@/components/card-item";

function SortableCard({
  item,
  onCopy,
  onToggleHidden,
  onTogglePinned
}: {
  item: ContentCard;
  onCopy?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  onTogglePinned?: (id: string) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1 }} {...attributes} {...listeners}>
      <CardItem item={item} onCopy={onCopy} onToggleHidden={onToggleHidden} onTogglePinned={onTogglePinned} />
    </div>
  );
}

export function SortableList({
  cards,
  statuses,
  onDragEnd,
  onCopy,
  onToggleHidden,
  onTogglePinned
}: {
  cards: ContentCard[];
  statuses: StatusRow[];
  onDragEnd: (event: DragEndEvent) => void;
  onCopy?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  onTogglePinned?: (id: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="grid gap-8">
        {statuses.map((status) => {
          const items = cards.filter((card) => card.status_id === status.id);
          return (
            <section key={status.id} className="space-y-4">
              <div className="flex items-end justify-between">
                <h2 className="text-xl font-semibold">{status.title}</h2>
                <span className="text-sm text-slate-500">{items.length}</span>
              </div>
              <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-4">
                  {items.map((item) => (
                    <SortableCard key={item.id} item={item} onCopy={onCopy} onToggleHidden={onToggleHidden} onTogglePinned={onTogglePinned} />
                  ))}
                  {!items.length ? (
                    <Card className="border-dashed bg-white/50 p-8 text-center text-sm text-slate-500">
                      Пока пусто
                    </Card>
                  ) : null}
                </div>
              </SortableContext>
            </section>
          );
        })}
      </div>
    </DndContext>
  );
}
