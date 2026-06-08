create table if not exists public.bloggers (
  id uuid primary key default gen_random_uuid(),
  username text,
  display_name text not null,
  avatar_url text,
  profile_screenshot_url text,
  followers bigint,
  price text,
  price_description text,
  status text,
  notes text,
  instagram_url text,
  script_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
