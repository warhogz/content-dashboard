"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/image-preview";
import { StatusBadge } from "@/components/status-badge";
import { TypeBadge } from "@/components/type-badge";
import { ContentCard } from "@/lib/types";

export function FullscreenCardViewer({
  card,
  open,
  onClose
}: {
  card: ContentCard | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && card ? (
        <motion.div
          key={card.id}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            background: "linear-gradient(180deg, rgba(4, 1, 4, .54), rgba(4, 1, 6, .88))",
            backdropFilter: "blur(30px)"
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-[1600px] flex-col overflow-hidden rounded-[28px] border sm:max-h-[calc(100vh-2.5rem)] sm:rounded-[34px] lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,420px)]"
            initial={{ opacity: 0, scale: 0.965, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 10 }}
            transition={{ type: "spring", stiffness: 240, damping: 28, mass: 0.9 }}
            style={{
              borderColor: "var(--theme-border)",
              background: "linear-gradient(180deg, color-mix(in srgb, var(--theme-card-bg) 96%, transparent), color-mix(in srgb, var(--theme-surface-soft) 92%, transparent))",
              boxShadow: "var(--theme-shadow-hover)"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-[1.03] sm:right-4 sm:top-4 sm:h-11 sm:w-11"
              style={{
                borderColor: "var(--theme-border)",
                background: "color-mix(in srgb, var(--theme-surface) 92%, transparent)",
                color: "var(--theme-text)"
              }}
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              className="min-h-0 flex-[1_1_auto] overflow-auto p-3 sm:p-5 lg:p-8"
              initial={{ opacity: 0.7, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.04, duration: 0.26 }}
            >
              <div className="mx-auto flex min-h-full w-full max-w-[980px] items-center justify-center">
                <ImagePreview
                  src={card.thumbnail_url}
                  alt={card.title}
                  aspectRatio={card.aspect_ratio}
                  heightPx={Math.min(Math.max(card.height_px, 420), 760)}
                  cropMode={card.crop_mode}
                  fetchPriority="high"
                  className="max-h-[56vh] sm:max-h-[62vh] lg:max-h-[calc(100vh-10rem)]"
                />
              </div>
            </motion.div>

            <motion.aside
              className="min-h-0 overflow-auto border-t p-4 sm:p-6 lg:border-l lg:border-t-0 lg:p-8"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08, duration: 0.24 }}
              style={{
                borderColor: "var(--theme-border-soft)",
                background: "linear-gradient(180deg, color-mix(in srgb, var(--theme-surface-soft) 92%, transparent), color-mix(in srgb, var(--theme-surface) 94%, transparent))"
              }}
            >
              <div className="flex h-full flex-col">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <TypeBadge type={card.type} />
                    <StatusBadge status={card.status} />
                    {card.project_key === "mena" ? (
                      <Badge style={{ background: "color-mix(in srgb, var(--theme-accent) 16%, transparent)", color: "var(--theme-text)" }}>
                        Mena
                      </Badge>
                    ) : null}
                    {card.is_archived ? (
                      <Badge style={{ background: "color-mix(in srgb, var(--theme-accent) 12%, transparent)", color: "var(--theme-text)" }}>
                        Archive
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <h2 className="text-2xl font-semibold leading-tight sm:text-3xl" style={{ color: "var(--theme-text)" }}>
                      {card.title}
                    </h2>
                    {card.subtitle ? (
                      <p className="mt-3 text-sm leading-7 sm:text-base" style={{ color: "var(--theme-text-muted)" }}>
                        {card.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>

                {card.notes ? (
                  <div
                    className="mt-6 rounded-[24px] border p-4 text-sm leading-7"
                    style={{
                      borderColor: "var(--theme-border)",
                      background: "color-mix(in srgb, var(--theme-surface-soft) 90%, transparent)",
                      color: "var(--theme-text-muted)"
                    }}
                  >
                    {card.notes}
                  </div>
                ) : null}

                <div className="mt-6 grid gap-3 text-sm" style={{ color: "var(--theme-text-muted)" }}>
                  {card.is_archived && card.archived_at ? <div>Archived: {new Date(card.archived_at).toLocaleString("ru-RU")}</div> : null}
                  {card.created_at ? <div>Created: {new Date(card.created_at).toLocaleString("ru-RU")}</div> : null}
                </div>

                <div className="mt-auto pt-6">
                  <a
                    href={card.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-medium transition"
                    style={{
                      borderColor: "var(--theme-border)",
                      background: "var(--theme-surface)",
                      color: "var(--theme-text)"
                    }}
                  >
                    Открыть источник <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
