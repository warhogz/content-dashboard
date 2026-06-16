create table if not exists public.plan_weeks (
  id uuid primary key default gen_random_uuid(),
  project_key text not null default 'main'
    check (project_key in ('main', 'mena')),
  month_label text not null,
  month_sort_date date not null,
  week_key text not null
    check (week_key in ('week_1', 'week_2', 'week_3', 'week_4', 'week_5')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint plan_weeks_project_month_week_unique
    unique (project_key, month_sort_date, week_key)
);

create index if not exists plan_weeks_project_month_idx
  on public.plan_weeks (project_key, month_sort_date);

create table if not exists public.plan_entries (
  id uuid primary key default gen_random_uuid(),
  plan_week_id uuid not null
    references public.plan_weeks(id)
    on delete cascade,
  card_id uuid not null
    references public.cards(id)
    on delete cascade,
  day_key text not null
    check (day_key in ('monday', 'tuesday', 'wednesday', 'thursday')),
  role text not null
    check (role in ('main', 'alternative')),
  position smallint not null default 0
    check (
      (role = 'main' and position = 0)
      or
      (role = 'alternative' and position in (1, 2))
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint plan_entries_unique_slot_position
    unique (plan_week_id, day_key, role, position),

  constraint plan_entries_unique_card_per_week
    unique (plan_week_id, card_id)
);

create unique index if not exists plan_entries_one_main_per_day_idx
  on public.plan_entries (plan_week_id, day_key)
  where role = 'main';

create index if not exists plan_entries_week_day_idx
  on public.plan_entries (plan_week_id, day_key, role, position);

create index if not exists plan_entries_card_idx
  on public.plan_entries (card_id);

drop trigger if exists trg_plan_weeks_updated_at on public.plan_weeks;
create trigger trg_plan_weeks_updated_at
before update on public.plan_weeks
for each row execute function public.set_updated_at();

drop trigger if exists trg_plan_entries_updated_at on public.plan_entries;
create trigger trg_plan_entries_updated_at
before update on public.plan_entries
for each row execute function public.set_updated_at();

alter table public.plan_weeks enable row level security;
alter table public.plan_entries enable row level security;

drop policy if exists "public read plan_weeks" on public.plan_weeks;
create policy "public read plan_weeks"
  on public.plan_weeks
  for select
  using (true);

drop policy if exists "authenticated write plan_weeks" on public.plan_weeks;
create policy "authenticated write plan_weeks"
  on public.plan_weeks
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "public read plan_entries" on public.plan_entries;
create policy "public read plan_entries"
  on public.plan_entries
  for select
  using (true);

drop policy if exists "authenticated write plan_entries" on public.plan_entries;
create policy "authenticated write plan_entries"
  on public.plan_entries
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
