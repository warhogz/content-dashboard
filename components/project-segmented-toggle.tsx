"use client";

import { cn } from "@/lib/utils";

type Option<T extends string> = {
  value: T;
  label: string;
};

export function ProjectSegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  className
}: {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex items-center gap-1 rounded-full border p-1 backdrop-blur-xl", className)}
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface-soft)",
        boxShadow: "var(--theme-shadow-lift)"
      }}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="rounded-full px-4 py-2 text-sm font-medium transition duration-200"
            style={{
              color: active ? "var(--theme-text)" : "var(--theme-text-muted)",
              background: active ? "var(--theme-surface-strong)" : "transparent",
              boxShadow: active ? "0 0 0 1px var(--theme-border) inset, 0 10px 28px color-mix(in srgb, var(--theme-accent) 16%, transparent)" : "none"
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
