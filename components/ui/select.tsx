import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn("h-11 w-full appearance-none rounded-2xl border px-4 pr-11 text-sm outline-none transition backdrop-blur-xl focus:ring-4 focus:ring-[var(--theme-input-ring)]", props.className)}
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-input-bg)",
          color: "var(--theme-text)",
          boxShadow: "var(--theme-shadow-lift)"
        }}
      >
        {props.children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center" style={{ color: "var(--theme-text-muted)" }}>
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
}
