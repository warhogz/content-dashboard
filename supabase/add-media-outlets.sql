create table if not exists public.media_outlets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  region text,
  languages text,
  founded_year int,
  audience bigint,
  audience_note text,
  instagram_url text,
  website_url text,
  extra_url text,
  formats text,
  price text,
  price_note text,
  price_alt text,
  price_alt_note text,
  payment_terms text,
  offer_until date,
  open_questions text,
  status text,
  status_color text not null default 'gray' check (status_color in ('gray', 'blue', 'green', 'yellow', 'orange', 'red', 'purple')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_media_outlets_created_at on public.media_outlets (created_at desc);
create index if not exists idx_media_outlets_status on public.media_outlets (status);

drop trigger if exists trg_media_outlets_updated_at on public.media_outlets;
create trigger trg_media_outlets_updated_at before update on public.media_outlets
for each row execute function public.set_updated_at();

alter table public.media_outlets enable row level security;

drop policy if exists "public read media outlets" on public.media_outlets;
create policy "public read media outlets" on public.media_outlets for select using (true);

drop policy if exists "authenticated write media outlets" on public.media_outlets;
create policy "authenticated write media outlets" on public.media_outlets for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- First offer, added once.
insert into public.media_outlets (
  name, region, languages, founded_year, audience, audience_note,
  instagram_url, website_url, formats,
  price, price_note, price_alt, price_alt_note,
  payment_terms, offer_until, open_questions, status, status_color
)
select
  'ALJABERI Media UAE',
  'UAE · Dubai',
  'EN / AR',
  2013,
  1900000,
  'Статистику охватов и географию аудитории пока не предоставили',
  'https://www.instagram.com/dubaiuae.official/',
  'https://aljaberimedia.com',
  E'1 рекламный Reel о NOBÉL, основателе студии или одном из проектов в Дубае\nТекст на английском и арабском языках\n1 Stories бесплатно\nРазмещение в Instagram @dubaiuae.official',
  '3 150 AED',
  '≈ $858 · предложенная цена',
  '2 250 AED',
  '≈ $613 · подписка на @dubaiuae.official и @aljaberi.uae, отметка обоих аккаунтов в публикации или Stories NOBÉL, хештег #ALJABERIMedia',
  'Предоплата 50% после согласования, остаток — до публикации',
  '2026-12-07',
  'Не уточнено, как будет создаваться рекламный Reel. Объём съёмки, сроки и права использования обсуждаются отдельно — уточняем у представителей площадки.',
  'На согласовании',
  'yellow'
where not exists (select 1 from public.media_outlets where name = 'ALJABERI Media UAE');
