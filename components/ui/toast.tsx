"use client";

import * as React from "react";

type ToastItem = { id: string; title: string; description?: string };

const ToastContext = React.createContext<{
  push: (toast: Omit<ToastItem, "id">) => void;
} | null>(null);

export function ToastProvider({ children }: React.PropsWithChildren) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((toast: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border p-4 backdrop-blur-md"
            style={{
              borderColor: "var(--theme-border)",
              background: "var(--theme-panel-bg)",
              color: "var(--theme-text)",
              boxShadow: "var(--theme-shadow-lift)"
            }}
          >
            <div className="text-sm font-semibold">{item.title}</div>
            {item.description ? <div className="mt-1 text-sm" style={{ color: "var(--theme-text-muted)" }}>{item.description}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
