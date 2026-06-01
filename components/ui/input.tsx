import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-2xl border px-4 text-sm outline-none transition placeholder:text-[color:var(--theme-text-muted)] focus:ring-4 focus:ring-[var(--theme-input-ring)]",
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
