alter table public.cards
  add column if not exists project_key text;

update public.cards
set project_key = 'main'
where project_key is null;

alter table public.cards
  alter column project_key set default 'main';

alter table public.cards
  alter column project_key set not null;

alter table public.cards
  drop constraint if exists cards_project_key_check;

alter table public.cards
  add constraint cards_project_key_check
  check (project_key in ('main', 'mena'));

create index if not exists idx_cards_project_status_sort
  on public.cards (project_key, status_id, is_pinned desc, sort_order asc);
