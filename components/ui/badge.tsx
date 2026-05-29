import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-white/10 bg-white/7 px-2.5 py-1 text-xs font-medium text-white/80", className)}>
      {children}
    </span>
  );
}
