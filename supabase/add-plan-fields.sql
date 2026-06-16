alter table public.cards
  add column if not exists project_name text;

alter table public.cards
  add column if not exists room_zone text;

alter table public.cards
  add column if not exists content_category text;

alter table public.cards
  add column if not exists ready_for_plan boolean;

alter table public.cards
  alter column ready_for_plan set default false;

alter table public.cards
  add column if not exists planned_month text;

alter table public.cards
  add column if not exists planned_week text;

alter table public.cards
  add column if not exists planned_day text;

alter table public.cards
  add column if not exists is_main_pick boolean;

alter table public.cards
  alter column is_main_pick set default false;

alter table public.cards
  add column if not exists alternative_for uuid references public.cards(id) on delete set null;

alter table public.cards
  add column if not exists plan_priority integer;
