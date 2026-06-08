create table if not exists public.bloggers (
  id uuid primary key default gen_random_uuid(),
  username text,
  display_name text not null,
  avatar_url text,
  followers bigint,
  price text,
  price_description text,
  status text,
  notes text,
  instagram_url text,
  material_type text not null default 'none' check (material_type in ('script', 'video', 'none')),
  material_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bloggers
  add column if not exists material_type text;

alter table public.bloggers
  add column if not exists material_url text;

update public.bloggers
set
  material_type = case
    when coalesce(script_url, '') <> '' then 'script'
    else coalesce(material_type, 'none')
  end,
  material_url = case
    when material_url is null and coalesce(script_url, '') <> '' then script_url
    else material_url
  end;

alter table public.bloggers
  alter column material_type set default 'none';

update public.bloggers
set material_type = 'none'
where material_type is null or material_type not in ('script', 'video', 'none');

alter table public.bloggers
  alter column material_type set not null;

alter table public.bloggers
  drop constraint if exists bloggers_material_type_check;

alter table public.bloggers
  add constraint bloggers_material_type_check
  check (material_type in ('script', 'video', 'none'));

alter table public.bloggers
  drop column if exists profile_screenshot_url;

alter table public.bloggers
  drop column if exists script_url;

create index if not exists idx_bloggers_created_at on public.bloggers (created_at desc);
create index if not exists idx_bloggers_status on public.bloggers (status);

drop trigger if exists trg_bloggers_updated_at on public.bloggers;
create trigger trg_bloggers_updated_at before update on public.bloggers
for each row execute function public.set_updated_at();

alter table public.bloggers enable row level security;

drop policy if exists "public read bloggers" on public.bloggers;
create policy "public read bloggers" on public.bloggers for select using (true);

drop policy if exists "authenticated write bloggers" on public.bloggers;
create policy "authenticated write bloggers" on public.bloggers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
