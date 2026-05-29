"use client";

import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export function FilterBar({ types, statusIds, selectedType, selectedStatus, onTypeChange, onStatusChange, onReset }: { types: { id: string; title: string }[]; statusIds: { id: string; title: string }[]; selectedType: string; selectedStatus: string; onTypeChange: (value: string) => void; onStatusChange: (value: string) => void; onReset: () => void; }) {
  const typeOptions = useMemo(() => [{ id: "", title: "All types" }, ...types], [types]);
  const statusOptions = useMemo(() => [{ id: "", title: "All statuses" }, ...statusIds], [statusIds]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
      <Select value={selectedStatus} onChange={(e) => onStatusChange(e.target.value)}>
        {statusOptions.map((s) => <option key={s.id || "all-status"} value={s.id}>{s.title}</option>)}
      </Select>
      <Select value={selectedType} onChange={(e) => onTypeChange(e.target.value)}>
        {typeOptions.map((t) => <option key={t.id || "all-type"} value={t.id}>{t.title}</option>)}
      </Select>
      <Button className="md:col-span-2 xl:col-span-1" variant="outline" onClick={onReset}>Reset</Button>
    </div>
  );
}
