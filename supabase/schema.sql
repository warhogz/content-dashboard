create extension if not exists pgcrypto;

create table if not exists statuses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  color text not null default '#64748b',
  sort_order integer not null default 1,
  is_active boolean not null default true,
  show_on_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists card_types (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  default_aspect_ratio text not null default 'custom',
  default_height_px integer not null default 320,
  default_crop_mode text not null default 'cover',
  is_active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_key text not null default 'main' check (project_key in ('main', 'mena')),
  type_id uuid not null references card_types(id) on delete restrict,
  status_id uuid not null references statuses(id) on delete restrict,
  link text not null,
  thumbnail_url text,
  aspect_ratio text not null default 'custom',
  height_px integer not null default 320,
  crop_mode text not null default 'cover',
  sort_order integer not null default 1,
  is_hidden boolean not null default false,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_from_status_id uuid references statuses(id) on delete set null,
  project_name text,
  room_zone text,
  content_category text,
  ready_for_plan boolean not null default false,
  planned_month text,
  planned_week text,
  planned_day text,
  is_main_pick boolean not null default false,
  alternative_for uuid references cards(id) on delete set null,
  plan_priority integer,
  subtitle text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bloggers (
  id uuid primary key default gen_random_uuid(),
  username text,
  display_name text not null,
  avatar_url text,
  followers bigint,
  price text,
  price_description text,
  status text,
  status_color text not null default 'gray' check (status_color in ('gray', 'blue', 'green', 'yellow', 'orange', 'red', 'purple')),
  notes text,
  instagram_url text,
  material_type text not null default 'none' check (material_type in ('script', 'video', 'none')),
  material_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ui_preferences (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plan_weeks (
  id uuid primary key default gen_random_uuid(),
  project_key text not null default 'main' check (project_key in ('main', 'mena')),
  month_label text not null,
  month_sort_date date not null,
  week_key text not null check (week_key in ('week_1', 'week_2', 'week_3', 'week_4', 'week_5')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_key, month_sort_date, week_key)
);

create table if not exists plan_entries (
  id uuid primary key default gen_random_uuid(),
  plan_week_id uuid not null references plan_weeks(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  day_key text not null check (day_key in ('monday', 'tuesday', 'wednesday', 'thursday')),
  role text not null check (role in ('main', 'alternative')),
  position smallint not null default 0 check (
    (role = 'main' and position = 0)
    or
    (role = 'alternative' and position in (1, 2))
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_week_id, day_key, role, position),
  unique (plan_week_id, card_id)
);

create index if not exists idx_cards_status_sort on cards (status_id, is_pinned desc, sort_order asc);
create index if not exists idx_cards_project_status_sort on cards (project_key, status_id, is_pinned desc, sort_order asc);
create index if not exists idx_cards_hidden on cards (is_hidden);
create index if not exists idx_cards_archive_sort on cards (project_key, is_archived, archived_at desc);
create index if not exists idx_bloggers_created_at on bloggers (created_at desc);
create index if not exists idx_bloggers_status on bloggers (status);
create index if not exists idx_statuses_sort on statuses (sort_order asc);
create index if not exists idx_types_sort on card_types (sort_order asc);
create index if not exists idx_plan_weeks_project_month on plan_weeks (project_key, month_sort_date);
create index if not exists idx_plan_entries_week_day on plan_entries (plan_week_id, day_key, role, position);
create index if not exists idx_plan_entries_card on plan_entries (card_id);
create unique index if not exists idx_plan_entries_one_main_per_day on plan_entries (plan_week_id, day_key) where role = 'main';

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_statuses_updated_at on statuses;
create trigger trg_statuses_updated_at before update on statuses
for each row execute function set_updated_at();

drop trigger if exists trg_types_updated_at on card_types;
create trigger trg_types_updated_at before update on card_types
for each row execute function set_updated_at();

drop trigger if exists trg_cards_updated_at on cards;
create trigger trg_cards_updated_at before update on cards
for each row execute function set_updated_at();

drop trigger if exists trg_ui_preferences_updated_at on ui_preferences;
create trigger trg_ui_preferences_updated_at before update on ui_preferences
for each row execute function set_updated_at();

drop trigger if exists trg_bloggers_updated_at on bloggers;
create trigger trg_bloggers_updated_at before update on bloggers
for each row execute function set_updated_at();

drop trigger if exists trg_plan_weeks_updated_at on plan_weeks;
create trigger trg_plan_weeks_updated_at before update on plan_weeks
for each row execute function set_updated_at();

drop trigger if exists trg_plan_entries_updated_at on plan_entries;
create trigger trg_plan_entries_updated_at before update on plan_entries
for each row execute function set_updated_at();

alter table statuses enable row level security;
alter table card_types enable row level security;
alter table cards enable row level security;
alter table bloggers enable row level security;
alter table ui_preferences enable row level security;
alter table plan_weeks enable row level security;
alter table plan_entries enable row level security;

drop policy if exists "public read statuses" on statuses;
create policy "public read statuses" on statuses for select using (show_on_public = true and is_active = true);

drop policy if exists "authenticated write statuses" on statuses;
create policy "authenticated write statuses" on statuses for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read types" on card_types;
create policy "public read types" on card_types for select using (is_active = true);

drop policy if exists "authenticated write types" on card_types;
create policy "authenticated write types" on card_types for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read cards" on cards;
create policy "public read cards" on cards for select using (is_hidden = false);

drop policy if exists "authenticated write cards" on cards;
create policy "authenticated write cards" on cards for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read bloggers" on bloggers;
create policy "public read bloggers" on bloggers for select using (true);

drop policy if exists "authenticated write bloggers" on bloggers;
create policy "authenticated write bloggers" on bloggers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated read ui_preferences" on ui_preferences;
create policy "authenticated read ui_preferences" on ui_preferences for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated write ui_preferences" on ui_preferences;
create policy "authenticated write ui_preferences" on ui_preferences for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read plan_weeks" on plan_weeks;
create policy "public read plan_weeks" on plan_weeks for select using (true);

drop policy if exists "authenticated write plan_weeks" on plan_weeks;
create policy "authenticated write plan_weeks" on plan_weeks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read plan_entries" on plan_entries;
create policy "public read plan_entries" on plan_entries for select using (true);

drop policy if exists "authenticated write plan_entries" on plan_entries;
create policy "authenticated write plan_entries" on plan_entries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
