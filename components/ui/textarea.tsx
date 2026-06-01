import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-28 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition placeholder:text-[color:var(--theme-text-muted)] focus:ring-4 focus:ring-[var(--theme-input-ring)]",
        props.className
      )}
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-input-bg)",
        color: "var(--theme-text)",
        boxShadow: "var(--theme-shadow-lift)"
      }}
    />
  );
}
