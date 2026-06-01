import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, className, style }: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", className)}
      style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-strong)", color: "var(--theme-text)", ...style }}
    >
      {children}
    </span>
  );
}
