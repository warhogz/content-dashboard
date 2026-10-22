"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, CalendarClock, Globe, Instagram, Languages, Link2, MapPin, Megaphone, StickyNote, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";
import {
  audienceUnit,
  deadlineToneColor,
  formatAudience,
  formatAudienceWithUnit,
  getOfferDeadline,
  hostLabel,
  mediaStatusColorMap,
  splitLines
} from "@/lib/media";
import { MediaOutletRow } from "@/lib/types";

type LinkAction = { key: string; href: string; label: string; icon: typeof Instagram };

function outletLinks(outlet: MediaOutletRow): LinkAction[] {
  return [
    outlet.instagram_url ? { key: "instagram", href: outlet.instagram_url, label: "Instagram", icon: Instagram } : null,
    outlet.website_url ? { key: "website", href: outlet.website_url, label: "Сайт", icon: Globe } : null,
    outlet.extra_url ? { key: "extra", href: outlet.extra_url, label: hostLabel(outlet.extra_url), icon: Link2 } : null
  ].filter((action): action is LinkAction => Boolean(action));
}

function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
      style={{
        borderColor: color ? `${color}55` : "var(--theme-border)",
        color: color ? "var(--theme-text)" : "var(--theme-text-muted)",
        background: color ? `linear-gradient(135deg, ${color}1f, color-mix(in srgb, var(--theme-surface-soft) 88%, transparent))` : "var(--theme-surface-soft)"
      }}
    >
      {children}
    </span>
  );
}

function OutletLogo({ outlet, size = "md" }: { outlet: MediaOutletRow; size?: "md" | "lg" }) {
  const logoUrl = resolveCardPreviewUrl(outlet.logo_url);
  const box = size === "lg" ? "h-20 w-20 rounded-[22px]" : "h-16 w-16 rounded-2xl";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border ${box}`}
      style={{
        borderColor: "color-mix(in srgb, var(--theme-border) 78%, transparent)",
        background: "var(--theme-surface-strong)",
        boxShadow: "0 12px 34px rgba(0, 0, 0, 0.22)"
      }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={outlet.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span className="text-xl font-semibold" style={{ color: "var(--theme-text)" }}>
          {outlet.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function StatusPill({ outlet }: { outlet: MediaOutletRow }) {
  if (!outlet.status) return null;
  const color = mediaStatusColorMap[outlet.status_color] || mediaStatusColorMap.gray;

  return (
    <div
      className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
      style={{
        borderColor: `${color}55`,
        color: "var(--theme-text)",
        background: `linear-gradient(135deg, ${color}22, color-mix(in srgb, var(--theme-surface-soft) 88%, transparent))`,
        boxShadow: `0 0 0 1px ${color}16 inset, 0 0 26px ${color}22`
      }}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />
      {outlet.status}
    </div>
  );
}

function metaLine(outlet: MediaOutletRow) {
  return [outlet.region, outlet.founded_year ? `с ${outlet.founded_year}` : null, outlet.languages].filter(Boolean).join(" · ");
}

function clamp(lines: number) {
  return { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical" as const, overflow: "hidden" };
}

export function MediaOutletCard({ outlet, interactive = true }: { outlet: MediaOutletRow; interactive?: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const audience = formatAudienceWithUnit(outlet);
  const deadline = getOfferDeadline(outlet.offer_until);
  const formats = splitLines(outlet.formats);
  const links = outletLinks(outlet);
  const meta = metaLine(outlet);

  return (
    <>
    <article
      className="flex h-full flex-col rounded-[30px] border backdrop-blur-2xl"
      style={{
        borderColor: "var(--theme-border)",
        background: "linear-gradient(180deg, color-mix(in srgb, var(--theme-surface) 96%, transparent), color-mix(in srgb, var(--theme-surface-soft) 90%, transparent))",
        boxShadow: "var(--theme-shadow)"
      }}
    >
      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-start gap-4">
          <OutletLogo outlet={outlet} />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold leading-snug" style={{ color: "var(--theme-text)", ...clamp(2) }}>
              {outlet.name}
            </div>
            {meta ? (
              <div className="mt-1 truncate text-sm" style={{ color: "var(--theme-text-muted)" }}>
                {meta}
              </div>
            ) : null}
            <div className="mt-3">
              <StatusPill outlet={outlet} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip>
            <Users className="h-3.5 w-3.5 shrink-0" />
            {audience || "Аудитория не указана"}
          </Chip>
          {deadline ? (
            <Chip color={deadlineToneColor[deadline.tone]}>
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              {deadline.label}
            </Chip>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-3xl font-semibold tracking-tight sm:text-[2rem]" style={{ color: "var(--theme-text)" }}>
              {outlet.price || "По запросу"}
            </div>
            {outlet.price_note ? (
              <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
                {outlet.price_note}
              </div>
            ) : null}
          </div>

          {outlet.price_alt ? (
            <div
              className="rounded-2xl border px-4 py-3"
              style={{
                borderColor: "color-mix(in srgb, #22c55e 34%, var(--theme-border))",
                background: "linear-gradient(135deg, rgba(34,197,94,.10), color-mix(in srgb, var(--theme-surface-soft) 92%, transparent))"
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--theme-text-muted)" }}>
                  При условиях
                </span>
                <span className="text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
                  {outlet.price_alt}
                </span>
              </div>
              {outlet.price_alt_note ? (
                <div className="mt-1 text-xs leading-5" style={{ color: "var(--theme-text-muted)", ...clamp(2) }}>
                  {outlet.price_alt_note}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {formats.length ? (
          <ul className="space-y-1.5 text-sm leading-5" style={{ color: "var(--theme-text-muted)" }}>
            {formats.slice(0, 3).map((line) => (
              <li key={line} className="flex gap-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--theme-accent-strong)" }} />
                <span style={clamp(2)}>{line}</span>
              </li>
            ))}
            {formats.length > 3 ? (
              <li className="pl-4 text-xs" style={{ color: "var(--theme-label)" }}>
                + ещё {formats.length - 3}
              </li>
            ) : null}
          </ul>
        ) : null}

        {outlet.open_questions ? (
          <div
            className="flex gap-2.5 rounded-2xl border px-3.5 py-3 text-xs leading-5"
            style={{ borderColor: "rgba(249,115,22,.34)", background: "rgba(249,115,22,.08)", color: "var(--theme-text)" }}
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#f97316" }} />
            <span style={clamp(2)}>{outlet.open_questions}</span>
          </div>
        ) : null}

        <div className="mt-auto grid gap-3">
          {links.length ? (
            <div className={`grid gap-3 ${links.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {links.slice(0, 2).map((action) => (
                <a key={action.key} href={action.href} target="_blank" rel="noreferrer" className="w-full">
                  <Button variant="outline" className="h-11 w-full justify-center">
                    <action.icon className="h-4 w-4" />
                    <span className="truncate">{action.label}</span>
                  </Button>
                </a>
              ))}
            </div>
          ) : null}
          <Button variant="secondary" className="h-11 w-full" onClick={() => interactive && setDetailsOpen(true)} disabled={!interactive}>
            Подробнее
          </Button>
        </div>
      </div>
    </article>

    {interactive ? <MediaOutletDetails outlet={outlet} open={detailsOpen} onOpenChange={setDetailsOpen} /> : null}
    </>
  );
}

function DetailSection({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: ReactNode }) {
  return (
    <section
      className="rounded-[24px] border p-4 sm:p-5"
      style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)" }}
    >
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: "var(--theme-text-muted)" }}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="text-sm leading-6" style={{ color: "var(--theme-text)" }}>
        {children}
      </div>
    </section>
  );
}

export function MediaOutletDetails({
  outlet,
  open,
  onOpenChange
}: {
  outlet: MediaOutletRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const audience = formatAudience(outlet.audience);
  const deadline = getOfferDeadline(outlet.offer_until);
  const formats = splitLines(outlet.formats);
  const links = outletLinks(outlet);
  const meta = metaLine(outlet);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={outlet.name} description={meta || undefined} className="sm:max-w-3xl">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <OutletLogo outlet={outlet} size="lg" />
          <div className="flex flex-wrap gap-2">
            <StatusPill outlet={outlet} />
            {deadline ? (
              <Chip color={deadlineToneColor[deadline.tone]}>
                <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                {deadline.label}
              </Chip>
            ) : null}
            {outlet.region ? (
              <Chip>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {outlet.region}
              </Chip>
            ) : null}
            {outlet.languages ? (
              <Chip>
                <Languages className="h-3.5 w-3.5 shrink-0" />
                {outlet.languages}
              </Chip>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailSection icon={Wallet} title="Стоимость">
            <div className="text-2xl font-semibold tracking-tight">{outlet.price || "По запросу"}</div>
            {outlet.price_note ? <div style={{ color: "var(--theme-text-muted)" }}>{outlet.price_note}</div> : null}
            {outlet.price_alt ? (
              <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--theme-border)" }}>
                <div className="text-lg font-semibold">{outlet.price_alt}</div>
                {outlet.price_alt_note ? <div style={{ color: "var(--theme-text-muted)" }}>{outlet.price_alt_note}</div> : null}
              </div>
            ) : null}
          </DetailSection>

          <DetailSection icon={Users} title="Аудитория">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">{audience || "—"}</span>
              {audience ? <span style={{ color: "var(--theme-text-muted)" }}>{audienceUnit(outlet.audience_type)}</span> : null}
            </div>
            {outlet.audience_note ? <div style={{ color: "var(--theme-text-muted)" }}>{outlet.audience_note}</div> : null}
          </DetailSection>
        </div>

        {formats.length ? (
          <DetailSection icon={Megaphone} title="Формат размещения">
            <ul className="space-y-2">
              {formats.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--theme-accent-strong)" }} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </DetailSection>
        ) : null}

        {outlet.payment_terms || outlet.offer_until ? (
          <DetailSection icon={CalendarClock} title="Условия">
            {outlet.payment_terms ? <p>{outlet.payment_terms}</p> : null}
            {deadline ? (
              <p className="mt-1" style={{ color: "var(--theme-text-muted)" }}>
                Предложение действует {deadline.tone === "expired" ? `до ${deadline.dateLabel} — срок истёк` : `до ${deadline.dateLabel}`}
              </p>
            ) : null}
          </DetailSection>
        ) : null}

        {outlet.open_questions ? (
          <section
            className="flex gap-3 rounded-[24px] border p-4 text-sm leading-6 sm:p-5"
            style={{ borderColor: "rgba(249,115,22,.34)", background: "rgba(249,115,22,.08)", color: "var(--theme-text)" }}
          >
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0" style={{ color: "#f97316" }} />
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: "#f97316" }}>
                Нужно уточнить
              </div>
              {outlet.open_questions}
            </div>
          </section>
        ) : null}

        {outlet.notes ? (
          <DetailSection icon={StickyNote} title="Заметки">
            <p className="whitespace-pre-line">{outlet.notes}</p>
          </DetailSection>
        ) : null}

        {links.length ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {links.map((action) => (
              <a key={action.key} href={action.href} target="_blank" rel="noreferrer" className="w-full">
                <Button variant="outline" className="h-11 w-full justify-center">
                  <action.icon className="h-4 w-4" />
                  <span className="truncate">{action.label}</span>
                </Button>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
