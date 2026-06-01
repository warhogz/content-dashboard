"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className
}: React.PropsWithChildren<{ open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; className?: string }>) {
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button aria-label="Закрыть" className="absolute inset-0 backdrop-blur-2xl" style={{ background: "var(--theme-overlay)" }} onClick={() => onOpenChange(false)} />
      <div className={cn("relative z-10 w-full px-0 sm:max-w-4xl sm:px-4", className)}>
        <div
          className="overflow-hidden rounded-t-[30px] border sm:rounded-[32px]"
          style={{
            borderColor: "var(--theme-border)",
            background: "var(--theme-panel-bg)",
            boxShadow: "var(--theme-shadow)"
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6 sm:py-5" style={{ borderColor: "var(--theme-border)" }}>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm" style={{ color: "var(--theme-text-muted)" }}>
                  {description}
                </p>
              ) : null}
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
