alter table public.cards
  add column if not exists is_archived boolean not null default false;

alter table public.cards
  add column if not exists archived_at timestamptz;

alter table public.cards
  add column if not exists archived_from_status_id uuid references public.statuses(id) on delete set null;

update public.cards as c
set
  is_archived = true,
  archived_at = coalesce(c.archived_at, c.updated_at, c.created_at, now())
from public.statuses as s
where c.status_id = s.id
  and s.slug = 'archive';

update public.statuses
set
  is_active = false,
  show_on_public = false
where slug = 'archive';

create index if not exists idx_cards_archive_sort
  on public.cards (project_key, is_archived, archived_at desc);
