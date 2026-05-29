"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar({ value, onChange, placeholder = "Поиск по карточкам" }: { value: string; onChange: (value: string) => void; placeholder?: string; }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
      <Input className="pl-10" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
