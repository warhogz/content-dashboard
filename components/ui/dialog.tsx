"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Dialog({ open, onOpenChange, title, description, children, className }: React.PropsWithChildren<{ open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; className?: string; }>) {
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button aria-label="Закрыть" className="absolute inset-0 bg-[#050306]/82 backdrop-blur-2xl" onClick={() => onOpenChange(false)} />
      <div className={cn("relative z-10 w-full px-0 sm:max-w-4xl sm:px-4", className)}>
        <div className="overflow-hidden rounded-t-[30px] border border-white/10 bg-[#15070e]/88 shadow-[0_34px_120px_rgba(0,0,0,0.56)] backdrop-blur-2xl sm:rounded-[32px]">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              {description ? <p className="mt-1 text-sm text-white/58">{description}</p> : null}
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
